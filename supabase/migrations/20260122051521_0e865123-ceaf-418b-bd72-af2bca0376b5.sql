-- Create the missing messaging_permissions table
CREATE TABLE IF NOT EXISTS public.messaging_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  can_message_user_id UUID NOT NULL,
  permission_type TEXT NOT NULL,
  context_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, can_message_user_id, permission_type, context_id)
);

-- Enable RLS
ALTER TABLE public.messaging_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own messaging permissions
CREATE POLICY "Users can view own messaging permissions"
ON public.messaging_permissions
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = can_message_user_id);

-- Create index for performance
CREATE INDEX idx_messaging_permissions_user_id ON public.messaging_permissions(user_id);
CREATE INDEX idx_messaging_permissions_can_message_user_id ON public.messaging_permissions(can_message_user_id);