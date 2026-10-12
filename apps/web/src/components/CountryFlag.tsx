'use client';

import { useState } from 'react';
import { COUNTRIES, getCountryByCode, type Country } from '@playverzus/core';

const GLOBAL_ESPORTS_POOL = [
  'DE', 'FR', 'GB', 'US', 'BR', 'ES', 'NL', 'SE',
  'KR', 'JP', 'NG', 'CA', 'PL', 'IT', 'AU', 'ZA',
  'KE', 'MX', 'AR', 'PT', 'TR', 'AE', 'IN', 'NO',
  'DK', 'CH', 'BE', 'FI',
];

const REGION_TO_COUNTRY: Record<string, string> = {
  EUROPE: 'DE',
  'NORTH AMERICA': 'US',
  'SOUTH AMERICA': 'BR',
  'ASIA-PACIFIC': 'KR',
  'MIDDLE EAST': 'AE',
  AFRICA: 'NG',
  OCEANIA: 'AU',
  GLOBAL: 'DE',
  WORLDWIDE: 'US',
};

/**
 * Deterministic hash from a string (e.g. userId or username) to a stable country code
 */
export function getDeterministicCountryCode(seed: string | number): string {
  const str = String(seed || 'verzus');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return GLOBAL_ESPORTS_POOL[hash % GLOBAL_ESPORTS_POOL.length] ?? 'DE';
}

/**
 * Resolves any country code, 3-letter code, country name, or region into a valid 2-letter ISO code.
 * Falls back deterministically using `fallbackSeed` if provided.
 */
export function resolveCountryCode(
  input?: string | null,
  fallbackSeed?: string | number,
): string {
  if (input && typeof input === 'string') {
    const cleaned = input.trim().toUpperCase();
    if (cleaned.length > 0 && cleaned !== 'GLOBAL' && cleaned !== 'WORLDWIDE' && cleaned !== 'ALL') {
      // 1. Direct lookup by 2-letter or 3-letter code
      const byCode = getCountryByCode(cleaned);
      if (byCode) return byCode.code;

      // 2. Check if it's a valid 2-letter ISO code not in subset
      if (/^[A-Z]{2}$/.test(cleaned)) {
        return cleaned;
      }

      // 3. Check if it matches a region name
      const regionMatch = REGION_TO_COUNTRY[cleaned];
      if (regionMatch) {
        return regionMatch;
      }

      // 4. Match by full country name
      const byName = COUNTRIES.find((c) => c.name.toUpperCase() === cleaned);
      if (byName) return byName.code;
    }
  }

  if (fallbackSeed !== undefined && fallbackSeed !== null && String(fallbackSeed).trim() !== '') {
    return getDeterministicCountryCode(fallbackSeed);
  }

  return 'DE';
}

export function resolveCountryInfo(
  input?: string | null,
  fallbackSeed?: string | number,
): Country {
  const code = resolveCountryCode(input, fallbackSeed);
  return (
    getCountryByCode(code) || {
      code,
      code3: code,
      name: code,
      flag: '🌍',
      region: 'Europe',
    }
  );
}

export interface CountryFlagProps {
  code?: string | null;
  fallbackSeed?: string | number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showName?: boolean;
  showCode?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<'xs' | 'sm' | 'md' | 'lg', { img: string; text: string }> = {
  xs: { img: 'w-3.5 h-2.5 rounded-[2px]', text: 'text-[10px]' },
  sm: { img: 'w-4 h-3 rounded-[2px]', text: 'text-xs' },
  md: { img: 'w-5 h-3.5 rounded-[3px]', text: 'text-xs' },
  lg: { img: 'w-6 h-4 rounded-[3px]', text: 'text-sm' },
};

export function CountryFlag({
  code,
  fallbackSeed,
  size = 'sm',
  showName = false,
  showCode = false,
  className = '',
}: CountryFlagProps) {
  const [imgError, setImgError] = useState(false);

  // If neither code nor fallbackSeed is provided, don't render
  if (!code && (fallbackSeed === undefined || fallbackSeed === null || fallbackSeed === '')) {
    return null;
  }

  const country = resolveCountryInfo(code, fallbackSeed);
  const isoLower = country.code.toLowerCase();
  const dimensions = SIZE_CLASSES[size] || SIZE_CLASSES.sm;

  return (
    <span
      className={`inline-flex items-center gap-1.5 align-middle flex-shrink-0 ${className}`}
      title={`${country.name} (${country.code})`}
    >
      {!imgError ? (
        <img
          src={`https://flagcdn.com/w40/${isoLower}.png`}
          srcSet={`https://flagcdn.com/w80/${isoLower}.png 2x`}
          alt={`${country.name} flag`}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className={`${dimensions.img} object-cover ring-1 ring-white/15 shadow-xs flex-shrink-0 inline-block`}
        />
      ) : (
        <span className="inline-flex items-center justify-center px-1 py-0.5 rounded bg-secondary text-[9px] font-mono font-bold text-foreground border border-border leading-none">
          {country.code}
        </span>
      )}

      {showName && (
        <span className={`${dimensions.text} font-medium text-foreground truncate`}>
          {country.name}
        </span>
      )}

      {showCode && (
        <span className="text-[10px] font-mono text-muted-foreground uppercase">
          ({country.code})
        </span>
      )}
    </span>
  );
}
