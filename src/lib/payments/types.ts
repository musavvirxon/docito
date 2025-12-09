// Abstract payment provider types - processor agnostic

export interface PaymentProviderConfig {
  name: string;
  apiKey?: string;
  webhookSecret?: string;
  testMode: boolean;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, string>;
  captureMethod?: 'automatic' | 'manual';
  description?: string;
}

export interface PaymentIntentResult {
  id: string;
  clientSecret?: string;
  status: 'pending' | 'requires_action' | 'succeeded' | 'failed' | 'canceled';
  amount: number;
  currency: string;
  providerData: Record<string, unknown>;
}

export interface CapturePaymentParams {
  paymentIntentId: string;
  amount?: number; // Optional partial capture
}

export interface RefundParams {
  paymentIntentId: string;
  amount?: number; // Optional partial refund
  reason?: string;
}

export interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

export interface SubscriptionResult {
  id: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  providerData: Record<string, unknown>;
}

export interface CustomerResult {
  id: string;
  email?: string;
  name?: string;
  providerData: Record<string, unknown>;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// Standard webhook event types (provider-agnostic)
export type WebhookEventType =
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'subscription.renewed'
  | 'customer.created'
  | 'customer.updated'
  | 'invoice.paid'
  | 'invoice.payment_failed';

export interface NormalizedWebhookEvent {
  type: WebhookEventType;
  id: string;
  data: {
    paymentId?: string;
    subscriptionId?: string;
    customerId?: string;
    amount?: number;
    currency?: string;
    status?: string;
    metadata?: Record<string, string>;
  };
  rawEvent: WebhookEvent;
}

// Abstract payment provider interface
export interface PaymentProvider {
  name: string;
  
  // Customer management
  createCustomer(email: string, metadata?: Record<string, string>): Promise<CustomerResult>;
  getCustomer(customerId: string): Promise<CustomerResult | null>;
  
  // Payment intents (for one-time and hold payments)
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult>;
  capturePayment(params: CapturePaymentParams): Promise<PaymentIntentResult>;
  cancelPayment(paymentIntentId: string): Promise<void>;
  refundPayment(params: RefundParams): Promise<{ id: string; status: string }>;
  
  // Subscriptions
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult>;
  getSubscription(subscriptionId: string): Promise<SubscriptionResult | null>;
  cancelSubscription(subscriptionId: string, immediate?: boolean): Promise<SubscriptionResult>;
  updateSubscription(subscriptionId: string, priceId: string): Promise<SubscriptionResult>;
  
  // Webhook handling
  verifyWebhook(payload: string, signature: string): Promise<boolean>;
  parseWebhook(payload: string): Promise<NormalizedWebhookEvent>;
}
