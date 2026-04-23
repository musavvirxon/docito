import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  CurrencyCode,
  FALLBACK_FX_RATES,
  SUPPORTED_CURRENCIES,
  convertCurrency,
  formatCurrency,
  formatCents,
  getCurrencyMeta,
  isSupportedCurrency,
} from '@/lib/currency';

interface CurrencyContextValue {
  /** User's preferred display currency (or USD fallback). */
  currency: CurrencyCode;
  /** Update preferred currency on the user's profile. */
  setCurrency: (next: CurrencyCode) => Promise<void>;
  /** Format a major-unit amount in the viewer's preferred currency, converting from `sourceCurrency` if given. */
  format: (amount: number, sourceCurrency?: string) => string;
  /** Format a cents/minor-unit amount in the viewer's preferred currency. */
  formatCents: (cents: number | null | undefined, sourceCurrency?: string) => string;
  /** Convert raw value between currencies using current rates. */
  convert: (amount: number, from: string, to?: string) => number;
  /** Live FX rates loaded from the database (base USD). */
  rates: Record<string, number>;
  /** Whether the context is still loading the user's preference. */
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_FX_RATES);
  const [loading, setLoading] = useState(true);

  // Load FX rates (public table, anyone can read)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('fx_rates')
        .select('quote, rate')
        .eq('base', 'USD');
      if (cancelled || !data) return;
      const next: Record<string, number> = { ...FALLBACK_FX_RATES };
      for (const row of data) {
        next[row.quote] = Number(row.rate);
      }
      setRates(next);
    })();
    return () => { cancelled = true; };
  }, []);

  // Load preferred currency
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        // Not signed in — try localStorage
        const stored = localStorage.getItem('preferred_currency');
        if (stored && isSupportedCurrency(stored)) setCurrencyState(stored);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('preferred_currency')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const pref = (data as any)?.preferred_currency;
      if (isSupportedCurrency(pref)) setCurrencyState(pref);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const setCurrency = useCallback(async (next: CurrencyCode) => {
    setCurrencyState(next);
    localStorage.setItem('preferred_currency', next);
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ preferred_currency: next } as any)
        .eq('user_id', user.id);
    }
  }, [user?.id]);

  const value = useMemo<CurrencyContextValue>(() => {
    const meta = getCurrencyMeta(currency);
    return {
      currency,
      setCurrency,
      format: (amount: number, sourceCurrency?: string) => {
        const src = sourceCurrency || currency;
        const converted = src === currency ? amount : convertCurrency(amount, src, currency, rates);
        return formatCurrency(converted, currency, meta.locale);
      },
      formatCents: (cents, sourceCurrency) => {
        const src = sourceCurrency || currency;
        const major = (cents ?? 0) / 100;
        const converted = src === currency ? major : convertCurrency(major, src, currency, rates);
        return formatCents(Math.round(converted * 100), currency, meta.locale);
      },
      convert: (amount, from, to) => convertCurrency(amount, from, to || currency, rates),
      rates,
      loading,
    };
  }, [currency, setCurrency, rates, loading]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrencyContext() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Safe fallback so components that render outside the provider (tests, etc.) still work
    return {
      currency: 'USD' as CurrencyCode,
      setCurrency: async () => { /* noop */ },
      format: (a: number) => formatCurrency(a, 'USD'),
      formatCents: (c: number | null | undefined) => formatCents(c, 'USD'),
      convert: (a: number) => a,
      rates: FALLBACK_FX_RATES,
      loading: false,
    };
  }
  return ctx;
}

export { SUPPORTED_CURRENCIES };
