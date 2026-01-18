// File: src/types/stripe.d.ts

export {};

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => any;
  }
}
