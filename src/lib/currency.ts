/**
 * Currency utilities — single source of truth for formatting & conversion.
 *
 * All currency math uses MAJOR units (e.g. dollars, not cents) by default.
 * Use `formatCents()` if your value is stored in cents/minor units.
 */

export type CurrencyCode =
  | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'KRW' | 'RUB' | 'TRY' | 'UZS'
  | 'CNY' | 'SAR' | 'BRL' | 'MXN' | 'CAD' | 'AUD' | 'CHF' | 'INR';

export interface SupportedCurrency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: 'USD', symbol: '$',    name: 'US Dollar',         locale: 'en-US' },
  { code: 'EUR', symbol: '€',    name: 'Euro',              locale: 'de-DE' },
  { code: 'GBP', symbol: '£',    name: 'British Pound',     locale: 'en-GB' },
  { code: 'JPY', symbol: '¥',    name: 'Japanese Yen',      locale: 'ja-JP' },
  { code: 'KRW', symbol: '₩',    name: 'South Korean Won',  locale: 'ko-KR' },
  { code: 'RUB', symbol: '₽',    name: 'Russian Ruble',     locale: 'ru-RU' },
  { code: 'TRY', symbol: '₺',    name: 'Turkish Lira',      locale: 'tr-TR' },
  { code: 'UZS', symbol: 'soʻm', name: 'Uzbekistani Som',   locale: 'uz-UZ' },
  { code: 'CNY', symbol: '¥',    name: 'Chinese Yuan',      locale: 'zh-CN' },
  { code: 'SAR', symbol: '﷼',    name: 'Saudi Riyal',       locale: 'ar-SA' },
  { code: 'BRL', symbol: 'R$',   name: 'Brazilian Real',    locale: 'pt-BR' },
  { code: 'MXN', symbol: '$',    name: 'Mexican Peso',      locale: 'es-MX' },
  { code: 'CAD', symbol: 'C$',   name: 'Canadian Dollar',   locale: 'en-CA' },
  { code: 'AUD', symbol: 'A$',   name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'CHF', symbol: 'CHF',  name: 'Swiss Franc',       locale: 'de-CH' },
  { code: 'INR', symbol: '₹',    name: 'Indian Rupee',      locale: 'en-IN' },
];

export const isSupportedCurrency = (code: string | null | undefined): code is CurrencyCode =>
  !!code && SUPPORTED_CURRENCIES.some((c) => c.code === code);

export const getCurrencyMeta = (code: string | null | undefined): SupportedCurrency => {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) ?? SUPPORTED_CURRENCIES[0];
};

/**
 * Static fallback FX rates (base USD). Used until the live `fx_rates` table is
 * loaded by CurrencyContext. Refreshed daily server-side via the
 * `fx-rates-refresh` cron edge function.
 */
export const FALLBACK_FX_RATES: Record<CurrencyCode, number> = {
  USD: 1.00,  EUR: 0.92,  GBP: 0.79,  JPY: 155.0,
  KRW: 1380,  RUB: 92.0,  TRY: 32.5,  UZS: 12700,
  CNY: 7.25,  SAR: 3.75,  BRL: 5.10,  MXN: 17.0,
  CAD: 1.36,  AUD: 1.52,  CHF: 0.91,  INR: 83.0,
};

/** Convert an amount between currencies via USD pivot. */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number> = FALLBACK_FX_RATES,
): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return amount;
  const fromRate = rates[from] ?? FALLBACK_FX_RATES[from as CurrencyCode] ?? 1;
  const toRate = rates[to] ?? FALLBACK_FX_RATES[to as CurrencyCode] ?? 1;
  // amount is in `from`. amount/fromRate = USD. * toRate = target.
  return (amount / fromRate) * toRate;
}

/** Format a major-unit amount with the currency's locale. */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale?: string,
): string {
  if (!Number.isFinite(amount)) amount = 0;
  const meta = getCurrencyMeta(currency);
  const useLocale = locale || meta.locale;
  try {
    return new Intl.NumberFormat(useLocale, {
      style: 'currency',
      currency: meta.code,
      maximumFractionDigits: meta.code === 'JPY' || meta.code === 'KRW' || meta.code === 'UZS' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${meta.symbol}${amount.toFixed(2)}`;
  }
}

/** Format an amount stored in cents/minor units. */
export function formatCents(
  cents: number | null | undefined,
  currency: string = 'USD',
  locale?: string,
): string {
  const major = (cents ?? 0) / 100;
  return formatCurrency(major, currency, locale);
}
