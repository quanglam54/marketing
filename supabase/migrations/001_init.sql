-- =====================================================================
-- Zeno Report – schema
-- Chạy file này trong Supabase → SQL Editor (một lần).
-- Nguyên tắc: chỉ lưu dữ liệu gốc, mọi tổng / tỷ lệ đều tính khi xem.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Nguồn (Facebook Ads, TikTok Organic, ...). Thêm nguồn = thêm 1 dòng.
-- ---------------------------------------------------------------------
create table if not exists public.sources (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null,
  channel_group text not null default 'Khác',
  has_cost      boolean not null default false,
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Số liệu nhập tay mỗi ngày cho từng nguồn.
-- ---------------------------------------------------------------------
create table if not exists public.daily_metrics (
  id          uuid primary key default gen_random_uuid(),
  metric_date date not null,
  source_id   uuid not null references public.sources(id) on delete cascade,
  spend       numeric(14, 0) not null default 0,
  messages    int not null default 0,
  impressions int not null default 0,
  clicks      int not null default 0,
  updated_at  timestamptz not null default now(),
  unique (metric_date, source_id)
);
create index if not exists daily_metrics_date_idx on public.daily_metrics (metric_date);

-- ---------------------------------------------------------------------
-- Lead – mỗi khách 1 dòng (thay cho tab "Data TSP").
-- ---------------------------------------------------------------------
create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  lead_date  date not null default current_date,
  name       text not null,
  phone      text,
  service    text,
  source_id  uuid not null references public.sources(id),
  sale       text,
  status     text not null default 'new',
  reached    boolean not null default false,
  consulted  boolean not null default false,
  closed     boolean not null default false,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_date_idx on public.leads (lead_date);
create index if not exists leads_source_idx on public.leads (source_id);

-- ---------------------------------------------------------------------
-- Mục tiêu theo tháng.
--  - source_id có giá trị: mục tiêu số lượng của nguồn (spend, messages, lead, reached, consulted, closed)
--  - source_id null      : mục tiêu chung dạng tỷ lệ / đơn giá (cpl, consult_rate, close_rate)
-- ---------------------------------------------------------------------
create table if not exists public.goals (
  id         uuid primary key default gen_random_uuid(),
  month      date not null check (extract(day from month) = 1),
  source_id  uuid references public.sources(id) on delete cascade,
  metric     text not null check (metric in (
               'spend', 'messages', 'lead', 'reached', 'consulted', 'closed',
               'cpl', 'consult_rate', 'close_rate')),
  target     numeric(14, 4) not null default 0,
  unique nulls not distinct (month, source_id, metric)
);

-- ---------------------------------------------------------------------
-- Báo cáo: 1 dòng cho mỗi (ngày, nguồn) có dữ liệu trong khoảng.
-- Giao diện tự cộng theo tổng / nhóm / ngày và tính tỷ lệ.
-- ---------------------------------------------------------------------
create or replace function public.report_daily(p_from date, p_to date, p_source_ids uuid[] default null)
returns table (
  day         date,
  source_id   uuid,
  spend       numeric,
  messages    bigint,
  impressions bigint,
  clicks      bigint,
  leads       bigint,
  reached     bigint,
  consulted   bigint,
  closed      bigint
)
language sql
stable
security invoker
as $$
  with m as (
    select metric_date as day, source_id,
           sum(spend) as spend, sum(messages)::bigint as messages,
           sum(impressions)::bigint as impressions, sum(clicks)::bigint as clicks
    from public.daily_metrics
    where metric_date between p_from and p_to
      and (p_source_ids is null or source_id = any (p_source_ids))
    group by 1, 2
  ),
  l as (
    select lead_date as day, source_id,
           count(*)::bigint as leads,
           count(*) filter (where reached)::bigint as reached,
           count(*) filter (where consulted)::bigint as consulted,
           count(*) filter (where closed)::bigint as closed
    from public.leads
    where lead_date between p_from and p_to
      and (p_source_ids is null or source_id = any (p_source_ids))
    group by 1, 2
  )
  select coalesce(m.day, l.day), coalesce(m.source_id, l.source_id),
         coalesce(m.spend, 0), coalesce(m.messages, 0),
         coalesce(m.impressions, 0), coalesce(m.clicks, 0),
         coalesce(l.leads, 0), coalesce(l.reached, 0),
         coalesce(l.consulted, 0), coalesce(l.closed, 0)
  from m
  full join l on l.day = m.day and l.source_id = m.source_id
  order by 1, 2;
$$;

-- ---------------------------------------------------------------------
-- updated_at tự động
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists daily_metrics_touch on public.daily_metrics;
create trigger daily_metrics_touch before update on public.daily_metrics
  for each row execute function public.touch_updated_at();

drop trigger if exists leads_touch on public.leads;
create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Phân quyền: chỉ người đã đăng nhập mới đọc/ghi được.
-- Tài khoản tạo trong Supabase → Authentication → Users.
-- ---------------------------------------------------------------------
alter table public.sources       enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.leads         enable row level security;
alter table public.goals         enable row level security;

drop policy if exists "auth all" on public.sources;
create policy "auth all" on public.sources for all to authenticated using (true) with check (true);
drop policy if exists "auth all" on public.daily_metrics;
create policy "auth all" on public.daily_metrics for all to authenticated using (true) with check (true);
drop policy if exists "auth all" on public.leads;
create policy "auth all" on public.leads for all to authenticated using (true) with check (true);
drop policy if exists "auth all" on public.goals;
create policy "auth all" on public.goals for all to authenticated using (true) with check (true);

revoke execute on function public.report_daily(date, date, uuid[]) from anon, public;
grant execute on function public.report_daily(date, date, uuid[]) to authenticated;
