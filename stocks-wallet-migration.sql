-- SQL Migration: Add Default Stock Portfolio Wallet & Update Signup Trigger

-- 1. Update handle_new_user function to automatically create default wallets on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

  -- Insert default Cash Wallet
  INSERT INTO public.wallets (user_id, name, code, type, balance, color, icon, detail)
  VALUES (NEW.id, 'Dompet Utama', 'CASH', 'CASH', 0.00, '#00d293', 'fa-wallet', 'Dompet Cash Utama');

  -- Insert default Stock Portfolio Wallet (Stockbit)
  INSERT INTO public.wallets (user_id, name, code, type, balance, color, icon, detail)
  VALUES (NEW.id, 'Stockbit', 'STOCKS', 'INVESTMENT', 0.00, '#10b981', 'fa-chart-line', 'Real-time Stock Valuation');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. CLEANUP/MERGE: Consolidate duplicate STOCKS / Portofolio Saham / Stockbit wallets per user
DO $$
DECLARE
  r RECORD;
  stocks_wallet_id UUID;
  manual_wallet_id UUID;
  other_saham_wallet_id UUID;
BEGIN
  -- A. Clean up duplicate STOCKS wallets per user — keep only the one with highest balance
  DELETE FROM public.wallets
  WHERE code = 'STOCKS'
    AND id NOT IN (
      SELECT DISTINCT ON (user_id) id
      FROM public.wallets
      WHERE code = 'STOCKS'
      ORDER BY user_id, balance DESC, created_at ASC
    );

  -- B. Loop through all users to consolidate Stockbit and Portofolio Saham wallets
  FOR r IN SELECT id FROM public.profiles LOOP
    -- Find the primary STOCKS wallet
    SELECT id INTO stocks_wallet_id
    FROM public.wallets
    WHERE user_id = r.id AND code = 'STOCKS'
    LIMIT 1;

    -- Find a manual Stockbit wallet (name like Stockbit, but code is not STOCKS)
    SELECT id INTO manual_wallet_id
    FROM public.wallets
    WHERE user_id = r.id 
      AND (lower(name) = 'stockbit' OR code = 'STOCKBIT' OR code = 'S')
      AND (code IS NULL OR code != 'STOCKS')
    LIMIT 1;

    -- Find other wallet named 'Portofolio Saham' (not STOCKS)
    SELECT id INTO other_saham_wallet_id
    FROM public.wallets
    WHERE user_id = r.id AND lower(name) = 'portofolio saham' AND (code IS NULL OR code != 'STOCKS')
    LIMIT 1;

    -- Merge other 'Portofolio Saham' into primary STOCKS wallet if both exist
    IF stocks_wallet_id IS NOT NULL AND other_saham_wallet_id IS NOT NULL THEN
      UPDATE public.transactions SET wallet_id = stocks_wallet_id WHERE wallet_id = other_saham_wallet_id;
      UPDATE public.debts SET wallet_id = stocks_wallet_id WHERE wallet_id = other_saham_wallet_id;
      DELETE FROM public.wallets WHERE id = other_saham_wallet_id;
    END IF;

    -- Merge manual Stockbit wallet into STOCKS wallet if both exist
    IF stocks_wallet_id IS NOT NULL AND manual_wallet_id IS NOT NULL THEN
      -- Re-route all transactions and debts to the STOCKS wallet
      UPDATE public.transactions SET wallet_id = stocks_wallet_id WHERE wallet_id = manual_wallet_id;
      UPDATE public.debts SET wallet_id = stocks_wallet_id WHERE wallet_id = manual_wallet_id;
      
      -- Delete the manual wallet
      DELETE FROM public.wallets WHERE id = manual_wallet_id;
    END IF;

    -- Rename the primary STOCKS wallet to 'Stockbit'
    IF stocks_wallet_id IS NOT NULL THEN
      UPDATE public.wallets
      SET name = 'Stockbit'
      WHERE id = stocks_wallet_id;
    END IF;

    -- If the user only has a manual Stockbit wallet and no STOCKS wallet, convert it to the STOCKS wallet
    IF stocks_wallet_id IS NULL AND manual_wallet_id IS NOT NULL THEN
      UPDATE public.wallets
      SET code = 'STOCKS', type = 'INVESTMENT'
      WHERE id = manual_wallet_id;
    END IF;

  END LOOP;
END $$;

-- 3. Insert Stockbit STOCKS wallet for users who don't have any STOCKS wallet yet
INSERT INTO public.wallets (user_id, name, code, type, balance, color, icon, detail)
SELECT id, 'Stockbit', 'STOCKS', 'INVESTMENT', 0.00, '#10b981', 'fa-chart-line', 'Real-time Stock Valuation'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.wallets w 
  WHERE w.user_id = p.id AND w.code = 'STOCKS'
);
