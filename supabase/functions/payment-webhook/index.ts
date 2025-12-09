import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

// Normalize webhook events from different providers to a standard format
interface NormalizedEvent {
  type: string;
  paymentId?: string;
  subscriptionId?: string;
  customerId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  metadata?: Record<string, string>;
}

function normalizeWebhookEvent(provider: string, payload: any): NormalizedEvent {
  // Add provider-specific normalization here
  switch (provider) {
    case 'stripe':
      return normalizeStripeEvent(payload);
    case 'paypal':
      return normalizePayPalEvent(payload);
    case 'square':
      return normalizeSquareEvent(payload);
    default:
      // Generic format - assume payload matches our standard format
      return {
        type: payload.type,
        paymentId: payload.data?.payment_id || payload.data?.id,
        subscriptionId: payload.data?.subscription_id,
        customerId: payload.data?.customer_id,
        amount: payload.data?.amount,
        currency: payload.data?.currency,
        status: payload.data?.status,
        metadata: payload.data?.metadata,
      };
  }
}

function normalizeStripeEvent(payload: any): NormalizedEvent {
  const eventType = payload.type;
  const obj = payload.data?.object || {};
  
  const typeMap: Record<string, string> = {
    'payment_intent.succeeded': 'payment.succeeded',
    'payment_intent.payment_failed': 'payment.failed',
    'charge.refunded': 'payment.refunded',
    'customer.subscription.created': 'subscription.created',
    'customer.subscription.updated': 'subscription.updated',
    'customer.subscription.deleted': 'subscription.canceled',
    'invoice.paid': 'invoice.paid',
    'invoice.payment_failed': 'invoice.payment_failed',
  };
  
  return {
    type: typeMap[eventType] || eventType,
    paymentId: obj.payment_intent || obj.id,
    subscriptionId: obj.subscription || obj.id,
    customerId: obj.customer,
    amount: obj.amount || obj.amount_paid,
    currency: obj.currency,
    status: obj.status,
    metadata: obj.metadata,
  };
}

function normalizePayPalEvent(payload: any): NormalizedEvent {
  const eventType = payload.event_type;
  const resource = payload.resource || {};
  
  const typeMap: Record<string, string> = {
    'PAYMENT.CAPTURE.COMPLETED': 'payment.succeeded',
    'PAYMENT.CAPTURE.DENIED': 'payment.failed',
    'PAYMENT.CAPTURE.REFUNDED': 'payment.refunded',
    'BILLING.SUBSCRIPTION.ACTIVATED': 'subscription.created',
    'BILLING.SUBSCRIPTION.UPDATED': 'subscription.updated',
    'BILLING.SUBSCRIPTION.CANCELLED': 'subscription.canceled',
  };
  
  return {
    type: typeMap[eventType] || eventType,
    paymentId: resource.id,
    subscriptionId: resource.billing_agreement_id || resource.id,
    customerId: resource.payer?.payer_id,
    amount: parseFloat(resource.amount?.value || '0') * 100,
    currency: resource.amount?.currency_code?.toLowerCase(),
    status: resource.status?.toLowerCase(),
    metadata: resource.custom_id ? { custom_id: resource.custom_id } : undefined,
  };
}

function normalizeSquareEvent(payload: any): NormalizedEvent {
  const eventType = payload.type;
  const obj = payload.data?.object || {};
  
  const typeMap: Record<string, string> = {
    'payment.completed': 'payment.succeeded',
    'payment.failed': 'payment.failed',
    'refund.created': 'payment.refunded',
    'subscription.created': 'subscription.created',
    'subscription.updated': 'subscription.updated',
    'subscription.canceled': 'subscription.canceled',
  };
  
  return {
    type: typeMap[eventType] || eventType,
    paymentId: obj.payment?.id,
    subscriptionId: obj.subscription?.id,
    customerId: obj.payment?.customer_id || obj.subscription?.customer_id,
    amount: obj.payment?.amount_money?.amount,
    currency: obj.payment?.amount_money?.currency?.toLowerCase(),
    status: obj.payment?.status?.toLowerCase() || obj.subscription?.status?.toLowerCase(),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determine payment provider from header or env
    const provider = req.headers.get("x-payment-provider") || 
                     Deno.env.get("PAYMENT_PROVIDER") || 
                     "generic";
    
    const signature = req.headers.get("x-webhook-signature") || 
                      req.headers.get("stripe-signature") ||
                      req.headers.get("paypal-transmission-sig");
    
    const payload = await req.json();
    
    // TODO: Verify webhook signature based on provider
    // For now, we'll process all events but log a warning
    if (!signature) {
      console.warn("Webhook received without signature verification");
    }

    // Normalize the event
    const event = normalizeWebhookEvent(provider, payload);
    console.log(`Processing ${provider} webhook: ${event.type}`, event);

    // Handle different event types
    switch (event.type) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(supabase, event);
        break;
      case 'payment.failed':
        await handlePaymentFailed(supabase, event);
        break;
      case 'payment.refunded':
        await handlePaymentRefunded(supabase, event);
        break;
      case 'subscription.created':
      case 'subscription.updated':
        await handleSubscriptionUpdated(supabase, event);
        break;
      case 'subscription.canceled':
        await handleSubscriptionCanceled(supabase, event);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(supabase, event);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Log the webhook event
    await supabase.from('audit_logs').insert({
      action: 'payment_webhook',
      entity_type: 'payment',
      entity_id: event.paymentId || event.subscriptionId,
      changes: { provider, event_type: event.type, ...event },
    });

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function handlePaymentSucceeded(supabase: any, event: NormalizedEvent) {
  // Update payment hold if this was a held payment
  if (event.paymentId) {
    const { data: hold } = await supabase
      .from('payment_holds')
      .select('id')
      .eq('provider_payment_id', event.paymentId)
      .single();
    
    if (hold) {
      await supabase
        .from('payment_holds')
        .update({ status: 'held', updated_at: new Date().toISOString() })
        .eq('id', hold.id);
    }
  }

  // Create transaction record
  if (event.metadata?.user_id) {
    await supabase.from('billing_transactions').insert({
      user_id: event.metadata.user_id,
      amount: event.amount || 0,
      currency: event.currency || 'usd',
      transaction_type: 'payment',
      status: 'completed',
      provider_transaction_id: event.paymentId,
      description: 'Payment completed',
    });
  }
}

async function handlePaymentFailed(supabase: any, event: NormalizedEvent) {
  if (event.paymentId) {
    await supabase
      .from('payment_holds')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('provider_payment_id', event.paymentId);
  }
}

async function handlePaymentRefunded(supabase: any, event: NormalizedEvent) {
  if (event.paymentId) {
    await supabase
      .from('payment_holds')
      .update({ 
        status: 'refunded', 
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('provider_payment_id', event.paymentId);
    
    // Create refund transaction
    if (event.metadata?.user_id) {
      await supabase.from('billing_transactions').insert({
        user_id: event.metadata.user_id,
        amount: -(event.amount || 0),
        currency: event.currency || 'usd',
        transaction_type: 'refund',
        status: 'completed',
        provider_transaction_id: event.paymentId,
        description: 'Payment refunded',
      });
    }
  }
}

async function handleSubscriptionUpdated(supabase: any, event: NormalizedEvent) {
  if (event.subscriptionId) {
    await supabase
      .from('user_subscriptions')
      .update({ 
        status: event.status === 'active' ? 'active' : 'past_due',
        updated_at: new Date().toISOString() 
      })
      .eq('stripe_subscription_id', event.subscriptionId);
  }
}

async function handleSubscriptionCanceled(supabase: any, event: NormalizedEvent) {
  if (event.subscriptionId) {
    await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'canceled',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('stripe_subscription_id', event.subscriptionId);
  }
}

async function handleInvoicePaid(supabase: any, event: NormalizedEvent) {
  // Update subscription status if needed
  if (event.subscriptionId) {
    await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString() 
      })
      .eq('stripe_subscription_id', event.subscriptionId);
  }
  
  // Create transaction record
  if (event.metadata?.user_id) {
    await supabase.from('billing_transactions').insert({
      user_id: event.metadata.user_id,
      amount: event.amount || 0,
      currency: event.currency || 'usd',
      transaction_type: 'subscription',
      status: 'completed',
      subscription_id: event.subscriptionId,
      description: 'Subscription invoice paid',
    });
  }
}
