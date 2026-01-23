begin;

do $$
begin
  if current_setting('server_version_num')::int >= 150000 then
    execute 'alter view if exists public.doctor_public_search_view set (security_invoker = true)';
    execute 'alter view if exists public.practice_public_search_view set (security_invoker = true)';
    execute 'alter view if exists public.pharmacy_public_search_view set (security_invoker = true)';
  end if;
end $$;

alter function if exists public._entity_id_from_object_name(text) set search_path = pg_catalog, public, extensions;
alter function if exists public._entity_type_for_access(text) set search_path = pg_catalog, public, extensions;
alter function if exists public._update_imaging_equipment_updated_at() set search_path = pg_catalog, public, extensions;
alter function if exists public.book_referral_slot_atomic(uuid, uuid, uuid, uuid, date, text, text, text) set search_path = pg_catalog, public, extensions;
alter function if exists public.can_access_appointment(uuid) set search_path = pg_catalog, public, extensions;
alter function if exists public.can_access_lab_center(uuid) set search_path = pg_catalog, public, extensions;
alter function if exists public.can_access_location(uuid) set search_path = pg_catalog, public, extensions;
alter function if exists public.can_access_patient(uuid) set search_path = pg_catalog, public, extensions;
alter function if exists public.can_access_pharmacy(uuid) set search_path = pg_catalog, public, extensions;
alter function if exists public.can_access_practice(uuid) set search_path = pg_catalog, public, extensions;
alter function if exists public.can_access_referral(uuid) set search_path = pg_catalog, public, extensions;
alter function if exists public.can_access_user(uuid) set search_path = pg_catalog, public, extensions;
alter function if exists public.check_and_award_achievements(UUID) set search_path = pg_catalog, public, extensions;
alter function if exists public.create_appointment_notification() set search_path = pg_catalog, public, extensions;
alter function if exists public.create_guest_patient_profile(character varying, character varying, character varying) set search_path = pg_catalog, public, extensions;
alter function if exists public.create_or_get_patient_profile(character varying, character varying, character varying) set search_path = pg_catalog, public, extensions;
alter function if exists public.create_visit_conversation() set search_path = pg_catalog, public, extensions;
alter function if exists public.generate_invoice_number() set search_path = pg_catalog, public, extensions;
alter function if exists public.generate_video_room_id() set search_path = pg_catalog, public, extensions;
alter function if exists public.get_doctors_by_insurance(UUID, UUID) set search_path = pg_catalog, public, extensions;
alter function if exists public.handle_admin_profile_update() set search_path = pg_catalog, public, extensions;
alter function if exists public.handle_new_user() set search_path = pg_catalog, public, extensions;
alter function if exists public.inherit_clinic_insurance_to_doctor(UUID, UUID) set search_path = pg_catalog, public, extensions;
alter function if exists public.is_admin() set search_path = pg_catalog, public, extensions;
alter function if exists public.is_practice_admin(uuid) set search_path = pg_catalog, public, extensions;
alter function if exists public.is_provider_admin() set search_path = pg_catalog, public, extensions;
alter function if exists public.log_translation_change() set search_path = pg_catalog, public, extensions;
alter function if exists public.notify_doctor_verification_status() set search_path = pg_catalog, public, extensions;
alter function if exists public.process_insurance_request(uuid, text, text) set search_path = pg_catalog, public, extensions;
alter function if exists public.refresh_all_ratings() set search_path = pg_catalog, public, extensions;
alter function if exists public.set_updated_at() set search_path = pg_catalog, public, extensions;
alter function if exists public.submit_insurance_for_approval(uuid, uuid) set search_path = pg_catalog, public, extensions;
alter function if exists public.update_appointment_counts() set search_path = pg_catalog, public, extensions;
alter function if exists public.update_doctor_weighted_ratings() set search_path = pg_catalog, public, extensions;
alter function if exists public.update_imaging_center_updated_at() set search_path = pg_catalog, public, extensions;
alter function if exists public.update_practice_weighted_ratings() set search_path = pg_catalog, public, extensions;
alter function if exists public.update_referral_unread() set search_path = pg_catalog, public, extensions;
alter function if exists public.update_review_helpful_count() set search_path = pg_catalog, public, extensions;
alter function if exists public.update_user_preferences_updated_at() set search_path = pg_catalog, public, extensions;
alter function if exists public.validate_access_scope(text, uuid, uuid) set search_path = pg_catalog, public, extensions;
alter function if exists public.validate_admin_access_scope(text, uuid, uuid) set search_path = pg_catalog, public, extensions;
alter function if exists public.validate_staff_access_scope(text, uuid, uuid) set search_path = pg_catalog, public, extensions;
alter function if exists public.verify_practice_access(uuid) set search_path = pg_catalog, public, extensions;
alter function if exists public.verify_provider_access(uuid) set search_path = pg_catalog, public, extensions;
alter function if exists public.verify_super_admin() set search_path = pg_catalog, public, extensions;
alter function if exists public.verify_user_access(uuid) set search_path = pg_catalog, public, extensions;

notify pgrst, 'reload schema';

commit;
