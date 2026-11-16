import { describe, expect, test } from 'bun:test';
import { computeAccess, redirectFor } from './subscriptionAccess';

const now = new Date('2026-11-15T00:00:00Z');
const signup = (daysAgo) => ({ applies: true, trial_ends_at: new Date(now.getTime() + (30 - daysAgo) * 86400000).toISOString() });

describe('trial and subscription access', () => {
  test('day 13 after sign-up: no reminder yet', () => expect(computeAccess(signup(13), now).state).toBe('trial'));
  test('day 14 after sign-up: reminder', () => expect(computeAccess(signup(14), now).state).toBe('trial_reminder'));
  test('day 29: still allowed', () => expect(computeAccess(signup(29), now).state).toBe('trial_reminder'));
  test('day 30 and later: locked, sent to pricing', () => {
    expect(computeAccess(signup(30), now).state).toBe('trial_expired');
    expect(redirectFor('trial_expired', '/en/doctor/dashboard')).toBe('/pricing?trial=expired');
  });
  test('paid and current: full access', () =>
    expect(computeAccess({ applies: true, subscription_status: 'active', current_period_end: '2026-12-01' }, now).state).toBe('active'));
  test('payment overdue: sent to billing', () => {
    expect(computeAccess({ applies: true, subscription_status: 'past_due' }, now).state).toBe('payment_due');
    expect(computeAccess({ applies: true, subscription_status: 'active', current_period_end: '2026-11-01' }, now).state).toBe('payment_due');
    expect(redirectFor('payment_due', '/dashboard')).toBe('/billing?payment=due');
  });
  test('patients are never gated', () => expect(computeAccess({ applies: false }, now).state).toBe('none'));
  test('pricing and billing pages stay reachable', () => {
    expect(redirectFor('trial_expired', '/en/pricing')).toBeNull();
    expect(redirectFor('payment_due', '/billing')).toBeNull();
  });
});
