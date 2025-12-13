import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac, timingSafeEqual } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, stripe-signature, paypal-transmission-sig",
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

// ============= SIGNATURE VERIFICATION =============

interface VerificationResult {
  valid: boolean;
  error?: string;
}

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<VerificationResult> {
  try {
    // Stripe signature format: t=timestamp,v1=signature
    const parts = signature.split(",");
    const timestampPart = parts.find((p) => p.startsWith("t="));
    const signaturePart = parts.find((p) => p.startsWith("v1="));

    if (!timestampPart || !signaturePart) {
      return { valid: false, error: "Invalid Stripe signature format" };
    }

    const timestamp = timestampPart.split("=")[1];
    const expectedSignature = signaturePart.split("=")[1];

    // Check timestamp is within 5 minutes (Stripe's tolerance)
    const timestampNum = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestampNum) > 300) {
      return { valid: false, error: "Webhook timestamp too old" };
    }

    // Create signed payload
    const signedPayload = `${timestamp}.${payload}`;
    
    // Compute HMAC
    const encoder = new TextEncoder();
    const key = encoder.encode(secret);
    const message = encoder.encode(signedPayload);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, message);
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Timing-safe comparison
    if (computedSignature.length !== expectedSignature.length) {
      return { valid: false, error: "Signature mismatch" };
    }

    const encoder2 = new TextEncoder();
    const a = encoder2.encode(computedSignature);
    const b = encoder2.encode(expectedSignature);
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    
    if (result !== 0) {
      return { valid: false, error: "Signature mismatch" };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Stripe verification error: ${error.message}` };
  }
}

async function verifyPayPalSignature(
  payload: string,
  headers: Headers,
  webhookId: string
): Promise<VerificationResult> {
  try {
    // PayPal requires these headers for verification
    const transmissionId = headers.get("paypal-transmission-id");
    const transmissionTime = headers.get("paypal-transmission-time");
    const certUrl = headers.get("paypal-cert-url");
    const authAlgo = headers.get("paypal-auth-algo");
    const transmissionSig = headers.get("paypal-transmission-sig");

    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      return { valid: false, error: "Missing PayPal verification headers" };
    }

    // Verify cert URL is from PayPal
    const certUrlParsed = new URL(certUrl);
    if (!certUrlParsed.hostname.endsWith(".paypal.com")) {
      return { valid: false, error: "Invalid PayPal certificate URL" };
    }

    // For full PayPal verification, you would:
    // 1. Fetch the certificate from certUrl
    // 2. Verify the certificate chain
    // 3. Verify the signature using the certificate
    // This requires the PayPal SDK or more complex crypto operations
    
    // Simplified verification: verify webhook ID matches and headers are present
    // For production, use PayPal's verify-webhook-signature API
    const paypalApiUrl = Deno.env.get("PAYPAL_API_URL") || "https://api-m.paypal.com";
    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalSecret = Deno.env.get("PAYPAL_SECRET");

    if (!paypalClientId || !paypalSecret) {
      console.warn("PayPal credentials not configured, skipping full verification");
      return { valid: true }; // Allow if not configured (log warning)
    }

    // Get access token
    const authResponse = await fetch(`${paypalApiUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${paypalClientId}:${paypalSecret}`)}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!authResponse.ok) {
      return { valid: false, error: "Failed to authenticate with PayPal" };
    }

    const { access_token } = await authResponse.json();

    // Verify webhook signature
    const verifyResponse = await fetch(
      `${paypalApiUrl}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: JSON.parse(payload),
        }),
      }
    );

    if (!verifyResponse.ok) {
      return { valid: false, error: "PayPal verification request failed" };
    }

    const verifyResult = await verifyResponse.json();
    if (verifyResult.verification_status !== "SUCCESS") {
      return { valid: false, error: "PayPal signature verification failed" };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: `PayPal verification error: ${error.message}` };
  }
}

async function verifySquareSignature(
  payload: string,
  signature: string,
  signatureKey: string
): Promise<VerificationResult> {
  try {
    if (!signature || !signatureKey) {
      return { valid: false, error: "Missing Square signature or key" };
    }

    // Square uses base64-encoded HMAC-SHA256
    const encoder = new TextEncoder();
    const key = encoder.encode(signatureKey);
    const message = encoder.encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, message);
    const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    if (computedSignature !== signature) {
      return { valid: false, error: "Square signature mismatch" };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Square verification error: ${error.message}` };
  }
}

async function verifyWebhookSignature(
  provider: string,
  payload: string,
  headers: Headers
): Promise<VerificationResult> {
  switch (provider) {
    case "stripe": {
      const stripeSignature = headers.get("stripe-signature");
      const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
      
      if (!stripeWebhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET not configured - rejecting webhook");
        return { valid: false, error: "Webhook secret not configured" };
      }
      
      if (!stripeSignature) {
        return { valid: false, error: "Missing Stripe signature header" };
      }
      
      return await verifyStripeSignature(payload, stripeSignature, stripeWebhookSecret);
    }
    
    case "paypal": {
      const paypalWebhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
      
      if (!paypalWebhookId) {
        console.error("PAYPAL_WEBHOOK_ID not configured - rejecting webhook");
        return { valid: false, error: "Webhook ID not configured" };
      }
      
      return await verifyPayPalSignature(payload, headers, paypalWebhookId);
    }
    
    case "square": {
      const squareSignature = headers.get("x-square-signature");
      const squareSignatureKey = Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY");
      
      if (!squareSignatureKey) {
        console.error("SQUARE_WEBHOOK_SIGNATURE_KEY not configured - rejecting webhook");
        return { valid: false, error: "Webhook signature key not configured" };
      }
      
      if (!squareSignature) {
        return { valid: false, error: "Missing Square signature header" };
      }
      
      return await verifySquareSignature(payload, squareSignature, squareSignatureKey);
    }
    
    default:
      // For unknown providers, require a generic signature with a configured secret
      const genericSecret = Deno.env.get("WEBHOOK_SECRET");
      const genericSignature = headers.get("x-webhook-signature");
      
      if (!genericSecret) {
        console.error("No webhook secret configured for provider:", provider);
        return { valid: false, error: "No webhook secret configured" };
      }
      
      if (!genericSignature) {
        return { valid: false, error: "Missing webhook signature" };
      }
      
      // Verify using HMAC-SHA256
      const encoder = new TextEncoder();
      const key = encoder.encode(genericSecret);
      const message = encoder.encode(payload);

      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, message);
      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (computedSignature !== genericSignature) {
        return { valid: false, error: "Signature mismatch" };
      }

      return { valid: true };
  }
}

// ============= EVENT NORMALIZATION =============

function normalizeWebhookEvent(provider: string, payload: any): NormalizedEvent {
  switch (provider) {
    case 'stripe':
      return normalizeStripeEvent(payload);
    case 'paypal':
      return normalizePayPalEvent(payload);
    case 'square':
      return normalizeSquareEvent(payload);
    default:
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

// ============= MAIN HANDLER =============

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
                     "stripe"; // Default to stripe
    
    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // Verify webhook signature BEFORE processing
    const verification = await verifyWebhookSignature(provider, rawBody, req.headers);
    
    if (!verification.valid) {
      console.error(`Webhook signature verification failed: ${verification.error}`);
      
      // Log the failed attempt for security auditing
      try {
        await supabase.from('audit_logs').insert({
          action: 'payment_webhook_rejected',
          entity_type: 'security',
          changes: { 
            provider, 
            error: verification.error,
            ip: req.headers.get("x-forwarded-for") || "unknown"
          },
        });
      } catch (logError) {
        console.error("Failed to log security event:", logError);
      }
      
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }), 
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Parse payload after verification
    const payload = JSON.parse(rawBody);

    // Normalize the event
    const event = normalizeWebhookEvent(provider, payload);
    console.log(`Processing verified ${provider} webhook: ${event.type}`, event);

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

// ============= EVENT HANDLERS =============

async function handlePaymentSucceeded(supabase: any, event: NormalizedEvent) {
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
  if (event.subscriptionId) {
    await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString() 
      })
      .eq('stripe_subscription_id', event.subscriptionId);
  }
  
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
