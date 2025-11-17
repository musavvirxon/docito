import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { amount, currency = 'usd', payment_type, metadata = {} } = await req.json();

    // Create payment intent record (payment processor integration goes here)
    const { data: paymentIntent, error } = await supabaseClient
      .from('payment_intents')
      .insert({
        user_id: user.id,
        amount,
        currency,
        status: 'requires_payment_method',
        payment_type,
        metadata,
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: Integrate with your payment processor here
    // Example: const stripeIntent = await stripe.paymentIntents.create(...)
    // Update paymentIntent with processor-specific ID

    return new Response(
      JSON.stringify({ paymentIntent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
