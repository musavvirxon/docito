import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation
const VALID_CURRENCIES = ['usd', 'eur', 'gbp', 'uzs'] as const;
const MAX_AMOUNT = 10000000; // Max $100,000 in cents
const MIN_AMOUNT = 50; // Min $0.50 in cents

interface PaymentIntentRequest {
  amount: number;
  currency?: string;
  payment_type: string;
  metadata?: Record<string, string>;
}

function validatePaymentInput(data: unknown): { valid: true; data: PaymentIntentRequest } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const input = data as Record<string, unknown>;

  // Validate amount
  if (typeof input.amount !== 'number' || !Number.isInteger(input.amount)) {
    return { valid: false, error: 'Amount must be an integer' };
  }
  if (input.amount < MIN_AMOUNT) {
    return { valid: false, error: `Amount must be at least ${MIN_AMOUNT} cents` };
  }
  if (input.amount > MAX_AMOUNT) {
    return { valid: false, error: `Amount cannot exceed ${MAX_AMOUNT} cents` };
  }

  // Validate currency
  const currency = (input.currency as string || 'usd').toLowerCase();
  if (!VALID_CURRENCIES.includes(currency as typeof VALID_CURRENCIES[number])) {
    return { valid: false, error: `Invalid currency. Must be one of: ${VALID_CURRENCIES.join(', ')}` };
  }

  // Validate payment_type
  if (typeof input.payment_type !== 'string' || input.payment_type.length === 0) {
    return { valid: false, error: 'Payment type is required' };
  }
  if (input.payment_type.length > 50) {
    return { valid: false, error: 'Payment type must be 50 characters or less' };
  }

  // Validate metadata
  const metadata = input.metadata || {};
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { valid: false, error: 'Metadata must be an object' };
  }
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof key !== 'string' || typeof value !== 'string') {
      return { valid: false, error: 'Metadata keys and values must be strings' };
    }
    if (key.length > 100 || value.length > 500) {
      return { valid: false, error: 'Metadata key max 100 chars, value max 500 chars' };
    }
  }

  return {
    valid: true,
    data: {
      amount: input.amount,
      currency,
      payment_type: input.payment_type,
      metadata: metadata as Record<string, string>,
    },
  };
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate input
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validation = validatePaymentInput(requestBody);
    if (!validation.valid) {
      console.log('Validation failed:', validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amount, currency, payment_type, metadata } = validation.data;

    console.log('Creating payment intent:', { user_id: user.id, amount, currency, payment_type });

    // Create payment intent record
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

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to create payment intent');
    }

    console.log('Payment intent created:', paymentIntent.id);

    return new Response(
      JSON.stringify({ paymentIntent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Payment intent error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
