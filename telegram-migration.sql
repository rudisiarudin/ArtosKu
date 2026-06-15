-- Add telegram_chat_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
ADD COLUMN IF NOT EXISTS telegram_connect_token TEXT,
ADD COLUMN IF NOT EXISTS telegram_connected_at TIMESTAMP WITH TIME ZONE;

-- Index for fast lookup by chat_id
CREATE INDEX IF NOT EXISTS profiles_telegram_chat_id_idx ON public.profiles(telegram_chat_id);
CREATE INDEX IF NOT EXISTS profiles_telegram_token_idx ON public.profiles(telegram_connect_token);
