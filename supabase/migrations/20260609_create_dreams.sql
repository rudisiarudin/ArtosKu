create table if not exists public.dreams (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  target_amount numeric not null default 0,
  current_amount numeric not null default 0,
  deadline timestamp with time zone,
  color text default '#10b981',
  icon text default 'target',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- set up row level security
alter table public.dreams enable row level security;

create policy "Users can view own dreams"
  on public.dreams for select
  using ( auth.uid() = user_id );

create policy "Users can insert own dreams"
  on public.dreams for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own dreams"
  on public.dreams for update
  using ( auth.uid() = user_id );

create policy "Users can delete own dreams"
  on public.dreams for delete
  using ( auth.uid() = user_id );
