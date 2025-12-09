// Mock payment provider for development/testing
// Replace with real provider implementation (Stripe, PayPal, Square, etc.)

import type {
  PaymentProvider,
  CustomerResult,
  CreatePaymentIntentParams,
  PaymentIntentResult,
  CapturePaymentParams,
  RefundParams,
  CreateSubscriptionParams,
  SubscriptionResult,
  NormalizedWebhookEvent,
} from './types';

export class MockPaymentProvider implements PaymentProvider {
  name = 'mock';

  async createCustomer(email: string, metadata?: Record<string, string>): Promise<CustomerResult> {
    return {
      id: `cus_mock_${Date.now()}`,
      email,
      providerData: { metadata },
    };
  }

  async getCustomer(customerId: string): Promise<CustomerResult | null> {
    return {
      id: customerId,
      email: 'mock@example.com',
      providerData: {},
    };
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const id = `pi_mock_${Date.now()}`;
    return {
      id,
      clientSecret: `${id}_secret_mock`,
      status: params.captureMethod === 'manual' ? 'pending' : 'succeeded',
      amount: params.amount,
      currency: params.currency,
      providerData: { metadata: params.metadata },
    };
  }

  async capturePayment(params: CapturePaymentParams): Promise<PaymentIntentResult> {
    return {
      id: params.paymentIntentId,
      status: 'succeeded',
      amount: params.amount || 0,
      currency: 'usd',
      providerData: {},
    };
  }

  async cancelPayment(_paymentIntentId: string): Promise<void> {
    // Mock cancellation
  }

  async refundPayment(params: RefundParams): Promise<{ id: string; status: string }> {
    return {
      id: `re_mock_${Date.now()}`,
      status: 'succeeded',
    };
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionResult> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    return {
      id: `sub_mock_${Date.now()}`,
      status: params.trialDays ? 'trialing' : 'active',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      providerData: { metadata: params.metadata },
    };
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResult | null> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    return {
      id: subscriptionId,
      status: 'active',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      providerData: {},
    };
  }

  async cancelSubscription(subscriptionId: string, immediate = false): Promise<SubscriptionResult> {
    const now = new Date();
    return {
      id: subscriptionId,
      status: immediate ? 'canceled' : 'active',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: now.toISOString(),
      cancelAtPeriodEnd: !immediate,
      providerData: {},
    };
  }

  async updateSubscription(subscriptionId: string, _priceId: string): Promise<SubscriptionResult> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    return {
      id: subscriptionId,
      status: 'active',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      providerData: {},
    };
  }

  async verifyWebhook(_payload: string, _signature: string): Promise<boolean> {
    return true;
  }

  async parseWebhook(payload: string): Promise<NormalizedWebhookEvent> {
    const event = JSON.parse(payload);
    return {
      type: event.type || 'payment.succeeded',
      id: event.id || `evt_mock_${Date.now()}`,
      data: event.data || {},
      rawEvent: event,
    };
  }
}
