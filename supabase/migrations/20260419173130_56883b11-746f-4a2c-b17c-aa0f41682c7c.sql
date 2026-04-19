
-- Support messages from public Contact form
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NULL,
  category text NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  message text NOT NULL,
  page_path text NULL,
  language text NULL,
  status text NOT NULL DEFAULT 'new',
  assigned_to uuid NULL,
  admin_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit support message"
  ON public.support_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Super admins view support messages"
  ON public.support_messages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins update support messages"
  ON public.support_messages FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins delete support messages"
  ON public.support_messages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_support_messages_status_created ON public.support_messages(status, created_at DESC);
CREATE INDEX idx_support_messages_user ON public.support_messages(user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER trg_support_messages_updated_at
  BEFORE UPDATE ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin video call booking requests
CREATE TABLE public.admin_video_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  user_id uuid NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NULL,
  topic text NOT NULL,
  notes text NULL,
  preferred_at timestamptz NOT NULL,
  alternate_at timestamptz NULL,
  timezone text NULL,
  language text NULL,
  status text NOT NULL DEFAULT 'pending',
  meeting_link text NULL,
  admin_notes text NULL,
  assigned_to uuid NULL,
  confirmed_at timestamptz NULL,
  completed_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_video_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can request admin video booking"
  ON public.admin_video_bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Super admins view all admin video bookings"
  ON public.admin_video_bookings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Owner views own admin video booking"
  ON public.admin_video_bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins update admin video bookings"
  ON public.admin_video_bookings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins delete admin video bookings"
  ON public.admin_video_bookings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_admin_video_bookings_status_created ON public.admin_video_bookings(status, created_at DESC);
CREATE INDEX idx_admin_video_bookings_user ON public.admin_video_bookings(user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER trg_admin_video_bookings_updated_at
  BEFORE UPDATE ON public.admin_video_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public lookup function for booking status by token (anon-safe, no PII leak beyond status fields)
CREATE OR REPLACE FUNCTION public.get_admin_video_booking_status(_token text)
RETURNS TABLE (
  id uuid,
  status text,
  topic text,
  preferred_at timestamptz,
  alternate_at timestamptz,
  meeting_link text,
  admin_notes text,
  created_at timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, status, topic, preferred_at, alternate_at, meeting_link, admin_notes,
         created_at, confirmed_at, completed_at, cancelled_at
  FROM public.admin_video_bookings
  WHERE public_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_video_booking_status(text) TO anon, authenticated;
