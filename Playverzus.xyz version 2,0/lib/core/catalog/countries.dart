/// Official ISO 3166-1 Global Country Dataset (1:1 parity with Playverzus v1.0 `@playverzus/core`).
class CountryInfo {
  final String code;
  final String code3;
  final String name;
  final String region;

  const CountryInfo({
    required this.code,
    required this.code3,
    required this.name,
    required this.region,
  });
}

const List<String> globalRegions = [
  'Africa',
  'Europe',
  'North America',
  'South America',
  'Asia-Pacific',
  'Middle East',
  'Oceania',
];

const List<CountryInfo> officialCountries = [
  // Africa
  CountryInfo(code: 'KE', code3: 'KEN', name: 'Kenya', region: 'Africa'),
  CountryInfo(code: 'NG', code3: 'NGA', name: 'Nigeria', region: 'Africa'),
  CountryInfo(code: 'ZA', code3: 'ZAF', name: 'South Africa', region: 'Africa'),
  CountryInfo(code: 'GH', code3: 'GHA', name: 'Ghana', region: 'Africa'),
  CountryInfo(code: 'UG', code3: 'UGA', name: 'Uganda', region: 'Africa'),
  CountryInfo(code: 'TZ', code3: 'TZA', name: 'Tanzania', region: 'Africa'),
  CountryInfo(code: 'RW', code3: 'RWA', name: 'Rwanda', region: 'Africa'),
  CountryInfo(code: 'ET', code3: 'ETH', name: 'Ethiopia', region: 'Africa'),
  CountryInfo(code: 'MA', code3: 'MAR', name: 'Morocco', region: 'Africa'),
  CountryInfo(code: 'DZ', code3: 'DZA', name: 'Algeria', region: 'Africa'),
  CountryInfo(code: 'TN', code3: 'TUN', name: 'Tunisia', region: 'Africa'),
  CountryInfo(code: 'CI', code3: 'CIV', name: 'Ivory Coast', region: 'Africa'),
  CountryInfo(code: 'SN', code3: 'SEN', name: 'Senegal', region: 'Africa'),
  CountryInfo(code: 'CM', code3: 'CMR', name: 'Cameroon', region: 'Africa'),
  CountryInfo(code: 'AO', code3: 'AGO', name: 'Angola', region: 'Africa'),
  CountryInfo(code: 'MU', code3: 'MUS', name: 'Mauritius', region: 'Africa'),
  CountryInfo(code: 'ZM', code3: 'ZMB', name: 'Zambia', region: 'Africa'),
  CountryInfo(code: 'ZW', code3: 'ZWE', name: 'Zimbabwe', region: 'Africa'),
  CountryInfo(code: 'BW', code3: 'BWA', name: 'Botswana', region: 'Africa'),
  CountryInfo(code: 'NA', code3: 'NAM', name: 'Namibia', region: 'Africa'),

  // Europe
  CountryInfo(code: 'GB', code3: 'GBR', name: 'United Kingdom', region: 'Europe'),
  CountryInfo(code: 'FR', code3: 'FRA', name: 'France', region: 'Europe'),
  CountryInfo(code: 'DE', code3: 'DEU', name: 'Germany', region: 'Europe'),
  CountryInfo(code: 'ES', code3: 'ESP', name: 'Spain', region: 'Europe'),
  CountryInfo(code: 'IT', code3: 'ITA', name: 'Italy', region: 'Europe'),
  CountryInfo(code: 'NL', code3: 'NLD', name: 'Netherlands', region: 'Europe'),
  CountryInfo(code: 'BE', code3: 'BEL', name: 'Belgium', region: 'Europe'),
  CountryInfo(code: 'SE', code3: 'SWE', name: 'Sweden', region: 'Europe'),
  CountryInfo(code: 'NO', code3: 'NOR', name: 'Norway', region: 'Europe'),
  CountryInfo(code: 'DK', code3: 'DNK', name: 'Denmark', region: 'Europe'),
  CountryInfo(code: 'FI', code3: 'FIN', name: 'Finland', region: 'Europe'),
  CountryInfo(code: 'PL', code3: 'POL', name: 'Poland', region: 'Europe'),
  CountryInfo(code: 'PT', code3: 'PRT', name: 'Portugal', region: 'Europe'),
  CountryInfo(code: 'CH', code3: 'CHE', name: 'Switzerland', region: 'Europe'),
  CountryInfo(code: 'AT', code3: 'AUT', name: 'Austria', region: 'Europe'),
  CountryInfo(code: 'IE', code3: 'IRL', name: 'Ireland', region: 'Europe'),
  CountryInfo(code: 'CZ', code3: 'CZE', name: 'Czech Republic', region: 'Europe'),
  CountryInfo(code: 'GR', code3: 'GRC', name: 'Greece', region: 'Europe'),
  CountryInfo(code: 'RO', code3: 'ROU', name: 'Romania', region: 'Europe'),
  CountryInfo(code: 'HU', code3: 'HUN', name: 'Hungary', region: 'Europe'),
  CountryInfo(code: 'UA', code3: 'UKR', name: 'Ukraine', region: 'Europe'),
  CountryInfo(code: 'HR', code3: 'HRV', name: 'Croatia', region: 'Europe'),
  CountryInfo(code: 'RS', code3: 'SRB', name: 'Serbia', region: 'Europe'),
  CountryInfo(code: 'BG', code3: 'BGR', name: 'Bulgaria', region: 'Europe'),
  CountryInfo(code: 'SK', code3: 'SVK', name: 'Slovakia', region: 'Europe'),
  CountryInfo(code: 'SI', code3: 'SVN', name: 'Slovenia', region: 'Europe'),
  CountryInfo(code: 'LT', code3: 'LTU', name: 'Lithuania', region: 'Europe'),
  CountryInfo(code: 'LV', code3: 'LVA', name: 'Latvia', region: 'Europe'),
  CountryInfo(code: 'EE', code3: 'EST', name: 'Estonia', region: 'Europe'),
  CountryInfo(code: 'CY', code3: 'CYP', name: 'Cyprus', region: 'Europe'),
  CountryInfo(code: 'LU', code3: 'LUX', name: 'Luxembourg', region: 'Europe'),
  CountryInfo(code: 'MT', code3: 'MLT', name: 'Malta', region: 'Europe'),
  CountryInfo(code: 'IS', code3: 'ISL', name: 'Iceland', region: 'Europe'),
  CountryInfo(code: 'AL', code3: 'ALB', name: 'Albania', region: 'Europe'),
  CountryInfo(code: 'BA', code3: 'BIH', name: 'Bosnia and Herzegovina', region: 'Europe'),
  CountryInfo(code: 'MK', code3: 'MKD', name: 'North Macedonia', region: 'Europe'),
  CountryInfo(code: 'MD', code3: 'MDA', name: 'Moldova', region: 'Europe'),
  CountryInfo(code: 'ME', code3: 'MNE', name: 'Montenegro', region: 'Europe'),
  CountryInfo(code: 'XK', code3: 'XKX', name: 'Kosovo', region: 'Europe'),

  // North America
  CountryInfo(code: 'US', code3: 'USA', name: 'United States', region: 'North America'),
  CountryInfo(code: 'CA', code3: 'CAN', name: 'Canada', region: 'North America'),
  CountryInfo(code: 'MX', code3: 'MEX', name: 'Mexico', region: 'North America'),
  CountryInfo(code: 'CR', code3: 'CRI', name: 'Costa Rica', region: 'North America'),
  CountryInfo(code: 'PA', code3: 'PAN', name: 'Panama', region: 'North America'),
  CountryInfo(code: 'DO', code3: 'DOM', name: 'Dominican Republic', region: 'North America'),
  CountryInfo(code: 'PR', code3: 'PRI', name: 'Puerto Rico', region: 'North America'),
  CountryInfo(code: 'JM', code3: 'JAM', name: 'Jamaica', region: 'North America'),
  CountryInfo(code: 'TT', code3: 'TTO', name: 'Trinidad and Tobago', region: 'North America'),
  CountryInfo(code: 'GT', code3: 'GTM', name: 'Guatemala', region: 'North America'),
  CountryInfo(code: 'HN', code3: 'HND', name: 'Honduras', region: 'North America'),
  CountryInfo(code: 'SV', code3: 'SLV', name: 'El Salvador', region: 'North America'),
  CountryInfo(code: 'NI', code3: 'NIC', name: 'Nicaragua', region: 'North America'),
  CountryInfo(code: 'BS', code3: 'BHS', name: 'Bahamas', region: 'North America'),
  CountryInfo(code: 'BB', code3: 'BRB', name: 'Barbados', region: 'North America'),

  // South America
  CountryInfo(code: 'BR', code3: 'BRA', name: 'Brazil', region: 'South America'),
  CountryInfo(code: 'AR', code3: 'ARG', name: 'Argentina', region: 'South America'),
  CountryInfo(code: 'CL', code3: 'CHL', name: 'Chile', region: 'South America'),
  CountryInfo(code: 'CO', code3: 'COL', name: 'Colombia', region: 'South America'),
  CountryInfo(code: 'PE', code3: 'PER', name: 'Peru', region: 'South America'),
  CountryInfo(code: 'UY', code3: 'URY', name: 'Uruguay', region: 'South America'),
  CountryInfo(code: 'PY', code3: 'PRY', name: 'Paraguay', region: 'South America'),
  CountryInfo(code: 'EC', code3: 'ECU', name: 'Ecuador', region: 'South America'),
  CountryInfo(code: 'BO', code3: 'BOL', name: 'Bolivia', region: 'South America'),
  CountryInfo(code: 'VE', code3: 'VEN', name: 'Venezuela', region: 'South America'),

  // Asia-Pacific & Oceania
  CountryInfo(code: 'JP', code3: 'JPN', name: 'Japan', region: 'Asia-Pacific'),
  CountryInfo(code: 'KR', code3: 'KOR', name: 'South Korea', region: 'Asia-Pacific'),
  CountryInfo(code: 'SG', code3: 'SGP', name: 'Singapore', region: 'Asia-Pacific'),
  CountryInfo(code: 'IN', code3: 'IND', name: 'India', region: 'Asia-Pacific'),
  CountryInfo(code: 'ID', code3: 'IDN', name: 'Indonesia', region: 'Asia-Pacific'),
  CountryInfo(code: 'PH', code3: 'PHL', name: 'Philippines', region: 'Asia-Pacific'),
  CountryInfo(code: 'MY', code3: 'MYS', name: 'Malaysia', region: 'Asia-Pacific'),
  CountryInfo(code: 'TH', code3: 'THA', name: 'Thailand', region: 'Asia-Pacific'),
  CountryInfo(code: 'VN', code3: 'VNM', name: 'Vietnam', region: 'Asia-Pacific'),
  CountryInfo(code: 'TW', code3: 'TWN', name: 'Taiwan', region: 'Asia-Pacific'),
  CountryInfo(code: 'HK', code3: 'HKG', name: 'Hong Kong', region: 'Asia-Pacific'),
  CountryInfo(code: 'CN', code3: 'CHN', name: 'China', region: 'Asia-Pacific'),
  CountryInfo(code: 'PK', code3: 'PAK', name: 'Pakistan', region: 'Asia-Pacific'),
  CountryInfo(code: 'BD', code3: 'BGD', name: 'Bangladesh', region: 'Asia-Pacific'),
  CountryInfo(code: 'LK', code3: 'LKA', name: 'Sri Lanka', region: 'Asia-Pacific'),
  CountryInfo(code: 'KZ', code3: 'KAZ', name: 'Kazakhstan', region: 'Asia-Pacific'),
  CountryInfo(code: 'UZ', code3: 'UZB', name: 'Uzbekistan', region: 'Asia-Pacific'),
  CountryInfo(code: 'MN', code3: 'MNG', name: 'Mongolia', region: 'Asia-Pacific'),
  CountryInfo(code: 'AU', code3: 'AUS', name: 'Australia', region: 'Oceania'),
  CountryInfo(code: 'NZ', code3: 'NZL', name: 'New Zealand', region: 'Oceania'),

  // Middle East
  CountryInfo(code: 'AE', code3: 'ARE', name: 'United Arab Emirates', region: 'Middle East'),
  CountryInfo(code: 'SA', code3: 'SAU', name: 'Saudi Arabia', region: 'Middle East'),
  CountryInfo(code: 'QA', code3: 'QAT', name: 'Qatar', region: 'Middle East'),
  CountryInfo(code: 'KW', code3: 'KWT', name: 'Kuwait', region: 'Middle East'),
  CountryInfo(code: 'BH', code3: 'BHR', name: 'Bahrain', region: 'Middle East'),
  CountryInfo(code: 'OM', code3: 'OMN', name: 'Oman', region: 'Middle East'),
  CountryInfo(code: 'TR', code3: 'TUR', name: 'Turkey', region: 'Middle East'),
  CountryInfo(code: 'IL', code3: 'ISR', name: 'Israel', region: 'Middle East'),
  CountryInfo(code: 'JO', code3: 'JOR', name: 'Jordan', region: 'Middle East'),
  CountryInfo(code: 'LB', code3: 'LBN', name: 'Lebanon', region: 'Middle East'),
  CountryInfo(code: 'EG', code3: 'EGY', name: 'Egypt', region: 'Middle East'),
  CountryInfo(code: 'IQ', code3: 'IRQ', name: 'Iraq', region: 'Middle East'),
];

CountryInfo? findCountryByCode(String? raw) {
  if (raw == null || raw.trim().isEmpty) return null;
  final upper = raw.trim().toUpperCase();
  for (final c in officialCountries) {
    if (c.code == upper || c.code3 == upper || c.name.toUpperCase() == upper) {
      return c;
    }
  }
  if (RegExp(r'^[A-Z]{2}$').hasMatch(upper)) {
    return CountryInfo(code: upper, code3: upper, name: upper, region: 'Global');
  }
  return null;
}

List<CountryInfo> searchOfficialCountries(String query, {String region = 'All'}) {
  final q = query.trim().toLowerCase();
  return officialCountries.where((c) {
    if (region != 'All' && c.region != region) return false;
    if (q.isEmpty) return true;
    return c.name.toLowerCase().contains(q) ||
        c.code.toLowerCase().contains(q) ||
        c.code3.toLowerCase().contains(q) ||
        c.region.toLowerCase().contains(q);
  }).toList();
}
