/**
 * ISO 4217 Global Secondary World Fiat Currencies
 * Compliance: Law 7 (< 385 LOC)
 */

import type { FiatCurrencyRecord } from './fiatMajor.js';

export const FIAT_SECONDARY: FiatCurrencyRecord[] = [
  // Europe Non-Euro
  { code: 'PLN', numeric: '985', name: 'Polish Zloty', symbol: 'zł', decimals: 2, countryAlpha2: 'PL', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'CZK', numeric: '203', name: 'Czech Koruna', symbol: 'Kč', decimals: 2, countryAlpha2: 'CZ', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'HUF', numeric: '348', name: 'Hungarian Forint', symbol: 'Ft', decimals: 2, countryAlpha2: 'HU', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'RON', numeric: '946', name: 'Romanian Leu', symbol: 'lei', decimals: 2, countryAlpha2: 'RO', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'BGN', numeric: '975', name: 'Bulgarian Lev', symbol: 'лв', decimals: 2, countryAlpha2: 'BG', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'ISK', numeric: '352', name: 'Icelandic Krona', symbol: 'kr', decimals: 0, countryAlpha2: 'IS', paymentRails: ['SWIFT', 'CARDS'] },

  // Middle East & North Africa
  { code: 'QAR', numeric: '634', name: 'Qatari Riyal', symbol: 'QR', decimals: 2, countryAlpha2: 'QA', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'KWD', numeric: '414', name: 'Kuwaiti Dinar', symbol: 'KD', decimals: 3, countryAlpha2: 'KW', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'BHD', numeric: '048', name: 'Bahraini Dinar', symbol: 'BD', decimals: 3, countryAlpha2: 'BH', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'OMR', numeric: '512', name: 'Omani Rial', symbol: 'RO', decimals: 3, countryAlpha2: 'OM', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'JOD', numeric: '400', name: 'Jordanian Dinar', symbol: 'JD', decimals: 3, countryAlpha2: 'JO', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'ILS', numeric: '376', name: 'Israeli New Shekel', symbol: '₪', decimals: 2, countryAlpha2: 'IL', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'EGP', numeric: '818', name: 'Egyptian Pound', symbol: 'E£', decimals: 2, countryAlpha2: 'EG', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'MAD', numeric: '504', name: 'Moroccan Dirham', symbol: 'MAD', decimals: 2, countryAlpha2: 'MA', paymentRails: ['SWIFT', 'CARDS'] },

  // Latin America
  { code: 'CLP', numeric: '152', name: 'Chilean Peso', symbol: 'CLP$', decimals: 0, countryAlpha2: 'CL', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'COP', numeric: '170', name: 'Colombian Peso', symbol: 'COL$', decimals: 2, countryAlpha2: 'CO', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'PEN', numeric: '604', name: 'Peruvian Sol', symbol: 'S/', decimals: 2, countryAlpha2: 'PE', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'UYU', numeric: '858', name: 'Uruguayan Peso', symbol: '$U', decimals: 2, countryAlpha2: 'UY', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'CRC', numeric: '188', name: 'Costa Rican Colon', symbol: '₡', decimals: 2, countryAlpha2: 'CR', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'DOP', numeric: '214', name: 'Dominican Peso', symbol: 'RD$', decimals: 2, countryAlpha2: 'DO', paymentRails: ['SWIFT', 'CARDS'] },

  // Asia Pacific & Africa
  { code: 'THB', numeric: '764', name: 'Thai Baht', symbol: '฿', decimals: 2, countryAlpha2: 'TH', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'MYR', numeric: '458', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2, countryAlpha2: 'MY', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'IDR', numeric: '360', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 2, countryAlpha2: 'ID', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'PHP', numeric: '608', name: 'Philippine Peso', symbol: '₱', decimals: 2, countryAlpha2: 'PH', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'VND', numeric: '704', name: 'Vietnamese Dong', symbol: '₫', decimals: 0, countryAlpha2: 'VN', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'TWD', numeric: '901', name: 'New Taiwan Dollar', symbol: 'NT$', decimals: 2, countryAlpha2: 'TW', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'KZT', numeric: '398', name: 'Kazakhstani Tenge', symbol: '₸', decimals: 2, countryAlpha2: 'KZ', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'NGN', numeric: '566', name: 'Nigerian Naira', symbol: '₦', decimals: 2, countryAlpha2: 'NG', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'KES', numeric: '404', name: 'Kenyan Shilling', symbol: 'KSh', decimals: 2, countryAlpha2: 'KE', paymentRails: ['SWIFT', 'CARDS'] },
  { code: 'GHS', numeric: '936', name: 'Ghanaian Cedi', symbol: 'GH₵', decimals: 2, countryAlpha2: 'GH', paymentRails: ['SWIFT', 'CARDS'] },
];
