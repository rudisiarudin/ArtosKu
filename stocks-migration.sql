-- SQL Migration for ArtosKu Stocks Features

-- Create stock holdings table
CREATE TABLE IF NOT EXISTS public.stock_holdings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  shares DECIMAL(15, 4) NOT NULL DEFAULT 0,
  average_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stock watchlist table
CREATE TABLE IF NOT EXISTS public.stock_watchlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.stock_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_watchlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock holdings
CREATE POLICY "Users can view own stock holdings" ON public.stock_holdings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stock holdings" ON public.stock_holdings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stock holdings" ON public.stock_holdings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stock holdings" ON public.stock_holdings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for stock watchlist
CREATE POLICY "Users can view own stock watchlist" ON public.stock_watchlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stock watchlist" ON public.stock_watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stock watchlist" ON public.stock_watchlist
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS stock_holdings_user_id_idx ON public.stock_holdings(user_id);
CREATE INDEX IF NOT EXISTS stock_watchlist_user_id_idx ON public.stock_watchlist(user_id);
