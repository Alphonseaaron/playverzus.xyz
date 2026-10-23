/**
 * Unified Currency & Exchange Rate Utility for Playverzus.xyz
 * All platform stakes, entry fees, prize pools, and cashier balances are standardized in USDC ($1.00 USD).
 * When depositing or withdrawing, users see real-time automated local fiat conversions (KES, EUR, GBP, NGN, BRL, etc.).
 */

export interface FiatConversion {
  usdcAmount: number;
  fiatAmount: number;
  formattedFiat: string;
  formattedFiatCompact: string;
  rate: number;
  currency: string;
  symbol: string;
  countryName: string;
}

// Resilient default FX rates (USDC/USD to Local Fiat)
export const DEFAULT_FX_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.77,
  KES: 129.50,
  NGN: 1680.00,
  BRL: 5.65,
  ZAR: 17.60,
  INR: 84.10,
  CAD: 1.38,
  AUD: 1.50,
  JPY: 149.50,
  PHP: 57.80,
  GHS: 15.50,
  UGX: 3700.00,
  TZS: 2600.00,
};

// Currency metadata (symbols & formatting locale)
export const CURRENCY_METADATA: Record<string, { symbol: string; name: string; locale: string }> = {
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  KES: { symbol: 'KSh', name: 'Kenyan Shilling', locale: 'en-KE' },
  NGN: { symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG' },
  BRL: { symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
  ZAR: { symbol: 'R', name: 'South African Rand', locale: 'en-ZA' },
  INR: { symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  CAD: { symbol: 'CA$', name: 'Canadian Dollar', locale: 'en-CA' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  JPY: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  PHP: { symbol: '₱', name: 'Philippine Peso', locale: 'en-PH' },
  GHS: { symbol: 'GH₵', name: 'Ghanaian Cedi', locale: 'en-GH' },
  UGX: { symbol: 'USh', name: 'Ugandan Shilling', locale: 'en-UG' },
  TZS: { symbol: 'TSh', name: 'Tanzanian Shilling', locale: 'en-TZ' },
};

// Map country code to currency code
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: 'USD',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  GB: 'GBP',
  KE: 'KES',
  NG: 'NGN',
  BR: 'BRL',
  ZA: 'ZAR',
  IN: 'INR',
  CAD: 'CAD',
  AU: 'AUD',
  JP: 'JPY',
  PH: 'PHP',
  GH: 'GHS',
  UG: 'UGX',
  TZ: 'TZS',
};

// In-memory cache for live exchange rates
let cachedFxRates: { rates: Record<string, number>; timestamp: number } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch live exchange rates from public API with fallback to DEFAULT_FX_RATES
 */
export async function fetchLiveFxRates(): Promise<Record<string, number>> {
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem('verzus_fx_rates');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          cachedFxRates = parsed;
          return { ...DEFAULT_FX_RATES, ...parsed.rates };
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  if (cachedFxRates && Date.now() - cachedFxRates.timestamp < CACHE_TTL_MS) {
    return { ...DEFAULT_FX_RATES, ...cachedFxRates.rates };
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error('FX API error');
    const data = await res.json();
    if (data && data.rates) {
      const combined = { ...DEFAULT_FX_RATES, ...data.rates };
      cachedFxRates = { rates: combined, timestamp: Date.now() };
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('verzus_fx_rates', JSON.stringify(cachedFxRates));
        } catch {
          // Ignore storage quota errors
        }
      }
      return combined;
    }
  } catch {
    // Fall back safely to defaults
  }

  return DEFAULT_FX_RATES;
}

/**
 * Format an amount in USDC (e.g. "$25.00" or "$25.00 USDC")
 */
export function formatUSDC(amount: number | null | undefined, includeTicker = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeTicker ? '$0.00 USDC' : '$0.00';
  }
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return includeTicker ? `$${formatted} USDC` : `$${formatted}`;
}

/**
 * Backwards compatibility alias: formatEUR points to formatUSDC
 * so all legacy calls across the application immediately display in USDC ($).
 */
export const formatEUR = (amount: number | null | undefined) => formatUSDC(amount, false);

/**
 * Format practice points
 */
export function formatPoints(points: number | null | undefined): string {
  if (!points || isNaN(points)) return '0 PTS';
  return `${new Intl.NumberFormat('en-US').format(Math.floor(points))} PTS`;
}

/**
 * Format prize pool (USDC + optional points)
 */
export function formatPrize(
  cashUsdc?: number | null,
  points?: number | null,
): { primary: string; secondary?: string } {
  if (cashUsdc && cashUsdc > 0) {
    return {
      primary: formatUSDC(cashUsdc),
      secondary: points && points > 0 ? `+ ${formatPoints(points)}` : undefined,
    };
  }
  if (points && points > 0) {
    return {
      primary: formatPoints(points),
    };
  }
  return {
    primary: 'Free / Glory',
  };
}

/**
 * Calculate automated local fiat conversion from USDC
 */
export function getFiatConversion(
  usdcAmount: number,
  currencyOrCountryCode: string = 'DE',
  customRates?: Record<string, number>,
): FiatConversion {
  const code = (currencyOrCountryCode || 'DE').toUpperCase();
  const currency = COUNTRY_TO_CURRENCY[code] || (DEFAULT_FX_RATES[code] ? code : 'EUR');
  const rates = customRates || cachedFxRates?.rates || DEFAULT_FX_RATES;
  const rate = rates[currency] ?? DEFAULT_FX_RATES[currency] ?? 1.0;
  const meta = CURRENCY_METADATA[currency] || { symbol: currency, name: currency, locale: 'en-US' };

  const validAmount = isNaN(usdcAmount) || usdcAmount < 0 ? 0 : usdcAmount;
  const fiatAmount = validAmount * rate;

  // Pretty formatted with symbol and standard decimals
  const formattedFiat = `${meta.symbol} ${new Intl.NumberFormat(meta.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(fiatAmount)} ${currency}`;

  // Compact format for badges / small buttons (e.g. "≈ KSh 3.2k" or "≈ €25.00")
  let formattedFiatCompact = '';
  if (fiatAmount >= 1000000) {
    formattedFiatCompact = `≈ ${meta.symbol}${(fiatAmount / 1000000).toFixed(1)}M`;
  } else if (fiatAmount >= 10000) {
    formattedFiatCompact = `≈ ${meta.symbol}${(fiatAmount / 1000).toFixed(1)}k`;
  } else {
    formattedFiatCompact = `≈ ${meta.symbol}${new Intl.NumberFormat(meta.locale, {
      minimumFractionDigits: fiatAmount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(fiatAmount)}`;
  }

  return {
    usdcAmount: validAmount,
    fiatAmount,
    formattedFiat,
    formattedFiatCompact,
    rate,
    currency,
    symbol: meta.symbol,
    countryName: meta.name,
  };
}
