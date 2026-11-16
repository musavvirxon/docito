ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_reminder_sent_at timestamptz;

UPDATE public.profiles SET trial_ends_at = CASE
  WHEN created_at < now() - interval '30 days' THEN now() + interval '14 days'
  ELSE created_at + interval '30 days' END
WHERE trial_ends_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_profile_trial_end()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := coalesce(NEW.created_at, now()) + interval '30 days';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_profiles_trial_end ON public.profiles;
CREATE TRIGGER trg_profiles_trial_end BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profile_trial_end();

-- Prevent users from extending their own trial
CREATE OR REPLACE FUNCTION public.guard_profile_trial_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'authenticated'
     AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    NEW.trial_ends_at := OLD.trial_ends_at;
    NEW.trial_reminder_sent_at := OLD.trial_reminder_sent_at;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_profiles_trial_guard ON public.profiles;
CREATE TRIGGER trg_profiles_trial_guard BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_trial_fields();

CREATE OR REPLACE FUNCTION public.get_my_access_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _billing_uid uuid;
  _is_super boolean;
  _is_owner boolean;
  _is_staff boolean := false;
  _trial timestamptz;
  _sub record;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('applies', false); END IF;
  SELECT public.has_role(_uid,'super_admin') INTO _is_super;
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id=_uid AND role::text IN
    ('doctor','admin','clinic_admin','pharmacy_admin','lab_admin','imaging_admin')) INTO _is_owner;
  _billing_uid := _uid;
  IF NOT _is_owner THEN
    SELECT p.admin_id INTO _billing_uid FROM practice_staff ps JOIN practices p ON p.id=ps.practice_id
      WHERE ps.user_id=_uid AND coalesce(ps.status,'active') IN ('active','accepted') AND p.admin_id IS NOT NULL LIMIT 1;
    _is_staff := _billing_uid IS NOT NULL;
    IF NOT _is_staff THEN _billing_uid := _uid; END IF;
  END IF;
  IF _is_super OR NOT (_is_owner OR _is_staff) THEN
    RETURN jsonb_build_object('applies', false);
  END IF;
  SELECT trial_ends_at INTO _trial FROM profiles WHERE user_id=_billing_uid LIMIT 1;
  SELECT status, current_period_end INTO _sub FROM user_subscriptions
    WHERE user_id=_billing_uid ORDER BY (status='active') DESC, current_period_end DESC NULLS LAST LIMIT 1;
  RETURN jsonb_build_object('applies', true, 'is_staff', _is_staff, 'trial_ends_at', _trial,
    'subscription_status', _sub.status, 'current_period_end', _sub.current_period_end);
END $$;

REVOKE ALL ON FUNCTION public.get_my_access_status() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_access_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.send_trial_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  WITH due AS (
    UPDATE profiles p SET trial_reminder_sent_at = now()
    WHERE p.trial_reminder_sent_at IS NULL
      AND p.trial_ends_at <= now() + interval '16 days' AND p.trial_ends_at > now()
      AND EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id=p.user_id AND r.role::text IN
        ('doctor','admin','clinic_admin','pharmacy_admin','lab_admin','imaging_admin'))
      AND NOT EXISTS (SELECT 1 FROM user_subscriptions s WHERE s.user_id=p.user_id AND s.status='active')
    RETURNING p.user_id, p.trial_ends_at)
  INSERT INTO notifications(user_id, title, message, type)
  SELECT user_id, 'Your free trial ends soon',
    'Your free trial ends on ' || to_char(trial_ends_at,'YYYY-MM-DD') || '. Choose a plan to keep using your dashboard.',
    'subscription'
  FROM due;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;
REVOKE ALL ON FUNCTION public.send_trial_reminders() FROM public, anon, authenticated;