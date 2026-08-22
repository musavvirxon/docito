do $$
declare r record;
  public_fns text[] := array[
    'get_public_doctor_profile','get_public_doctor_profiles','list_public_doctor_profiles',
    'get_queue_display','get_consultation_by_guest_token','fetch_available_slots',
    'get_staff_invitation_by_token','check_user_exists','get_practice_locations',
    'get_doctors_by_insurance','update_popular_search','get_admin_video_booking_status'
  ];
  internal_fns text[] := array[
    'grant_super_admin_to_authorized_emails','rls_auto_enable','cleanup_rate_limits',
    'cleanup_expired_appointment_holds','refresh_all_ratings',
    'update_doctor_weighted_ratings','update_practice_weighted_ratings',
    'update_appointment_counts','update_user_role','next_invoice_number'
  ];
begin
  for r in
    select p.oid::regprocedure::text as sig, p.proname, p.prorettype = 'trigger'::regtype as is_trigger
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
    if not r.is_trigger and not (r.proname = any(internal_fns)) then
      execute format('grant execute on function %s to authenticated', r.sig);
      if r.proname = any(public_fns) then
        execute format('grant execute on function %s to anon', r.sig);
      end if;
    end if;
  end loop;
end $$;