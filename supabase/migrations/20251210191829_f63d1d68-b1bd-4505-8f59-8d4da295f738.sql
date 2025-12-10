-- Drop existing policies for messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Drop existing policies for conversations
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Drop existing policies for conversation_participants
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they created" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.conversation_participants;

-- Create new policies for conversations (participants + super_admin)
CREATE POLICY "Users can view conversations they participate in or super_admin"
ON public.conversations FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conversations.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin can update conversations"
ON public.conversations FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Create new policies for conversation_participants (participants + super_admin)
CREATE POLICY "Users can view participants of their conversations or super_admin"
ON public.conversation_participants FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can add participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own participation or super_admin"
ON public.conversation_participants FOR UPDATE
USING (
  user_id = auth.uid() OR 
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Create new policies for messages (participants + super_admin)
CREATE POLICY "Users can view messages in their conversations or super_admin"
ON public.messages FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages or super_admin"
ON public.messages FOR UPDATE
USING (
  sender_id = auth.uid() OR 
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Update video_consultations RLS policies
DROP POLICY IF EXISTS "Participants can view their consultations" ON public.video_consultations;
DROP POLICY IF EXISTS "Doctors can create consultations" ON public.video_consultations;
DROP POLICY IF EXISTS "Doctors can update their consultations" ON public.video_consultations;

CREATE POLICY "Participants or super_admin can view consultations"
ON public.video_consultations FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()) OR
  patient_id = auth.uid()
);

CREATE POLICY "Doctors can create consultations"
ON public.video_consultations FOR INSERT
WITH CHECK (
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
);

CREATE POLICY "Participants or super_admin can update consultations"
ON public.video_consultations FOR UPDATE
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()) OR
  patient_id = auth.uid()
);