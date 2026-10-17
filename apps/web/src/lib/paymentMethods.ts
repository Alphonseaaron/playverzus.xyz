'use client';

export interface PaymentRail {
  id: string;
  name: string;
  category: 'instant_bank' | 'mobile_money' | 'card' | 'wallet' | 'crypto';
  icon: string;
  processingTime: string;
  fee: string;
  minAmount: number;
  maxAmount: number;
  supportsDeposit: boolean;
  supportsWithdrawal: boolean;
  description: string;
}

export interface CountryPaymentProfile {
  countryCode: string;
  countryName: string;
  currency: string;
  currencySymbol: string;
  flag: string;
  depositRails: PaymentRail[];
  withdrawalRails: PaymentRail[];
}

export const COUNTRY_PAYMENT_PROFILES: Record<string, CountryPaymentProfile> = {
  // Germany / Eurozone
  DE: {
    countryCode: 'DE',
    countryName: 'Germany',
    currency: 'EUR',
    currencySymbol: '€',
    flag: '🇩🇪',
    depositRails: [
      {
        id: 'sepa_instant',
        name: 'SEPA Instant Transfer',
        category: 'instant_bank',
        icon: '🏦',
        processingTime: 'Instant (< 10 sec)',
        fee: '0%',
        minAmount: 5,
        maxAmount: 2500,
        supportsDeposit: true,
        supportsWithdrawal: true,
        description: 'Direct bank transfer from Sparkasse, Deutsche Bank, N26, Commerzbank.',
      },
      {
        id: 'sofort_klarna',
        name: 'Sofort / Klarna',
        category: 'instant_bank',
        icon: '⚡',
        processingTime: 'Instant',
        fee: '0%',
        minAmount: 10,
        maxAmount: 1000,
        supportsDeposit: true,
        supportsWithdrawal: false,
        description: 'Instant online banking authorization.',
      },
      {
        id: 'paysafecard',
        name: 'Paysafecard Voucher',
        category: 'wallet',
        icon: '🎫',
        processingTime: 'Instant',
        fee: '0%',
        minAmount: 5,
        maxAmount: 250,
        supportsDeposit: true,
        supportsWithdrawal: false,
        description: 'Prepaid voucher PIN from retail stores or online.',
      },
      {
        id: 'crossmint_card',
        name: 'Credit / Debit Card (Crossmint USDC)',
        category: 'card',
        icon: '💳',
        processingTime: 'Instant',
        fee: '0%',
        minAmount: 5,
        maxAmount: 2500,
        supportsDeposit: true,
        supportsWithdrawal: false,
        description: 'Instant deposit via Apple Pay, Google Pay, Visa, or Mastercard into USDC.',
      },
      {
        id: 'visa_mc',
        name: 'Visa / Mastercard (Paysafe)',
        category: 'card',
        icon: '💳',
        processingTime: 'Instant',
        fee: '0%',
        minAmount: 5,
        maxAmount: 1500,
        supportsDeposit: true,
        supportsWithdrawal: true,
        description: 'Debit or credit card 3D-Secure protected checkout.',
      },
    ],
    withdrawalRails: [
      {
        id: 'sepa_payout',
        name: 'SEPA Direct Bank Wire',
        category: 'instant_bank',
        icon: '🏦',
        processingTime: 'Instant to 2 hours',
        fee: '0%',
        minAmount: 10,
        maxAmount: 5000,
        supportsDeposit: false,
        supportsWithdrawal: true,
        description: 'Funds sent directly to your IBAN with zero conversion loss.',
      },
      {
        id: 'visa_direct',
        name: 'Visa Fast Funds',
        category: 'card',
        icon: '💳',
        processingTime: '< 30 minutes',
        fee: '0%',
        minAmount: 15,
        maxAmount: 2000,
        supportsDeposit: false,
        supportsWithdrawal: true,
        description: 'Direct transfer to eligible Visa debit cards.',
      },
    ],
  },

  // United Kingdom
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    flag: '🇬🇧',
    depositRails: [
      {
        id: 'faster_payments',
        name: 'UK Faster Payments',
        category: 'instant_bank',
        icon: '🏦',
        processingTime: 'Instant',
        fee: '0%',
        minAmount: 5,
        maxAmount: 3000,
        supportsDeposit: true,
        supportsWithdrawal: true,
        description: 'Barclays, HSBC, Monzo, Revolut, Lloyds, NatWest.',
      },
      {
        id: 'revolut_pay',
        name: 'Revolut Pay',
        category: 'wallet',
        icon: '🔄',
        processingTime: 'Instant',
        fee: '0%',
        minAmount: 5,
        maxAmount: 2000,
        supportsDeposit: true,
        supportsWithdrawal: true,
        description: 'One-click app payment via Revolut balance.',
      },
      {
        id: 'visa_mc_uk',
        name: 'Debit Card (Visa / Mastercard)',
        category: 'card',
        icon: '💳',
        processingTime: 'Instant',
        fee: '0%',
        minAmount: 5,
        maxAmount: 1500,
        supportsDeposit: true,
        supportsWithdrawal: true,
        description: 'Standard UK bank debit card.',
      },
    ],
    withdrawalRails: [
      {
        id: 'faster_payments_payout',
        name: 'Faster Payments Payout',
        category: 'instant_bank',
        icon: '🏦',
        processingTime: 'Instant (< 15 mins)',
        fee: '0%',
        minAmount: 10,
        maxAmount: 5000,
        supportsDeposit: false,
        supportsWithdrawal: true,
        description: 'Instant transfer to UK Account Number and Sort Code.',
      },
    ],
  },

  // Kenya (M-PESA / East Africa)
  KE: {
    countryCode: 'KE',
    countryName: 'Kenya',
    currency: 'KES',
    currencySymbol: 'KSh',
    flag: '🇰🇪',
    depositRails: [
      {
        id: 'mpesa_stk',
        name: 'M-PESA Express (STK Push)',
        category: 'mobile_money',
        icon: '📱',
        processingTime: 'Instant (10 sec)',
        fee: '0%',
        minAmount: 100,
        maxAmount: 150000,
        supportsDeposit: true,
        supportsWithdrawal: true,
        description: 'Prompt sent to your Safaricom phone to enter your PIN.',
      },
      {
        id: 'crossmint_card',
        name: 'Card / Apple Pay (Crossmint USDC)',
        category: 'card',
        icon: '💳',
        processingTime: 'Instant',
        fee: '0%',
        minAmount: 500,
        maxAmount: 150000,
        supportsDeposit: true,
        supportsWithdrawal: false,
        description: 'Instant global deposit via Visa, Mastercard, or Apple Pay into USDC.',
      },
      {
        id: 'airtel_money_ke',
        name: 'Airtel Money',
        category: 'mobile_money',
        icon: '📶',
        processingTime: 'Instant',
        fee: '0%',
        minAmount: 100,
        maxAmount: 70000,
        supportsDeposit: true,
        supportsWithdrawal: true,
        description: 'Direct mobile wallet transfer.',
      },
      {
        id: 'card_ke',
        name: 'Visa / Mastercard (KES & EUR)',
        category: 'card',
        icon: '💳',
        processingTime: 'Instant',
        fee: '0%',
        minAmount: 500,
        maxAmount: 100000,
        supportsDeposit: true,
        supportsWithdrawal: false,
        description: 'KCB, Equity, Stanbic, NCBA local debit cards.',
      },
    ],
    withdrawalRails: [
      {
        id: 'mpesa_b2c',
        name: 'Instant M-PESA Payout',
        category: 'mobile_money',
        icon: '📱',
        processingTime: 'Instant (< 1 min)',
        fee: '0%',
        minAmount: 200,
        maxAmount: 150000,
        supportsDeposit: false,
        supportsWithdrawal: true,
        description: 'Cash deposited directly to your Safaricom mobile phone line.',
      },
    ],
  },

  // Brazil (PIX)
  BR: {
    countryCode: 'BR',
    countryName: 'Brazil',
    currency: 'BRL',
    currencySymbol: 'R$',
    flag: '🇧🇷',
    depositRails: [
      {
        id: 'pix_instant',
        name: 'PIX (QR Code & Copia e Cola)',
        category: 'instant_bank',
        icon: '💠',
        processingTime: 'Instant (< 5 sec)',
        fee: '0%',
        minAmount: 20,
        maxAmount: 10000,
        supportsDeposit: true,
        supportsWithdrawal: true,
        description: 'Instant central bank transfer via Nubank, Inter, Itaú, Bradesco.',
      },
      {
        id: 'boleto_br',
        name: 'Boleto Rápido',
        category: 'instant_bank',
        icon: '📄',
        processingTime: '1-2 hours',
        fee: '0%',
        minAmount: 50,
        maxAmount: 5000,
        supportsDeposit: true,
        supportsWithdrawal: false,
        description: 'Pay at any bank or via online banking app.',
      },
    ],
    withdrawalRails: [
      {
        id: 'pix_payout',
        name: 'Instant PIX Payout',
        category: 'instant_bank',
        icon: '💠',
        processingTime: 'Instant (< 2 mins)',
        fee: '0%',
        minAmount: 30,
        maxAmount: 15000,
        supportsDeposit: false,
        supportsWithdrawal: true,
        description: 'Sent directly to your CPF, CNPJ, Email or Phone PIX Key.',
      },
    ],
  },

  // United States & Global Fallback
  US: {
    countryCode: 'US',
    countryName: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    flag: '🇺🇸',
    depositRails: [
      {
        id: 'ach_instant',
        name: 'Instant ACH / Bank Connect',
        category: 'instant_bank',
        icon: '🏦',
        processingTime: 'Instant',
        fee: '0%',
        minAmount: 10,
        maxAmount: 5000,
        supportsDeposit: true,
        supportsWithdrawal: true,
        description: 'Plaid secure bank connection (Chase, BoA, Wells Fargo).',
      },
      {
        id: 'usdc_crypto',
        name: 'USDC (Solana / Base / Polygon)',
        category: 'crypto',
        icon: '🪙',
        processingTime: 'Instant (< 30 sec)',
        fee: '0%',
        minAmount: 5,
        maxAmount: 10000,
        supportsDeposit: true,
        supportsWithdrawal: true,
        description: 'Stablecoin deposit converted to competitive gaming ledger balance.',
      },
      {
        id: 'crossmint_card',
        name: 'Credit / Debit Card (Crossmint USDC)',
        category: 'card',
        icon: '💳',
        processingTime: 'Instant',
        fee: '0%',
        minAmount: 5,
        maxAmount: 2500,
        supportsDeposit: true,
        supportsWithdrawal: false,
        description: 'Instant deposit via Apple Pay, Google Pay, Visa, or Mastercard into USDC.',
      },
      {
        id: 'card_us',
        name: 'Visa / Mastercard / Amex (Paysafe)',
        category: 'card',
        icon: '💳',
        processingTime: 'Instant',
        fee: '0%',
        minAmount: 10,
        maxAmount: 2500,
        supportsDeposit: true,
        supportsWithdrawal: false,
        description: 'Standard debit card payment.',
      },
    ],
    withdrawalRails: [
      {
        id: 'ach_payout',
        name: 'Direct ACH Bank Deposit',
        category: 'instant_bank',
        icon: '🏦',
        processingTime: 'Same Day to 24 hrs',
        fee: '0%',
        minAmount: 20,
        maxAmount: 10000,
        supportsDeposit: false,
        supportsWithdrawal: true,
        description: 'Funds sent directly to your US checking or savings account.',
      },
      {
        id: 'usdc_payout',
        name: 'Instant USDC Payout',
        category: 'crypto',
        icon: '🪙',
        processingTime: 'Instant (< 1 min)',
        fee: '0%',
        minAmount: 10,
        maxAmount: 10000,
        supportsDeposit: false,
        supportsWithdrawal: true,
        description: 'Automated stablecoin transfer to your Solana or Base wallet.',
      },
    ],
  },
};

export const SUPPORTED_COUNTRY_LIST = [
  { code: 'DE', name: 'Germany / Eurozone', flag: '🇩🇪', currency: 'EUR' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
  { code: 'KE', name: 'Kenya (M-PESA)', flag: '🇰🇪', currency: 'KES' },
  { code: 'BR', name: 'Brazil (PIX)', flag: '🇧🇷', currency: 'BRL' },
  { code: 'US', name: 'United States & Global', flag: '🇺🇸', currency: 'USD' },
];

const DEFAULT_COUNTRY_PROFILE: CountryPaymentProfile = COUNTRY_PAYMENT_PROFILES['DE']!;

export function getPaymentProfileForCountry(countryCode?: string): CountryPaymentProfile {
  if (!countryCode) return DEFAULT_COUNTRY_PROFILE;
  const code = countryCode.toUpperCase();
  const profile = COUNTRY_PAYMENT_PROFILES[code];
  if (profile) {
    return profile;
  }
  return DEFAULT_COUNTRY_PROFILE;
}
