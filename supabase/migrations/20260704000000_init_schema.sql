-- SuperApp initial schema: profiles, feed, social graph, chat, marketplace, wallet, streams.
-- Run this once in the Supabase SQL Editor (or `supabase db push` once linked).

create extension if not exists "pgcrypto";

-- ── Profiles ────────────────────────────────────────────────────────────────
create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  username          text unique not null,
  display_name      text,
  bio               text,
  avatar_color      text default '#0095F6',
  tier              smallint not null default 1 check (tier in (1,2,3)),
  is_verified       boolean not null default false,
  followers_count   int not null default 0,
  following_count   int not null default 0,
  post_count        int not null default 0,
  created_at        timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── Feed: posts, likes, comments ─────────────────────────────────────────────
create table posts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  caption        text,
  hashtags       text[] not null default '{}',
  sound          text,
  color          text,
  is_live        boolean not null default false,
  likes_count    int not null default 0,
  comments_count int not null default 0,
  shares_count   int not null default 0,
  created_at     timestamptz not null default now()
);

create table likes (
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

-- ── Discovery: follows ────────────────────────────────────────────────────────
create table follows (
  follower_id  uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ── Chat: conversations, participants, messages ──────────────────────────────
create table conversations (
  id           uuid primary key default gen_random_uuid(),
  name         text,
  color        text,
  is_group     boolean not null default false,
  is_community boolean not null default false,
  created_at   timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  body            text,
  type            text not null default 'text' check (type in ('text', 'crypto', 'media')),
  amount          numeric,
  token           text,
  created_at      timestamptz not null default now()
);

-- ── Marketplace: products, orders ────────────────────────────────────────────
create table products (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid not null references profiles(id) on delete cascade,
  title       text not null,
  price       numeric not null,
  currency    text not null,
  category    text,
  color       text,
  rating      numeric default 0,
  sales_count int not null default 0,
  created_at  timestamptz not null default now()
);

create table orders (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  buyer_id   uuid not null references profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'paid', 'shipped', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- ── Wallet: transactions ─────────────────────────────────────────────────────
create table wallet_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  type         text not null check (type in ('send', 'receive', 'buy', 'sell')),
  token        text not null,
  amount       numeric not null,
  usd_value    numeric,
  counterparty text,
  status       text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  created_at   timestamptz not null default now()
);

-- ── Streaming ─────────────────────────────────────────────────────────────────
create table streams (
  id         uuid primary key default gen_random_uuid(),
  host_id    uuid not null references profiles(id) on delete cascade,
  title      text not null,
  type       text,
  category   text,
  genre      text,
  year       text,
  rating     text,
  duration   text,
  color      text,
  is_live    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table posts enable row level security;
alter table likes enable row level security;
alter table comments enable row level security;
alter table follows enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table wallet_transactions enable row level security;
alter table streams enable row level security;

create policy "profiles are publicly readable" on profiles for select using (true);
create policy "users manage their own profile" on profiles for update using (auth.uid() = id);

create policy "posts are publicly readable" on posts for select using (true);
create policy "users manage their own posts" on posts for insert with check (auth.uid() = user_id);
create policy "users update their own posts" on posts for update using (auth.uid() = user_id);
create policy "users delete their own posts" on posts for delete using (auth.uid() = user_id);

create policy "likes are publicly readable" on likes for select using (true);
create policy "users manage their own likes" on likes for insert with check (auth.uid() = user_id);
create policy "users remove their own likes" on likes for delete using (auth.uid() = user_id);

create policy "comments are publicly readable" on comments for select using (true);
create policy "users manage their own comments" on comments for insert with check (auth.uid() = user_id);
create policy "users delete their own comments" on comments for delete using (auth.uid() = user_id);

create policy "follows are publicly readable" on follows for select using (true);
create policy "users manage their own follows" on follows for insert with check (auth.uid() = follower_id);
create policy "users remove their own follows" on follows for delete using (auth.uid() = follower_id);

create policy "participants can read their conversations" on conversations for select
  using (exists (select 1 from conversation_participants cp where cp.conversation_id = id and cp.user_id = auth.uid()));
create policy "authenticated users can start conversations" on conversations for insert with check (auth.uid() is not null);

create policy "participants can see participant lists" on conversation_participants for select
  using (exists (select 1 from conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid()));
create policy "users can add themselves as participants" on conversation_participants for insert with check (auth.uid() = user_id);

create policy "participants can read messages" on messages for select
  using (exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()));
create policy "participants can send messages" on messages for insert
  with check (auth.uid() = sender_id and exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()));

create policy "products are publicly readable" on products for select using (true);
create policy "sellers manage their own products" on products for insert with check (auth.uid() = seller_id);
create policy "sellers update their own products" on products for update using (auth.uid() = seller_id);
create policy "sellers delete their own products" on products for delete using (auth.uid() = seller_id);

create policy "buyers and sellers read their orders" on orders for select
  using (auth.uid() = buyer_id or auth.uid() = (select seller_id from products where products.id = product_id));
create policy "buyers place orders" on orders for insert with check (auth.uid() = buyer_id);

create policy "users read their own wallet transactions" on wallet_transactions for select using (auth.uid() = user_id);
create policy "users create their own wallet transactions" on wallet_transactions for insert with check (auth.uid() = user_id);
create policy "users update their own wallet transactions" on wallet_transactions for update using (auth.uid() = user_id);

create policy "streams are publicly readable" on streams for select using (true);
create policy "hosts manage their own streams" on streams for insert with check (auth.uid() = host_id);
create policy "hosts update their own streams" on streams for update using (auth.uid() = host_id);
create policy "hosts delete their own streams" on streams for delete using (auth.uid() = host_id);
