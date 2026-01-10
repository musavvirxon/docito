-- Fix remaining RLS policies - Drop existing before recreating

-- Drop existing subscription policies first
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Super admins can manage subscriptions" ON public.user_subscriptions;

-- Create proper policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.user_subscriptions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own subscriptions"
ON public.user_subscriptions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can manage subscriptions"
ON public.user_subscriptions FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Drop existing payment_intents policies first
DROP POLICY IF EXISTS "Users can view their own payment intents" ON public.payment_intents;
DROP POLICY IF EXISTS "Users can create their own payment intents" ON public.payment_intents;
DROP POLICY IF EXISTS "Super admins can manage payment intents" ON public.payment_intents;

-- Create proper policies for payment_intents
CREATE POLICY "Users can view their own payment intents"
ON public.payment_intents FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own payment intents"
ON public.payment_intents FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can manage payment intents"
ON public.payment_intents FOR ALL
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));