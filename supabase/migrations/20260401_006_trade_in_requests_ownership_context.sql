-- Smart Troc: ownership and purchase context for safer pricing
-- Date: 2026-04-01

alter table if exists public.trade_in_requests
  add column if not exists acquisition_condition text,
  add column if not exists purchase_date date,
  add column if not exists ownership_rank text,
  add column if not exists device_age_months int,
  add column if not exists ownership_adjustment_factor numeric(4,3);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trade_in_requests_acquisition_condition_check'
  ) then
    alter table public.trade_in_requests
      add constraint trade_in_requests_acquisition_condition_check
      check (acquisition_condition in ('new', 'used'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'trade_in_requests_ownership_rank_check'
  ) then
    alter table public.trade_in_requests
      add constraint trade_in_requests_ownership_rank_check
      check (ownership_rank in ('unknown', 'first', 'second', 'third_plus'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'trade_in_requests_device_age_months_check'
  ) then
    alter table public.trade_in_requests
      add constraint trade_in_requests_device_age_months_check
      check (device_age_months is null or device_age_months >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'trade_in_requests_ownership_adjustment_factor_check'
  ) then
    alter table public.trade_in_requests
      add constraint trade_in_requests_ownership_adjustment_factor_check
      check (
        ownership_adjustment_factor is null
        or (ownership_adjustment_factor > 0 and ownership_adjustment_factor <= 1)
      );
  end if;
end $$;

