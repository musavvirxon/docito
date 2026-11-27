-- Unix time (event.created) of the last Stripe subscription event applied to a row,
-- so that late or replayed webhook deliveries cannot overwrite newer state.
alter table public.billing_subscriptions
  add column if not exists last_event_created bigint;
