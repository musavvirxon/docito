// Payment provider abstraction layer
// To integrate a new payment processor:
// 1. Create a new provider class implementing PaymentProvider interface
// 2. Update getPaymentProvider() to return your provider

export * from './types';
export { MockPaymentProvider } from './mockProvider';

import type { PaymentProvider } from './types';
import { MockPaymentProvider } from './mockProvider';

// Payment provider registry
const providers: Record<string, () => PaymentProvider> = {
  mock: () => new MockPaymentProvider(),
  // Add your providers here:
  // stripe: () => new StripeProvider(config),
  // paypal: () => new PayPalProvider(config),
  // square: () => new SquareProvider(config),
};

// Get the configured payment provider
export function getPaymentProvider(providerName?: string): PaymentProvider {
  const name = providerName || import.meta.env.VITE_PAYMENT_PROVIDER || 'mock';
  const factory = providers[name];
  
  if (!factory) {
    console.warn(`Payment provider "${name}" not found, falling back to mock`);
    return new MockPaymentProvider();
  }
  
  return factory();
}

// Check if a real payment provider is configured
export function hasPaymentProvider(): boolean {
  const name = import.meta.env.VITE_PAYMENT_PROVIDER;
  return !!name && name !== 'mock' && !!providers[name];
}
