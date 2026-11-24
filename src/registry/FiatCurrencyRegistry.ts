/**
 * FiatCurrencyRegistry — ISO 4217 World Currency & Clearing Rails Registry.
 * Features:
 * - ISO 4217 Alpha-3 and Numeric resolution
 * - Exact minor-unit conversion (handling 0, 2, and 3 decimal fiat systems)
 * - Country association and ISO 20022 clearing rail validation (SEPA, SWIFT, FEDWIRE, PIX, UPI)
 * Compliance: Law 7 (< 385 LOC).
 */

import { FIAT_MAJOR, type FiatCurrencyRecord } from './data/fiatMajor.js';
import { FIAT_SECONDARY } from './data/fiatSecondary.js';

export { type FiatCurrencyRecord } from './data/fiatMajor.js';

export class FiatCurrencyRegistry {
  private static instance: FiatCurrencyRegistry;
  private allCurrencies: FiatCurrencyRecord[] = [];
  private byCode = new Map<string, FiatCurrencyRecord>();
  private byNumeric = new Map<string, FiatCurrencyRecord>();

  constructor() {
    this.allCurrencies = [...FIAT_MAJOR, ...FIAT_SECONDARY];

    for (const c of this.allCurrencies) {
      this.byCode.set(c.code.toUpperCase(), c);
      this.byNumeric.set(c.numeric, c);
    }
  }

  public static getInstance(): FiatCurrencyRegistry {
    if (!FiatCurrencyRegistry.instance) {
      FiatCurrencyRegistry.instance = new FiatCurrencyRegistry();
    }
    return FiatCurrencyRegistry.instance;
  }

  public getAll(): FiatCurrencyRecord[] {
    return [...this.allCurrencies];
  }

  public getTotalCount(): number {
    return this.allCurrencies.length;
  }

  public find(codeOrNumeric: string): FiatCurrencyRecord | undefined {
    const trimmed = codeOrNumeric.trim();
    if (!trimmed) return undefined;

    if (/^\d{3}$/.test(trimmed)) {
      return this.byNumeric.get(trimmed);
    }
    return this.byCode.get(trimmed.toUpperCase());
  }

  public isValid(code: string): boolean {
    return this.byCode.has(code.toUpperCase());
  }

  /**
   * Converts human-readable decimal amount into integer minor units (cents, pips, satoshis)
   */
  public toMinorUnits(amount: number | string, currencyCode: string): bigint {
    const cur = this.find(currencyCode);
    if (!cur) throw new Error(`Unsupported currency code '${currencyCode}'`);

    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(num)) throw new Error(`Invalid amount '${amount}'`);

    const factor = Math.pow(10, cur.decimals);
    return BigInt(Math.round(num * factor));
  }

  /**
   * Formats minor units into human-readable string with proper currency symbol
   */
  public formatMinorUnits(minorUnits: bigint | number, currencyCode: string): string {
    const cur = this.find(currencyCode);
    if (!cur) throw new Error(`Unsupported currency code '${currencyCode}'`);

    const factor = Math.pow(10, cur.decimals);
    const floatVal = Number(minorUnits) / factor;
    return `${cur.symbol}${floatVal.toFixed(cur.decimals)}`;
  }

  public supportsRail(
    currencyCode: string,
    rail: 'SEPA' | 'SWIFT' | 'FEDWIRE' | 'ACH' | 'FASTER_PAYMENTS' | 'PIX' | 'UPI' | 'CARDS'
  ): boolean {
    const cur = this.find(currencyCode);
    if (!cur) return false;
    return cur.paymentRails.includes(rail);
  }
}
