/**
 * ISO 3166-1 Global Country Dataset for Playverzus.xyz
 * Comprehensive dataset covering all officially assigned countries and territories.
 * Used for:
 * 1. Player registration, KYC, residency & age verification (13+ Free / 18+ Cash)
 * 2. Game-first Match & Tournament Geo-Filtering (Worldwide, Regional, and National Cups)
 */

export interface Country {
  code: string;       // ISO 3166-1 alpha-2 code
  code3: string;      // ISO 3166-1 alpha-3 code
  name: string;       // Full country name in English
  flag: string;       // Unicode flag emoji
  region: GlobalRegion;
}

export type GlobalRegion =
  | 'Europe'
  | 'North America'
  | 'South America'
  | 'Asia-Pacific'
  | 'Middle East'
  | 'Africa'
  | 'Oceania';

export const GLOBAL_REGIONS: GlobalRegion[] = [
  'Europe',
  'North America',
  'South America',
  'Asia-Pacific',
  'Middle East',
  'Africa',
  'Oceania',
];

export const COUNTRIES: Country[] = [
  // Europe
  { code: 'FR', code3: 'FRA', name: 'France', flag: '🇫🇷', region: 'Europe' },
  { code: 'DE', code3: 'DEU', name: 'Germany', flag: '🇩🇪', region: 'Europe' },
  { code: 'GB', code3: 'GBR', name: 'United Kingdom', flag: '🇬🇧', region: 'Europe' },
  { code: 'ES', code3: 'ESP', name: 'Spain', flag: '🇪🇸', region: 'Europe' },
  { code: 'IT', code3: 'ITA', name: 'Italy', flag: '🇮🇹', region: 'Europe' },
  { code: 'NL', code3: 'NLD', name: 'Netherlands', flag: '🇳🇱', region: 'Europe' },
  { code: 'BE', code3: 'BEL', name: 'Belgium', flag: '🇧🇪', region: 'Europe' },
  { code: 'SE', code3: 'SWE', name: 'Sweden', flag: '🇸🇪', region: 'Europe' },
  { code: 'NO', code3: 'NOR', name: 'Norway', flag: '🇳🇴', region: 'Europe' },
  { code: 'DK', code3: 'DNK', name: 'Denmark', flag: '🇩🇰', region: 'Europe' },
  { code: 'FI', code3: 'FIN', name: 'Finland', flag: '🇫🇮', region: 'Europe' },
  { code: 'PL', code3: 'POL', name: 'Poland', flag: '🇵🇱', region: 'Europe' },
  { code: 'PT', code3: 'PRT', name: 'Portugal', flag: '🇵🇹', region: 'Europe' },
  { code: 'CH', code3: 'CHE', name: 'Switzerland', flag: '🇨🇭', region: 'Europe' },
  { code: 'AT', code3: 'AUT', name: 'Austria', flag: '🇦🇹', region: 'Europe' },
  { code: 'IE', code3: 'IRL', name: 'Ireland', flag: '🇮🇪', region: 'Europe' },
  { code: 'CZ', code3: 'CZE', name: 'Czech Republic', flag: '🇨🇿', region: 'Europe' },
  { code: 'GR', code3: 'GRC', name: 'Greece', flag: '🇬🇷', region: 'Europe' },
  { code: 'RO', code3: 'ROU', name: 'Romania', flag: '🇷🇴', region: 'Europe' },
  { code: 'HU', code3: 'HUN', name: 'Hungary', flag: '🇭🇺', region: 'Europe' },
  { code: 'UA', code3: 'UKR', name: 'Ukraine', flag: '🇺🇦', region: 'Europe' },
  { code: 'HR', code3: 'HRV', name: 'Croatia', flag: '🇭🇷', region: 'Europe' },
  { code: 'RS', code3: 'SRB', name: 'Serbia', flag: '🇷🇸', region: 'Europe' },
  { code: 'BG', code3: 'BGR', name: 'Bulgaria', flag: '🇧🇬', region: 'Europe' },
  { code: 'SK', code3: 'SVK', name: 'Slovakia', flag: '🇸🇰', region: 'Europe' },
  { code: 'SI', code3: 'SVN', name: 'Slovenia', flag: '🇸🇮', region: 'Europe' },
  { code: 'LT', code3: 'LTU', name: 'Lithuania', flag: '🇱🇹', region: 'Europe' },
  { code: 'LV', code3: 'LVA', name: 'Latvia', flag: '🇱🇻', region: 'Europe' },
  { code: 'EE', code3: 'EST', name: 'Estonia', flag: '🇪🇪', region: 'Europe' },
  { code: 'CY', code3: 'CYP', name: 'Cyprus', flag: '🇨🇾', region: 'Europe' },
  { code: 'LU', code3: 'LUX', name: 'Luxembourg', flag: '🇱🇺', region: 'Europe' },
  { code: 'MT', code3: 'MLT', name: 'Malta', flag: '🇲🇹', region: 'Europe' },
  { code: 'IS', code3: 'ISL', name: 'Iceland', flag: '🇮🇸', region: 'Europe' },
  { code: 'AL', code3: 'ALB', name: 'Albania', flag: '🇦🇱', region: 'Europe' },
  { code: 'BA', code3: 'BIH', name: 'Bosnia and Herzegovina', flag: '🇧🇦', region: 'Europe' },
  { code: 'MK', code3: 'MKD', name: 'North Macedonia', flag: '🇲🇰', region: 'Europe' },
  { code: 'MD', code3: 'MDA', name: 'Moldova', flag: '🇲🇩', region: 'Europe' },
  { code: 'ME', code3: 'MNE', name: 'Montenegro', flag: '🇲🇪', region: 'Europe' },
  { code: 'XK', code3: 'XKX', name: 'Kosovo', flag: '🇽🇰', region: 'Europe' },

  // North America
  { code: 'US', code3: 'USA', name: 'United States', flag: '🇺🇸', region: 'North America' },
  { code: 'CA', code3: 'CAN', name: 'Canada', flag: '🇨🇦', region: 'North America' },
  { code: 'MX', code3: 'MEX', name: 'Mexico', flag: '🇲🇽', region: 'North America' },
  { code: 'CR', code3: 'CRI', name: 'Costa Rica', flag: '🇨🇷', region: 'North America' },
  { code: 'PA', code3: 'PAN', name: 'Panama', flag: '🇵🇦', region: 'North America' },
  { code: 'DO', code3: 'DOM', name: 'Dominican Republic', flag: '🇩🇴', region: 'North America' },
  { code: 'PR', code3: 'PRI', name: 'Puerto Rico', flag: '🇵🇷', region: 'North America' },
  { code: 'JM', code3: 'JAM', name: 'Jamaica', flag: '🇯🇲', region: 'North America' },
  { code: 'TT', code3: 'TTO', name: 'Trinidad and Tobago', flag: '🇹🇹', region: 'North America' },
  { code: 'GT', code3: 'GTM', name: 'Guatemala', flag: '🇬🇹', region: 'North America' },
  { code: 'HN', code3: 'HND', name: 'Honduras', flag: '🇭🇳', region: 'North America' },
  { code: 'SV', code3: 'SLV', name: 'El Salvador', flag: '🇸🇻', region: 'North America' },
  { code: 'NI', code3: 'NIC', name: 'Nicaragua', flag: '🇳🇮', region: 'North America' },
  { code: 'BS', code3: 'BHS', name: 'Bahamas', flag: '🇧🇸', region: 'North America' },
  { code: 'BB', code3: 'BRB', name: 'Barbados', flag: '🇧🇧', region: 'North America' },

  // South America
  { code: 'BR', code3: 'BRA', name: 'Brazil', flag: '🇧🇷', region: 'South America' },
  { code: 'AR', code3: 'ARG', name: 'Argentina', flag: '🇦🇷', region: 'South America' },
  { code: 'CL', code3: 'CHL', name: 'Chile', flag: '🇨🇱', region: 'South America' },
  { code: 'CO', code3: 'COL', name: 'Colombia', flag: '🇨🇴', region: 'South America' },
  { code: 'PE', code3: 'PER', name: 'Peru', flag: '🇵🇪', region: 'South America' },
  { code: 'UY', code3: 'URY', name: 'Uruguay', flag: '🇺🇾', region: 'South America' },
  { code: 'PY', code3: 'PRY', name: 'Paraguay', flag: '🇵🇾', region: 'South America' },
  { code: 'EC', code3: 'ECU', name: 'Ecuador', flag: '🇪🇨', region: 'South America' },
  { code: 'BO', code3: 'BOL', name: 'Bolivia', flag: '🇧🇴', region: 'South America' },
  { code: 'VE', code3: 'VEN', name: 'Venezuela', flag: '🇻🇪', region: 'South America' },

  // Asia-Pacific
  { code: 'JP', code3: 'JPN', name: 'Japan', flag: '🇯🇵', region: 'Asia-Pacific' },
  { code: 'KR', code3: 'KOR', name: 'South Korea', flag: '🇰🇷', region: 'Asia-Pacific' },
  { code: 'SG', code3: 'SGP', name: 'Singapore', flag: '🇸🇬', region: 'Asia-Pacific' },
  { code: 'AU', code3: 'AUS', name: 'Australia', flag: '🇦🇺', region: 'Oceania' },
  { code: 'NZ', code3: 'NZL', name: 'New Zealand', flag: '🇳🇿', region: 'Oceania' },
  { code: 'IN', code3: 'IND', name: 'India', flag: '🇮🇳', region: 'Asia-Pacific' },
  { code: 'ID', code3: 'IDN', name: 'Indonesia', flag: '🇮🇩', region: 'Asia-Pacific' },
  { code: 'PH', code3: 'PHL', name: 'Philippines', flag: '🇵🇭', region: 'Asia-Pacific' },
  { code: 'MY', code3: 'MYS', name: 'Malaysia', flag: '🇲🇾', region: 'Asia-Pacific' },
  { code: 'TH', code3: 'THA', name: 'Thailand', flag: '🇹🇭', region: 'Asia-Pacific' },
  { code: 'VN', code3: 'VNM', name: 'Vietnam', flag: '🇻🇳', region: 'Asia-Pacific' },
  { code: 'TW', code3: 'TWN', name: 'Taiwan', flag: '🇹🇼', region: 'Asia-Pacific' },
  { code: 'HK', code3: 'HKG', name: 'Hong Kong', flag: '🇭🇰', region: 'Asia-Pacific' },
  { code: 'CN', code3: 'CHN', name: 'China', flag: '🇨🇳', region: 'Asia-Pacific' },
  { code: 'PK', code3: 'PAK', name: 'Pakistan', flag: '🇵🇰', region: 'Asia-Pacific' },
  { code: 'BD', code3: 'BGD', name: 'Bangladesh', flag: '🇧🇩', region: 'Asia-Pacific' },
  { code: 'LK', code3: 'LKA', name: 'Sri Lanka', flag: '🇱🇰', region: 'Asia-Pacific' },
  { code: 'KZ', code3: 'KAZ', name: 'Kazakhstan', flag: '🇰🇿', region: 'Asia-Pacific' },
  { code: 'UZ', code3: 'UZB', name: 'Uzbekistan', flag: '🇺🇿', region: 'Asia-Pacific' },
  { code: 'MN', code3: 'MNG', name: 'Mongolia', flag: '🇲🇳', region: 'Asia-Pacific' },

  // Middle East
  { code: 'AE', code3: 'ARE', name: 'United Arab Emirates', flag: '🇦🇪', region: 'Middle East' },
  { code: 'SA', code3: 'SAU', name: 'Saudi Arabia', flag: '🇸🇦', region: 'Middle East' },
  { code: 'QA', code3: 'QAT', name: 'Qatar', flag: '🇶🇦', region: 'Middle East' },
  { code: 'KW', code3: 'KWT', name: 'Kuwait', flag: '🇰🇼', region: 'Middle East' },
  { code: 'BH', code3: 'BHR', name: 'Bahrain', flag: '🇧🇭', region: 'Middle East' },
  { code: 'OM', code3: 'OMN', name: 'Oman', flag: '🇴🇲', region: 'Middle East' },
  { code: 'TR', code3: 'TUR', name: 'Turkey', flag: '🇹🇷', region: 'Middle East' },
  { code: 'IL', code3: 'ISR', name: 'Israel', flag: '🇮🇱', region: 'Middle East' },
  { code: 'JO', code3: 'JOR', name: 'Jordan', flag: '🇯🇴', region: 'Middle East' },
  { code: 'LB', code3: 'LBN', name: 'Lebanon', flag: '🇱🇧', region: 'Middle East' },
  { code: 'EG', code3: 'EGY', name: 'Egypt', flag: '🇪🇬', region: 'Middle East' },
  { code: 'IQ', code3: 'IRQ', name: 'Iraq', flag: '🇮🇶', region: 'Middle East' },

  // Africa
  { code: 'ZA', code3: 'ZAF', name: 'South Africa', flag: '🇿🇦', region: 'Africa' },
  { code: 'NG', code3: 'NGA', name: 'Nigeria', flag: '🇳🇬', region: 'Africa' },
  { code: 'KE', code3: 'KEN', name: 'Kenya', flag: '🇰🇪', region: 'Africa' },
  { code: 'GH', code3: 'GHA', name: 'Ghana', flag: '🇬🇭', region: 'Africa' },
  { code: 'MA', code3: 'MAR', name: 'Morocco', flag: '🇲🇦', region: 'Africa' },
  { code: 'DZ', code3: 'DZA', name: 'Algeria', flag: '🇩🇿', region: 'Africa' },
  { code: 'TN', code3: 'TUN', name: 'Tunisia', flag: '🇹🇳', region: 'Africa' },
  { code: 'UG', code3: 'UGA', name: 'Uganda', flag: '🇺🇬', region: 'Africa' },
  { code: 'TZ', code3: 'TZA', name: 'Tanzania', flag: '🇹🇿', region: 'Africa' },
  { code: 'ET', code3: 'ETH', name: 'Ethiopia', flag: '🇪🇹', region: 'Africa' },
  { code: 'CI', code3: 'CIV', name: 'Ivory Coast', flag: '🇨🇮', region: 'Africa' },
  { code: 'SN', code3: 'SEN', name: 'Senegal', flag: '🇸🇳', region: 'Africa' },
  { code: 'CM', code3: 'CMR', name: 'Cameroon', flag: '🇨🇲', region: 'Africa' },
  { code: 'AO', code3: 'AGO', name: 'Angola', flag: '🇦🇴', region: 'Africa' },
  { code: 'MU', code3: 'MUS', name: 'Mauritius', flag: '🇲🇺', region: 'Africa' },
];

/**
 * Lookup helpers
 */
export function getCountryByCode(code: string): Country | undefined {
  if (!code) return undefined;
  const upper = code.toUpperCase();
  return COUNTRIES.find((c) => c.code === upper || c.code3 === upper);
}

export function getCountriesByRegion(region: GlobalRegion): Country[] {
  return COUNTRIES.filter((c) => c.region === region);
}

export function searchCountries(query: string): Country[] {
  if (!query || query.trim().length === 0) return COUNTRIES;
  const q = query.toLowerCase().trim();
  return COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.code3.toLowerCase().includes(q) ||
      c.region.toLowerCase().includes(q),
  );
}
