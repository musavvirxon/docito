begin;

create or replace function public.super_admin_entity_insights(
  p_entity_type text,
  p_entity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_type text := lower(coalesce(p_entity_type, ''));
  v_billing_type text;

  v_total_orders bigint := 0;
  v_active_staff bigint := 0;

  v_revenue_cents bigint := 0;
  v_currency text := 'usd';

  v_subscription jsonb := null;
  v_invoices jsonb := '[]'::jsonb;
  v_transactions jsonb := '[]'::jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden';
  end if;

  -- Normalize entity type
  if v_entity_type = 'laboratory' then
    v_entity_type := 'lab';
  end if;
  if v_entity_type = 'practice' then
    v_entity_type := 'clinic';
  end if;

  v_billing_type := case v_entity_type
    when 'clinic' then 'clinic'
    when 'lab' then 'lab'
    when 'imaging' then 'imaging'
    when 'pharmacy' then 'pharmacy'
    else null
  end;

  -- ----------------------------
  -- Analytics: Orders + Staff
  -- ----------------------------
  if v_entity_type = 'clinic' then
    select
      coalesce((select count(*) from public.appointments a where a.practice_id = p_entity_id), 0)
      + coalesce((select count(*) from public.clinic_lab_orders clo where clo.clinic_id = p_entity_id), 0)
      + coalesce((select count(*) from public.clinic_imaging_orders cio where cio.clinic_id = p_entity_id), 0)
    into v_total_orders;

    select
      coalesce((select count(*) from public.clinic_staff cs where cs.practice_id = p_entity_id and cs.status = 'active'), 0)
      + coalesce((select count(*) from public.practice_staff ps where ps.practice_id = p_entity_id and ps.status = 'active'), 0)
    into v_active_staff;

  elsif v_entity_type = 'lab' then
    if to_regclass('public.test_orders') is not null then
      execute 'select count(*) from public.test_orders where lab_center_id = $1'
        into v_total_orders
        using p_entity_id;
    else
      v_total_orders := 0;
    end if;

    select coalesce(count(*), 0)
    into v_active_staff
    from public.lab_staff ls
    where ls.lab_center_id = p_entity_id
      and ls.status = 'active';

  elsif v_entity_type = 'imaging' then
    if to_regclass('public.imaging_order_state') is not null then
      execute 'select count(*) from public.imaging_order_state where imaging_center_id = $1'
        into v_total_orders
        using p_entity_id;
    else
      v_total_orders := 0;
    end if;

    if to_regclass('public.imaging_staff') is not null then
      execute 'select count(*) from public.imaging_staff where imaging_center_id = $1 and status = ''active'''
        into v_active_staff
        using p_entity_id;
    else
      v_active_staff := 0;
    end if;

  elsif v_entity_type = 'pharmacy' then
    if to_regclass('public.fulfillment_orders') is not null then
      execute 'select count(*) from public.fulfillment_orders where pharmacy_id = $1'
        into v_total_orders
        using p_entity_id;
    else
      v_total_orders := 0;
    end if;

    if to_regclass('public.pharmacy_staff') is not null then
      execute 'select count(*) from public.pharmacy_staff where pharmacy_id = $1 and status = ''active'''
        into v_active_staff
        using p_entity_id;
    else
      v_active_staff := 0;
    end if;
  end if;

  -- ----------------------------
  -- Billing: Revenue + Subscriptions + Invoices + Transactions
  -- ----------------------------
  if v_billing_type is not null then
    select coalesce(sum(bt.amount_cents), 0)
      into v_revenue_cents
    from public.billing_transactions bt
    where bt.entity_type = v_billing_type
      and bt.entity_id = p_entity_id
      and bt.status = 'completed';

    select bt.currency
      into v_currency
    from public.billing_transactions bt
    where bt.entity_type = v_billing_type
      and bt.entity_id = p_entity_id
    order by bt.created_at desc
    limit 1;

    v_currency := coalesce(nullif(v_currency, ''), 'usd');

    select jsonb_build_object(
      'id', bs.id,
      'status', bs.status,
      'started_at', bs.started_at,
      'current_period_start', bs.current_period_start,
      'current_period_end', bs.current_period_end,
      'cancel_at_period_end', bs.cancel_at_period_end,
      'plan', jsonb_build_object(
        'id', bp.id,
        'code', bp.code,
        'name', bp.name,
        'description', bp.description,
        'interval', bp.interval,
        'amount_cents', bp.amount_cents,
        'currency', bp.currency,
        'is_active', bp.is_active
      )
    )
    into v_subscription
    from public.billing_subscriptions bs
    join public.billing_plans bp on bp.id = bs.plan_id
    where bs.entity_type = v_billing_type
      and bs.entity_id = p_entity_id
    limit 1;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', bi.id,
          'status', bi.status,
          'currency', bi.currency,
          'amount_due_cents', bi.amount_due_cents,
          'amount_paid_cents', bi.amount_paid_cents,
          'period_start', bi.period_start,
          'period_end', bi.period_end,
          'due_at', bi.due_at,
          'created_at', bi.created_at
        )
        order by bi.created_at desc
      ),
      '[]'::jsonb
    )
    into v_invoices
    from (
      select *
      from public.billing_invoices bi
      where bi.entity_type = v_billing_type
        and bi.entity_id = p_entity_id
      order by bi.created_at desc
      limit 10
    ) bi;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', bt.id,
          'status', bt.status,
          'transaction_type', bt.transaction_type,
          'currency', bt.currency,
          'amount_cents', bt.amount_cents,
          'provider', bt.provider,
          'provider_ref', bt.provider_ref,
          'created_at', bt.created_at
        )
        order by bt.created_at desc
      ),
      '[]'::jsonb
    )
    into v_transactions
    from (
      select *
      from public.billing_transactions bt
      where bt.entity_type = v_billing_type
        and bt.entity_id = p_entity_id
      order by bt.created_at desc
      limit 10
    ) bt;
  end if;

  return jsonb_build_object(
    'entity_type', v_entity_type,
    'entity_id', p_entity_id,
    'analytics', jsonb_build_object(
      'total_orders', v_total_orders,
      'active_staff', v_active_staff,
      'revenue_cents', v_revenue_cents,
      'currency', v_currency
    ),
    'billing', jsonb_build_object(
      'subscription', v_subscription,
      'invoices', v_invoices,
      'transactions', v_transactions
    )
  );
end;
$$;

grant execute on function public.super_admin_entity_insights(text, uuid) to authenticated;

commit;
