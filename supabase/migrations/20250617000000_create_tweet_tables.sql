-- Tweets main table
create table if not exists public.tweets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null check (char_length(content) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  like_count integer not null default 0,
  comment_count integer not null default 0,
  repost_count integer not null default 0,
  is_repost boolean not null default false,
  original_tweet_id uuid references public.tweets(id) on delete cascade,
  reply_to_tweet_id uuid references public.tweets(id) on delete set null
);

-- Tweet likes
create table if not exists public.tweet_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  tweet_id uuid references public.tweets(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  constraint unique_user_tweet_like unique (user_id, tweet_id)
);

-- Tweet comments (replies)
create table if not exists public.tweet_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  tweet_id uuid references public.tweets(id) on delete cascade not null,
  content text not null check (char_length(content) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tweet reposts
create table if not exists public.tweet_reposts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  tweet_id uuid references public.tweets(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  constraint unique_user_tweet_repost unique (user_id, tweet_id)
);

-- -----------------------------
-- Row-Level Security
-- -----------------------------

alter table public.tweets enable row level security;
alter table public.tweet_likes enable row level security;
alter table public.tweet_comments enable row level security;
alter table public.tweet_reposts enable row level security;

-- Tweets RLS
create policy "Allow read tweets" on public.tweets for select using (true);
create policy "Allow users to create tweet" on public.tweets for insert with check (auth.uid() = user_id);
create policy "Allow users to update own tweet" on public.tweets for update using (auth.uid() = user_id);
create policy "Allow users to delete own tweet" on public.tweets for delete using (auth.uid() = user_id);

-- Tweet likes RLS
create policy "Allow read tweet_likes" on public.tweet_likes for select using (true);
create policy "Allow like" on public.tweet_likes for insert with check (auth.uid() = user_id);
create policy "Allow unlike" on public.tweet_likes for delete using (auth.uid() = user_id);

-- Tweet comments RLS
create policy "Allow read tweet_comments" on public.tweet_comments for select using (true);
create policy "Allow comment" on public.tweet_comments for insert with check (auth.uid() = user_id);
create policy "Allow edit own comment" on public.tweet_comments for update using (auth.uid() = user_id);
create policy "Allow delete own comment" on public.tweet_comments for delete using (auth.uid() = user_id);

-- Tweet reposts RLS
create policy "Allow read tweet_reposts" on public.tweet_reposts for select using (true);
create policy "Allow repost" on public.tweet_reposts for insert with check (auth.uid() = user_id);
create policy "Allow unrepost" on public.tweet_reposts for delete using (auth.uid() = user_id);

-- -----------------------------
-- Optional: maintain aggregate counts via trigger functions
-- -----------------------------
-- Create helper function to refresh counts
create or replace function public.refresh_tweet_counts(p_tweet_id uuid) returns void as $$
begin
  update public.tweets t
  set like_count = (select count(*) from public.tweet_likes where tweet_id = p_tweet_id),
      comment_count = (select count(*) from public.tweet_comments where tweet_id = p_tweet_id),
      repost_count = (select count(*) from public.tweet_reposts where tweet_id = p_tweet_id)
  where t.id = p_tweet_id;
end;
$$ language plpgsql;

-- Trigger definitions
create or replace function public.trigger_refresh_tweet_counts() returns trigger as $$
begin
  perform public.refresh_tweet_counts(coalesce(new.tweet_id, old.tweet_id));
  return null;
end;
$$ language plpgsql;

-- Attach triggers to like/comment/repost tables
create trigger tweet_like_counts_trg after insert or delete on public.tweet_likes
  for each row execute procedure public.trigger_refresh_tweet_counts();

create trigger tweet_comment_counts_trg after insert or delete on public.tweet_comments
  for each row execute procedure public.trigger_refresh_tweet_counts();

create trigger tweet_repost_counts_trg after insert or delete on public.tweet_reposts
  for each row execute procedure public.trigger_refresh_tweet_counts(); 