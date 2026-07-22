
-- Allow conversation participants to see each other's basic profile info (name, avatar)
-- so chat lists don't show "Unknown User" when a patient chats with an unverified doctor or vice versa.

CREATE OR REPLACE FUNCTION public.shares_conversation_with(_other_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp_self
    JOIN public.conversation_participants cp_other
      ON cp_other.conversation_id = cp_self.conversation_id
    WHERE cp_self.user_id = auth.uid()
      AND cp_other.user_id = _other_user
  );
$$;

DROP POLICY IF EXISTS "Conversation participants can view each other" ON public.profiles;
CREATE POLICY "Conversation participants can view each other"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.shares_conversation_with(user_id));
