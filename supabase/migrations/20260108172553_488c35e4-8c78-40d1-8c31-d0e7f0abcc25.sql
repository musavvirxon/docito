-- Create attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create file_assets table for file metadata
CREATE TABLE IF NOT EXISTS public.file_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL, -- 'treatment_plan', 'procedure', 'referral', 'appointment', etc.
  context_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  attachment_type TEXT, -- 'xray', 'lab_result', 'report', 'photo', 'document', 'other'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_file_assets_context ON public.file_assets(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_file_assets_user ON public.file_assets(user_id);

-- Enable RLS
ALTER TABLE public.file_assets ENABLE ROW LEVEL SECURITY;

-- Users can view their own files
CREATE POLICY "Users can view their own files"
ON public.file_assets FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own files
CREATE POLICY "Users can insert their own files"
ON public.file_assets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own files
CREATE POLICY "Users can delete their own files"
ON public.file_assets FOR DELETE
USING (auth.uid() = user_id);

-- Storage policies for attachments bucket
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Updated_at trigger
CREATE TRIGGER update_file_assets_updated_at
BEFORE UPDATE ON public.file_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();