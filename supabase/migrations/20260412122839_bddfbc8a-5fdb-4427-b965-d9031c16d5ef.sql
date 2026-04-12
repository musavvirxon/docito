
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert entity settings" ON public.entity_settings;
DROP POLICY IF EXISTS "Authenticated users can update entity settings" ON public.entity_settings;

-- Insert: must be admin or active staff of the entity
CREATE POLICY "Entity admins or staff can insert settings"
  ON public.entity_settings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.practices
      WHERE id = entity_id AND admin_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.clinic_staff
      WHERE practice_id = entity_id AND user_id = auth.uid() AND status = 'active'
    )
  );

-- Update: must be admin or active staff of the entity
CREATE POLICY "Entity admins or staff can update settings"
  ON public.entity_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.practices
      WHERE id = entity_id AND admin_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.clinic_staff
      WHERE practice_id = entity_id AND user_id = auth.uid() AND status = 'active'
    )
  );
