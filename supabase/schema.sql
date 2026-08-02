-- ─────────────────────────────────────────────────────────────
-- OpsPilot schema
--
-- Optional. The app runs on a JSON file by default; run this only if you
-- want Supabase persistence, then set NEXT_PUBLIC_SUPABASE_URL and
-- SUPABASE_SERVICE_ROLE_KEY.
--
--   psql "$SUPABASE_DB_URL" -f supabase/schema.sql
-- ─────────────────────────────────────────────────────────────

create table if not exists companies (
  id          text primary key,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists users (
  id          text primary key,
  company_id  text not null references companies(id) on delete cascade,
  email       text not null,
  name        text,
  role        text not null default 'founder',
  created_at  timestamptz not null default now()
);

create table if not exists purchases (
  id             text primary key,
  company_id     text not null,
  vendor         text not null,
  vendor_slug    text not null,
  category       text not null,
  product        text not null,
  price          numeric(12,2) not null,
  currency       text not null default 'USD',
  billing_cycle  text not null check (billing_cycle in ('monthly','annual','one_time')),
  renewal_date   timestamptz,
  status         text not null default 'active'
                   check (status in ('active','pending','cancelled','failed')),
  invoice_url    text,
  transaction_id text,
  card_last4     text,
  trust_score    integer,
  monthly_saving numeric(12,2),
  reasoning      text,
  created_at     timestamptz not null default now()
);

create table if not exists subscriptions (
  id             text primary key,
  company_id     text not null,
  purchase_id    text not null references purchases(id) on delete cascade,
  vendor         text not null,
  vendor_slug    text not null,
  plan           text not null,
  price          numeric(12,2) not null,
  currency       text not null default 'USD',
  billing_cycle  text not null,
  next_payment   timestamptz not null,
  status         text not null default 'active'
                   check (status in ('active','cancelled','downgraded')),
  created_at     timestamptz not null default now()
);

create table if not exists approvals (
  id             text primary key,
  company_id     text not null,
  requested_by   text not null,
  approved_by    text,
  status         text not null default 'pending'
                   check (status in ('pending','approved','declined','expired')),
  vendor         text not null,
  vendor_slug    text not null,
  category       text not null,
  plan           text not null,
  price          numeric(12,2) not null,
  currency       text not null default 'USD',
  billing_cycle  text not null,
  reasoning      text not null,
  pros           jsonb not null default '[]'::jsonb,
  cons           jsonb not null default '[]'::jsonb,
  trust_score    integer,
  monthly_saving numeric(12,2),
  created_at     timestamptz not null default now(),
  decided_at     timestamptz
);

create table if not exists transactions (
  id           text primary key,
  company_id   text not null,
  purchase_id  text references purchases(id) on delete set null,
  approval_id  text references approvals(id) on delete set null,
  session_id   text not null,
  order_id     text,
  txn_ref_id   text,
  amount       numeric(12,2) not null,
  currency     text not null default 'USD',
  status       text not null default 'pending'
                 check (status in ('pending','completed','failed','reported')),
  provider     text not null default 'prava'
                 check (provider in ('prava','prava_simulated')),
  created_at   timestamptz not null default now()
);

create table if not exists invoices (
  id           text primary key,
  company_id   text not null,
  purchase_id  text not null references purchases(id) on delete cascade,
  number       text not null,
  amount       numeric(12,2) not null,
  currency     text not null default 'USD',
  url          text not null,
  issued_at    timestamptz not null default now()
);

create index if not exists purchases_company_created_idx
  on purchases (company_id, created_at desc);
create index if not exists subscriptions_next_payment_idx
  on subscriptions (company_id, next_payment);
create index if not exists approvals_status_idx
  on approvals (company_id, status, created_at desc);

insert into companies (id, name)
  values ('company_demo', 'Acme Inc.')
  on conflict (id) do nothing;

-- The server talks to these tables with the service-role key only, so RLS
-- stays on and no anon policies are granted.
alter table purchases     enable row level security;
alter table subscriptions enable row level security;
alter table approvals     enable row level security;
alter table transactions  enable row level security;
alter table invoices      enable row level security;
