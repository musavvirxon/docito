DROP POLICY IF EXISTS "Anyone can view procedure materials" ON public.procedure_materials;
CREATE POLICY "View materials of visible procedures" ON public.procedure_materials FOR SELECT
USING (EXISTS (SELECT 1 FROM public.procedures p WHERE p.id = procedure_materials.procedure_id));

DROP POLICY IF EXISTS "Anyone can view procedure files" ON public.procedure_files;
CREATE POLICY "View files of visible procedures" ON public.procedure_files FOR SELECT
USING (EXISTS (SELECT 1 FROM public.procedures p WHERE p.id = procedure_files.procedure_id));

DROP POLICY IF EXISTS "Public can view doctor blocked times" ON public.blocked_times;
CREATE POLICY "View blocked times of visible doctors" ON public.blocked_times FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = blocked_times.doctor_id));

DROP POLICY IF EXISTS "Public can view doctor schedule settings" ON public.schedule_settings;
CREATE POLICY "View schedule settings of visible doctors" ON public.schedule_settings FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = schedule_settings.doctor_id));

DROP POLICY IF EXISTS "Authenticated users can view location details" ON public.practice_locations;
CREATE POLICY "View locations of visible practices" ON public.practice_locations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.practices p WHERE p.id = practice_locations.practice_id));

DROP POLICY IF EXISTS "Anyone can view translation memory" ON public.translation_memory;
CREATE POLICY "Admins can view translation memory" ON public.translation_memory FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can submit support message" ON public.support_messages;
CREATE POLICY "Anyone can submit own support message" ON public.support_messages FOR INSERT TO anon, authenticated
WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND status = 'new' AND assigned_to IS NULL AND admin_notes IS NULL);

DROP POLICY IF EXISTS "Anyone can request admin video booking" ON public.admin_video_bookings;
CREATE POLICY "Anyone can request own admin video booking" ON public.admin_video_bookings FOR INSERT TO anon, authenticated
WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND status = 'pending' AND meeting_link IS NULL AND admin_notes IS NULL
  AND assigned_to IS NULL AND confirmed_at IS NULL AND completed_at IS NULL AND cancelled_at IS NULL);

DROP POLICY IF EXISTS "Showcase files are readable by everyone" ON storage.objects;
CREATE POLICY "Showcase files readable when published" ON storage.objects FOR SELECT
USING (bucket_id = 'showcase' AND (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.showcase_assets a WHERE a.storage_path = storage.objects.name)
  OR EXISTS (SELECT 1 FROM public.showcase_pages p WHERE p.video_storage_path = storage.objects.name)
));