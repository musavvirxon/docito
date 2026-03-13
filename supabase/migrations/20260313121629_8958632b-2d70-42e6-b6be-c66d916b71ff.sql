
CREATE OR REPLACE FUNCTION public.get_doctor_referral_stats(p_doctor_id uuid)
RETURNS TABLE (
  total_sent bigint,
  total_received bigint,
  pending_sent bigint,
  pending_received bigint,
  completed bigint,
  rejected bigint,
  this_month_sent bigint,
  this_month_received bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*) FILTER (WHERE r.referring_doctor_id = p_doctor_id OR r.referrer_entity_id = p_doctor_id) AS total_sent,
    count(*) FILTER (WHERE r.referred_doctor_id = p_doctor_id OR r.receiver_entity_id = p_doctor_id) AS total_received,
    count(*) FILTER (WHERE (r.referring_doctor_id = p_doctor_id OR r.referrer_entity_id = p_doctor_id) AND r.status IN ('pending','sent')) AS pending_sent,
    count(*) FILTER (WHERE (r.referred_doctor_id = p_doctor_id OR r.receiver_entity_id = p_doctor_id) AND r.status IN ('pending','sent')) AS pending_received,
    count(*) FILTER (WHERE r.status = 'completed' AND (r.referring_doctor_id = p_doctor_id OR r.referred_doctor_id = p_doctor_id OR r.referrer_entity_id = p_doctor_id OR r.receiver_entity_id = p_doctor_id)) AS completed,
    count(*) FILTER (WHERE r.status = 'rejected' AND (r.referring_doctor_id = p_doctor_id OR r.referred_doctor_id = p_doctor_id OR r.referrer_entity_id = p_doctor_id OR r.receiver_entity_id = p_doctor_id)) AS rejected,
    count(*) FILTER (WHERE (r.referring_doctor_id = p_doctor_id OR r.referrer_entity_id = p_doctor_id) AND r.created_at >= date_trunc('month', now())) AS this_month_sent,
    count(*) FILTER (WHERE (r.referred_doctor_id = p_doctor_id OR r.receiver_entity_id = p_doctor_id) AND r.created_at >= date_trunc('month', now())) AS this_month_received
  FROM public.referrals r
  WHERE r.referring_doctor_id = p_doctor_id
     OR r.referred_doctor_id = p_doctor_id
     OR r.referrer_entity_id = p_doctor_id
     OR r.receiver_entity_id = p_doctor_id;
$$;
