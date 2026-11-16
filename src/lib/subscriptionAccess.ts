export type AccessState = 'none' | 'active' | 'trial' | 'trial_reminder' | 'trial_expired' | 'payment_due';

export interface AccessInput {
  applies: boolean;
  trial_ends_at?: string | null;
  subscription_status?: string | null;
  current_period_end?: string | null;
}

const DAY = 86_400_000;
/** Reminder shows from day 14 of the 30-day trial, i.e. when 16 or fewer days remain. */
export const REMINDER_DAYS_LEFT = 16;

export function computeAccess(input: AccessInput | null | undefined, now: Date = new Date()): { state: AccessState; daysLeft: number } {
  if (!input || !input.applies) return { state: 'none', daysLeft: 0 };
  const status = input.subscription_status ?? null;
  if (status) {
    const end = input.current_period_end ? new Date(input.current_period_end).getTime() : null;
    const overdue = ['past_due', 'unpaid', 'expired', 'incomplete'].includes(status);
    if (status === 'active' && (end === null || end > now.getTime())) return { state: 'active', daysLeft: 0 };
    if (overdue || status === 'active') return { state: 'payment_due', daysLeft: 0 };
  }
  const trialEnd = input.trial_ends_at ? new Date(input.trial_ends_at).getTime() : now.getTime();
  const daysLeft = Math.ceil((trialEnd - now.getTime()) / DAY);
  if (daysLeft <= 0) return { state: 'trial_expired', daysLeft: 0 };
  return { state: daysLeft <= REMINDER_DAYS_LEFT ? 'trial_reminder' : 'trial', daysLeft };
}

const ALLOWED = [/\/pricing/, /\/billing/, /\/profile/, /\/settings/, /\/auth/, /\/notifications/];
const GATED = [/dashboard/, /^\/(?:[a-z]{2}\/)?(doctor|finance|inventory|appointment-session|practice-settings)(\/|$)/];

export function redirectFor(state: AccessState, pathname: string): string | null {
  if (ALLOWED.some((r) => r.test(pathname))) return null;
  if (!GATED.some((r) => r.test(pathname))) return null;
  if (state === 'trial_expired') return '/pricing?trial=expired';
  if (state === 'payment_due') return '/billing?payment=due';
  return null;
}
