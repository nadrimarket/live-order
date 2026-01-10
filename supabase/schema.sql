create extension if not exists "uuid-ossp";

create table if not exists public.sessions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  is_closed boolean not null default false,
  ship_threshold int not null default 100000,
  ship_fee_normal int not null default 3500,
  ship_fee_jeju int not null default 7000,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  price int not null,
  image_url text null,
  is_active boolean not null default true,
  sort_order int not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists products_session_idx on public.products(session_id);

create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  nickname text not null,
  shipping text not null check (shipping in ('일반','제주/도서','픽업')),
  phone text not null default '',
  postal_code text not null default '',
  address1 text not null default '',
  address2 text not null default '',
  edit_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_session_idx on public.orders(session_id);

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  qty int not null check (qty > 0)
);
create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.session_notices (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  notice text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.sessions enable row level security;
alter table public.products enable row level security;
alter table public.session_notices enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Public read only for sessions/products/notices
create policy "anon read sessions" on public.sessions for select using (true);
create policy "anon read products" on public.products for select using (true);
create policy "anon read notices" on public.session_notices for select using (true);

-- Orders/items are accessed via server(API) with service role key, so keep them locked.
create policy "deny anon select orders" on public.orders for select using (false);
create policy "deny anon select items" on public.order_items for select using (false);
