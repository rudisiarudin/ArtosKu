-- Migration: Add email to profiles and create atomic transfer function

-- 1. Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Update existing profiles with emails from auth.users
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE public.profiles.id = auth.users.id;

-- 3. Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create atomic transfer function (RPC)
CREATE OR REPLACE FUNCTION public.transfer_funds(
  p_sender_wallet_id UUID,
  p_recipient_email TEXT,
  p_amount DECIMAL,
  p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_sender_id UUID;
  v_recipient_id UUID;
  v_recipient_wallet_id UUID;
  v_sender_balance DECIMAL;
  v_recipient_name TEXT;
BEGIN
  -- Get sender info
  SELECT user_id, balance INTO v_sender_id, v_sender_balance 
  FROM public.wallets WHERE id = p_sender_wallet_id;
  
  -- Check if sender is current user (security)
  IF v_sender_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check balance
  IF v_sender_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Find recipient
  SELECT id, full_name INTO v_recipient_id, v_recipient_name 
  FROM public.profiles WHERE email = p_recipient_email;

  IF v_recipient_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  -- Prevent self-transfer (optional but recommended)
  IF v_recipient_id = v_sender_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer to yourself');
  END IF;

  -- Find recipient's first wallet (default landing)
  SELECT id INTO v_recipient_wallet_id 
  FROM public.wallets 
  WHERE user_id = v_recipient_id AND NOT type = 'INVESTMENT'
  ORDER BY created_at ASC LIMIT 1;

  IF v_recipient_wallet_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient has no valid wallet');
  END IF;

  -- ATOMIC UPDATES
  -- 1. Deduct from sender
  UPDATE public.wallets SET balance = balance - p_amount WHERE id = p_sender_wallet_id;
  
  -- 2. Add to recipient
  UPDATE public.wallets SET balance = balance + p_amount WHERE id = v_recipient_wallet_id;

  -- 3. Record sender transaction
  INSERT INTO public.transactions (user_id, wallet_id, amount, type, category, description)
  VALUES (v_sender_id, p_sender_wallet_id, p_amount, 'EXPENSE', 'Transfer', 'Transfer ke ' || v_recipient_name || ': ' || p_description);

  -- 4. Record recipient transaction
  INSERT INTO public.transactions (user_id, wallet_id, amount, type, category, description)
  VALUES (v_recipient_id, v_recipient_wallet_id, p_amount, 'INCOME', 'Transfer', 'Transfer dari ' || (SELECT full_name FROM public.profiles WHERE id = v_sender_id) || ': ' || p_description);

  RETURN jsonb_build_object(
    'success', true, 
    'recipient_name', v_recipient_name,
    'amount', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
