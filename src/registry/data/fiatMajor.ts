/**
 * ISO 4217 Major World Fiat Currencies
 * Compliance: Law 7 (< 385 LOC)
 */

export interface FiatCurrencyRecord {
  code: string;
  numeric: string;
  name: string;
  symbol: string;
  decimals: number;
  countryAlpha2: string;
  paymentRails: ('SEPA' | 'SWIFT' | 'FEDWIRE' | 'ACH' | 'FASTER_PAYMENTS' | 'PIX' | 'UPI' | 'CARDS')[];
}

export const FIAT_MAJOR: FiatCurrencyRecord[] = [
  { code: 'USD', numeric: '840', name: 'United States Dollar', symbol: '$', decimals: 2, countryAlpha2: 'US', paymentRails: ['FEDWIRE', 'ACH', 'SWIFT', 'CARDS'] },
  { code: 'EUR', numeric: '978', name: 'Euro', symbol: '€', decimals: 2, countryAlpha2: 'EU', paymentRails: ['SEPA', 'SWIFT', 'CARDS'] },
  { code: 'GBP', numeric: '826', name: 'British Pound Sterling', symbol: '£', decimals: 2, countryAlpha2: 'GB', paymentRails: ['FASTER_PAYMENTS', 'SWIFT', 'CARDS'] },
  { code: 'JPY', numeric: '392', name: 'Japanese Yen', symbol: '¥', decimals: 0, countryAlpha2: 'JP', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'CHF', numeric: '756', name: 'Swiss Franc', symbol: 'CHF', decimals: 2, countryAlpha2: 'CH', paymentRails: ['SWIFT', 'SEPA', 'CARDS'] },
  { code: 'CAD', numeric: '124', name: 'Canadian Dollar', symbol: 'CA$', decimals: 2, countryAlpha2: 'CA', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'AUD', numeric: '036', name: 'Australian Dollar', symbol: 'A$', decimals: 2, countryAlpha2: 'AU', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'NZD', numeric: '554', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2, countryAlpha2: 'NZ', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'CNY', numeric: '156', name: 'Chinese Yuan Renminbi', symbol: '¥', decimals: 2, countryAlpha2: 'CN', paymentRails: ['SWIFT'] },
  { code: 'INR', numeric: '356', name: 'Indian Rupee', symbol: '₹', decimals: 2, countryAlpha2: 'IN', paymentRails: ['UPI', 'SWIFT', 'CARDS'] },
  { code: 'BRL', numeric: '986', name: 'Brazilian Real', symbol: 'R$', decimals: 2, countryAlpha2: 'BR', paymentRails: ['PIX', 'SWIFT', 'CARDS'] },
  { code: 'AED', numeric: '784', name: 'United Arab Emirates Dirham', symbol: 'AED', decimals: 2, countryAlpha2: 'AE', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'SGD', numeric: '702', name: 'Singapore Dollar', symbol: 'S$', decimals: 2, countryAlpha2: 'SG', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'HKD', numeric: '344', name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2, countryAlpha2: 'HK', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'KRW', numeric: '410', name: 'South Korean Won', symbol: '₩', decimals: 0, countryAlpha2: 'KR', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'MXN', numeric: '484', name: 'Mexican Peso', symbol: 'MX$', decimals: 2, countryAlpha2: 'MX', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'SAR', numeric: '682', name: 'Saudi Riyal', symbol: 'SAR', decimals: 2, countryAlpha2: 'SA', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'ZAR', numeric: '710', name: 'South African Rand', symbol: 'R', decimals: 2, countryAlpha2: 'ZA', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'SEK', numeric: '752', name: 'Swedish Krona', symbol: 'kr', decimals: 2, countryAlpha2: 'SE', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'NOK', numeric: '578', name: 'Norwegian Krone', symbol: 'kr', decimals: 2, countryAlpha2: 'NO', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'DKK', numeric: '208', name: 'Danish Krone', symbol: 'kr', decimals: 2, countryAlpha2: 'DK', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'TRY', numeric: '792', name: 'Turkish Lira', symbol: '₺', decimals: 2, countryAlpha2: 'TR', paymentRails: ['SWIFT', 'CARDS'] },
];
