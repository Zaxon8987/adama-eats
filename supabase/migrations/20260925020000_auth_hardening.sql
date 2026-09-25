alter table public.profiles
  add column if not exists phone_verified_at timestamptz;

create table if not exists public.auth_rate_limits (
  phone_hash text primary key,
  window_started_at timestamptz not null default now(),
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  blocked_until timestamptz,
  last_attempt_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auth_rate_limits_blocked_until_idx
  on public.auth_rate_limits(blocked_until);

alter table public.auth_rate_limits enable row level security;

create trigger auth_rate_limits_set_updated_at
before update on public.auth_rate_limits
for each row execute function public.set_updated_at();
