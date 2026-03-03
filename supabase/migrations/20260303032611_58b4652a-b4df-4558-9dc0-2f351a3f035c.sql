
-- =============================================
-- 1. Recreate messages_with_attachments with security_invoker
-- =============================================
DROP VIEW IF EXISTS public.messages_with_attachments;
CREATE VIEW public.messages_with_attachments
WITH (security_invoker = on) AS
SELECT m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.message_type,
    m.metadata,
    m.is_read,
    m.created_at,
    m.updated_at,
    COALESCE(( SELECT jsonb_agg(to_jsonb(a.*) ORDER BY a.created_at)
           FROM message_attachments a
          WHERE a.message_id = m.id), '[]'::jsonb) AS attachments
FROM messages m;

GRANT SELECT ON public.messages_with_attachments TO authenticated, anon;

-- =============================================
-- 2. Recreate doctor_profiles_view with security_invoker
-- =============================================
DROP VIEW IF EXISTS public.doctor_profiles_view;
CREATE VIEW public.doctor_profiles_view
WITH (security_invoker = on) AS
SELECT d.id,
    d.user_id,
    d.specialty,
    d.bio,
    d.license_number,
    d.consultation_fee,
    d.verified,
    d.accepts_new_patients,
    d.practice_id,
    d.created_at,
    d.average_rating,
    d.weighted_rating,
    d.num_reviews,
    d.appointment_count,
    d.consultation_types,
    d.languages,
    d.years_experience,
    p.full_name,
    p.email,
    p.phone,
    p.avatar_url,
    pr.name AS practice_name,
    pr.city AS practice_city,
    pr.country AS practice_country,
    pr.address AS practice_address
FROM doctors d
    LEFT JOIN profiles p ON d.user_id = p.user_id
    LEFT JOIN practices pr ON d.practice_id = pr.id;

GRANT SELECT ON public.doctor_profiles_view TO authenticated, anon;

-- =============================================
-- 3. Fix overly permissive RLS policies
-- =============================================
DROP POLICY IF EXISTS "System can manage medication reminders" ON public.medication_reminders;
CREATE POLICY "Users manage own medication reminders"
ON public.medication_reminders FOR ALL TO authenticated
USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());

DROP POLICY IF EXISTS "System can manage payment intents" ON public.payment_intents;
DROP POLICY IF EXISTS "System can manage subscriptions" ON public.user_subscriptions;

-- =============================================
-- 4. Fix functions without search_path
-- =============================================
ALTER FUNCTION public.enforce_no_overlap_and_respect_blocks() SET search_path = public;
ALTER FUNCTION public.generate_invoice_number() SET search_path = public;
ALTER FUNCTION public.generate_video_room_id() SET search_path = public;
ALTER FUNCTION public.get_my_unread_notifications_count() SET search_path = public;
ALTER FUNCTION public.get_practice_appointments(uuid, integer) SET search_path = public;
ALTER FUNCTION public.get_practice_messages(uuid, integer) SET search_path = public;
ALTER FUNCTION public.get_practice_patients(uuid, integer) SET search_path = public;
ALTER FUNCTION public.get_practice_payments(uuid, integer) SET search_path = public;
ALTER FUNCTION public.get_practice_services(uuid) SET search_path = public;
ALTER FUNCTION public.get_practice_staff(uuid) SET search_path = public;
ALTER FUNCTION public.log_translation_change() SET search_path = public;
ALTER FUNCTION public.send_notification_to_user(uuid, text, text, text, json) SET search_path = public;
ALTER FUNCTION public.send_notification_to_user(uuid, text, text, text, jsonb, uuid, timestamp with time zone) SET search_path = public;
ALTER FUNCTION public.update_appointment_holds_updated_at() SET search_path = public;
ALTER FUNCTION public.update_imaging_center_updated_at() SET search_path = public;
ALTER FUNCTION public.update_pharmacy_updated_at() SET search_path = public;
ALTER FUNCTION public.update_user_preferences_updated_at() SET search_path = public;
