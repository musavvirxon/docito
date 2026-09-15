CREATE OR REPLACE FUNCTION public.get_document_branding_v2(
  _practice_id uuid DEFAULT NULL,
  _doctor_id uuid DEFAULT NULL,
  _branch_id uuid DEFAULT NULL,
  _lang text DEFAULT 'en'
)
RETURNS TABLE(
  practice_id uuid,
  practice_name text,
  logo_url text,
  color_index integer,
  branch_id uuid,
  branch_name text,
  address text,
  phone text,
  email text,
  doctor_id uuid,
  doctor_name text,
  doctor_specialty text,
  doctor_license text,
  doctor_photo_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _resolved_practice_id uuid := _practice_id;
  _doctor_user_id uuid;
  _doctor_location_id uuid;
  _allowed boolean := false;
  _language text := lower(left(coalesce(_lang, 'en'), 2));
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF _doctor_id IS NOT NULL THEN
    SELECT d.user_id, d.practice_id, d.practice_location_id
      INTO _doctor_user_id, _resolved_practice_id, _doctor_location_id
    FROM public.doctors d
    WHERE d.id = _doctor_id;

    _resolved_practice_id := coalesce(
      _practice_id,
      _resolved_practice_id,
      (SELECT cs.practice_id FROM public.clinic_staff cs WHERE cs.user_id = _doctor_user_id AND cs.status = 'active' ORDER BY cs.created_at DESC NULLS LAST, cs.id LIMIT 1),
      (SELECT pjr.practice_id FROM public.practice_join_requests pjr WHERE pjr.doctor_id = _doctor_id AND pjr.status = 'accepted' ORDER BY pjr.reviewed_at DESC NULLS LAST, pjr.id LIMIT 1),
      (SELECT ps.practice_id FROM public.practice_staff ps WHERE ps.user_id = _doctor_user_id ORDER BY ps.created_at DESC NULLS LAST, ps.id LIMIT 1)
    );
  END IF;

  IF _resolved_practice_id IS NULL THEN
    _allowed := _doctor_user_id = _uid OR public.has_role(_uid, 'super_admin'::public.app_role);
  ELSE
    _allowed :=
      _doctor_user_id = _uid
      OR public.has_role(_uid, 'super_admin'::public.app_role)
      OR EXISTS (SELECT 1 FROM public.practices p WHERE p.id = _resolved_practice_id AND p.admin_id = _uid)
      OR EXISTS (SELECT 1 FROM public.clinic_staff cs WHERE cs.practice_id = _resolved_practice_id AND cs.user_id = _uid AND cs.status = 'active')
      OR EXISTS (SELECT 1 FROM public.practice_staff ps WHERE ps.practice_id = _resolved_practice_id AND ps.user_id = _uid)
      OR EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.practice_id = _resolved_practice_id
          AND (_doctor_id IS NULL OR a.doctor_id = _doctor_id)
          AND a.patient_id = _uid
      );
  END IF;

  IF NOT _allowed THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH selected_branch AS (
    SELECT pl.*
    FROM public.practice_locations pl
    WHERE pl.practice_id = _resolved_practice_id
    ORDER BY
      (pl.id = coalesce(_branch_id, _doctor_location_id)) DESC,
      pl.is_primary DESC NULLS LAST,
      pl.created_at ASC,
      pl.id ASC
    LIMIT 1
  )
  SELECT
    p.id,
    p.name::text,
    coalesce(nullif(es.payload->'branding'->>'logo_url', ''), nullif(p.logo_url, '')),
    coalesce((es.payload->'branding'->>'colorIndex')::integer, 0),
    sb.id,
    coalesce(
      CASE _language
        WHEN 'ru' THEN nullif(sb.name_ru, '')
        WHEN 'uz' THEN nullif(sb.name_uz, '')
        WHEN 'en' THEN nullif(sb.name_en, '')
        WHEN 'ar' THEN nullif(sb.name_ar, '')
        ELSE NULL
      END,
      nullif(sb.name, ''),
      p.name
    )::text,
    coalesce(
      CASE _language
        WHEN 'ru' THEN nullif(sb.address_ru, '')
        WHEN 'uz' THEN nullif(sb.address_uz, '')
        WHEN 'en' THEN nullif(sb.address_en, '')
        WHEN 'ar' THEN nullif(sb.address_ar, '')
        ELSE NULL
      END,
      nullif(sb.address, ''),
      p.address
    )::text,
    coalesce(nullif(sb.phone, ''), p.phone)::text,
    coalesce(nullif(sb.email, ''), p.email)::text,
    d.id,
    pr.full_name::text,
    coalesce(
      CASE _language
        WHEN 'ru' THEN nullif(d.specialty_ru, '')
        WHEN 'uz' THEN nullif(d.specialty_uz, '')
        WHEN 'en' THEN nullif(d.specialty_en, '')
        WHEN 'ar' THEN nullif(d.specialty_ar, '')
        ELSE NULL
      END,
      d.specialty
    )::text,
    d.license_number::text,
    coalesce(nullif(pr.avatar_url, ''), nullif(d.logo_url, ''))::text
  FROM (SELECT 1) seed
  LEFT JOIN public.practices p ON p.id = _resolved_practice_id
  LEFT JOIN public.entity_settings es ON es.entity_id = p.id AND es.entity_type = 'practice'
  LEFT JOIN selected_branch sb ON true
  LEFT JOIN public.doctors d ON d.id = _doctor_id
  LEFT JOIN public.profiles pr ON pr.user_id = d.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_document_branding_v2(uuid, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_document_branding_v2(uuid, uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_document_branding_v2(uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_document_branding_v2(uuid, uuid, uuid, text) TO service_role;