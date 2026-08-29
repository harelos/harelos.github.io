-- PostgreSQL-oriented draft schema. No production DB is connected yet.

create table if not exists account_goals (
  id bigserial primary key,
  effective_from timestamptz not null default now(),
  monthly_revenue_target numeric,
  contribution_margin_target_pct numeric,
  daily_spend_ceiling numeric,
  risk_mode text not null default 'normal',
  winner_budget_share_pct numeric default 80,
  testing_budget_share_pct numeric default 20,
  cbo_duplicate_target integer default 5,
  notes text
);

create table if not exists daily_snapshots (
  id bigserial primary key,
  snapshot_at timestamptz not null,
  account_timezone text not null default 'Asia/Jerusalem',
  meta_spend numeric,
  meta_revenue numeric,
  meta_purchases integer,
  roas numeric,
  cpm numeric,
  ctr numeric,
  cpc numeric,
  lpv integer,
  atc integer,
  checkout integer,
  shopify_sessions integer,
  shopify_orders integer,
  shopify_revenue numeric,
  shopify_cvr numeric,
  raw_meta jsonb,
  raw_shopify jsonb,
  unique(snapshot_at)
);

create table if not exists campaign_snapshots (
  id bigserial primary key,
  snapshot_at timestamptz not null,
  campaign_id text not null,
  campaign_name text not null,
  status text,
  daily_budget numeric,
  spend numeric,
  purchases integer,
  purchase_value numeric,
  roas numeric,
  cpm numeric,
  ctr numeric,
  cpc numeric,
  lpv integer,
  atc integer,
  checkout integer,
  raw jsonb
);

create index if not exists idx_campaign_snapshots_campaign_time on campaign_snapshots(campaign_id, snapshot_at desc);

create table if not exists decision_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  effective_at timestamptz,
  actor text not null, -- user | ai | system | meta
  scope_type text not null, -- account | campaign | adset | ad | store | checkout
  scope_id text,
  action_type text not null,
  before_state jsonb,
  proposed_state jsonb,
  after_state jsonb,
  reason text,
  evidence jsonb,
  status text not null default 'recorded', -- proposed | approved | executed | rejected | recorded
  override_used boolean not null default false
);

create index if not exists idx_decision_events_time on decision_events(created_at desc);
create index if not exists idx_decision_events_scope on decision_events(scope_type, scope_id, created_at desc);

create table if not exists unit_economics (
  id bigserial primary key,
  effective_from timestamptz not null default now(),
  product_key text not null,
  offer_key text,
  selling_price numeric,
  product_cogs numeric,
  shipping_cost numeric,
  fulfillment_cost numeric,
  payment_fee_pct numeric,
  payment_fee_fixed numeric,
  expected_refund_pct numeric,
  other_variable_cost numeric,
  currency text default 'USD',
  source text,
  notes text
);

create table if not exists anomalies (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  severity text not null,
  category text not null,
  scope_id text,
  message text not null,
  evidence jsonb,
  resolved_at timestamptz
);

create table if not exists advisor_runs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  model text,
  context_version text,
  context_summary jsonb not null,
  recommendation jsonb not null,
  user_decision text,
  executed_decision_event_id bigint references decision_events(id)
);

create table if not exists cash_snapshots (
  id bigserial primary key,
  snapshot_at timestamptz not null default now(),
  source text not null, -- manual | csv | wise | revolut
  available_cash numeric,
  committed_outflows numeric,
  currency text default 'USD',
  notes text
);
