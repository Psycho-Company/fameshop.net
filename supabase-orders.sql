create table if not exists public.orders (
  id uuid primary key,
  order_code text unique not null,
  platform text not null,
  username text not null,
  service text not null,
  amount integer not null,
  price_cents integer not null,
  currency text not null default 'USD',
  quality text default 'usa-only',
  post_url text,
  post_id text,
  post_thumb text,
  post_caption text,
  profile_name text,
  avatar text,
  followers integer,
  following integer,
  posts integer,
  post_likes integer,
  post_views integer,
  post_shares integer,
  post_comments integer,
  status text not null default 'pending',
  payment_provider text not null default 'lemonsqueezy',
  lemonsqueezy_checkout_id text,
  lemonsqueezy_checkout_url text,
  lemonsqueezy_order_id text,
  customer_email text,
  payment_raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_order_code_idx on public.orders(order_code);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

-- This project uses SUPABASE_SERVICE_ROLE_KEY from server-only API routes.
-- Keep RLS enabled if you want; service role bypasses RLS. Do not expose service role key in frontend.
