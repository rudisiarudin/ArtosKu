-- Enhanced transfer_funds function with auto-wallet creation for recipient
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.transfer_funds(
    p_sender_wallet_id UUID,
    p_recipient_email TEXT,
    p_amount DECIMAL,
    p_description TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
    v_sender_user_id UUID;
    v_sender_name TEXT;
    v_recipient_user_id UUID;
    v_recipient_wallet_id UUID;
    v_recipient_name TEXT;
    v_sender_balance DECIMAL;
BEGIN
    -- 1. Get sender's user_id, name and current balance
    SELECT w.user_id, w.balance, p.full_name INTO v_sender_user_id, v_sender_balance, v_sender_name
    FROM public.wallets w
    JOIN public.profiles p ON p.id = w.user_id
    WHERE w.id = p_sender_wallet_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SENDER_WALLET_NOT_FOUND');
    END IF;

    -- 2. Check if sender has enough balance
    IF v_sender_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE');
    END IF;

    -- 3. Get recipient's user_id
    SELECT id, full_name INTO v_recipient_user_id, v_recipient_name
    FROM public.profiles
    WHERE email ILIKE p_recipient_email;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'RECIPIENT_NOT_FOUND');
    END IF;

    -- 4. Check if recipient has any wallet, if not create 'Bank Artosku'
    SELECT id INTO v_recipient_wallet_id
    FROM public.wallets
    WHERE user_id = v_recipient_user_id
    LIMIT 1;

    IF NOT FOUND THEN
        -- Create default "Bank Artosku" wallet for recipient
        INSERT INTO public.wallets (user_id, name, type, balance, icon)
        VALUES (v_recipient_user_id, 'Bank Artosku', 'CASH', 0, 'fa-building-columns')
        RETURNING id INTO v_recipient_wallet_id;
    END IF;

    -- 5. Perform the transfer
    -- Decrease sender balance
    UPDATE public.wallets
    SET balance = balance - p_amount
    WHERE id = p_sender_wallet_id;

    -- Increase recipient balance
    UPDATE public.wallets
    SET balance = balance + p_amount
    WHERE id = v_recipient_wallet_id;

    -- 6. Create transactions
    -- Sender transaction (EXPENSE)
    INSERT INTO public.transactions (user_id, wallet_id, amount, type, category, description, date)
    VALUES (v_sender_user_id, p_sender_wallet_id, p_amount, 'EXPENSE', 'Transfer Out', 
            COALESCE(p_description, '') || ' (Ke: ' || v_recipient_name || ')', NOW());

    -- Recipient transaction (INCOME)
    INSERT INTO public.transactions (user_id, wallet_id, amount, type, category, description, date)
    VALUES (v_recipient_user_id, v_recipient_wallet_id, p_amount, 'INCOME', 'Transfer In', 
            COALESCE(p_description, '') || ' (Dari: ' || v_sender_name || ')', NOW());

    -- 7. Create notification for recipient
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        v_recipient_user_id, 
        'Dana Diterima', 
        'Anda menerima Rp ' || to_char(p_amount, 'FM999G999G999G999') || ' dari ' || v_sender_name, 
        'success'
    );

    RETURN jsonb_build_object(
        'success', true, 
        'recipient_name', v_recipient_name,
        'amount', p_amount,
        'recipient_wallet_id', v_recipient_wallet_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
