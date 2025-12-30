import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Parse request body once
    const body = await req.json();
    const action = body.action ?? 'create';

    // Validate action
    if (action !== 'create' && action !== 'cancel') {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "create" or "cancel".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create') {
      const { plan_id } = body;

      // Validate plan_id
      if (!isValidUUID(plan_id)) {
        return new Response(
          JSON.stringify({ error: 'Invalid plan_id. Must be a valid UUID.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get plan details
      const { data: plan, error: planError } = await supabaseClient
        .from('subscription_plans')
        .select('*')
        .eq('id', plan_id)
        .single();

      if (planError) throw planError;

      // Calculate period
      const now = new Date();
      const periodEnd = new Date(now);
      if (plan.billing_interval === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      // Create subscription
      const { data: subscription, error } = await supabaseClient
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          plan_id,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`Subscription created for user ${user.id}, plan ${plan_id}`);

      return new Response(
        JSON.stringify({ subscription }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'cancel') {
      const { subscription_id } = body;

      // Validate subscription_id
      if (!isValidUUID(subscription_id)) {
        return new Response(
          JSON.stringify({ error: 'Invalid subscription_id. Must be a valid UUID.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { data: subscription, error } = await supabaseClient
        .from('user_subscriptions')
        .update({ 
          cancel_at_period_end: true,
          status: 'canceled'
        })
        .eq('id', subscription_id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      console.log(`Subscription ${subscription_id} canceled for user ${user.id}`);

      return new Response(
        JSON.stringify({ subscription }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Subscription processing error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
