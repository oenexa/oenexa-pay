import { describe, it, expect } from 'vitest';
import { FiatCurrencyRegistry } from '../registry/FiatCurrencyRegistry.js';

describe('ISO 4217 World Fiat Currency & Clearing Registry', () => {
  const registry = FiatCurrencyRegistry.getInstance();

  it('contains major and secondary global currencies', () => {
    expect(registry.getTotalCount()).toBeGreaterThanOrEqual(50);

    const eur = registry.find('EUR');
    expect(eur?.name).toBe('Euro');
    expect(eur?.symbol).toBe('€');
    expect(eur?.decimals).toBe(2);

    const usd = registry.find('840'); // Numeric code
    expect(usd?.code).toBe('USD');
    expect(usd?.symbol).toBe('$');
  });

  it('handles standard 2-decimal fiat currencies (USD, EUR, GBP)', () => {
    const minorUnits = registry.toMinorUnits('150.75', 'USD');
    expect(minorUnits).toBe(15075n);

    const formatted = registry.formatMinorUnits(15075n, 'USD');
    expect(formatted).toBe('$150.75');
  });

  it('handles 0-decimal fiat currencies (JPY, KRW, ISK, CLP)', () => {
    const minorUnits = registry.toMinorUnits(5000, 'JPY');
    expect(minorUnits).toBe(5000n);

    const formatted = registry.formatMinorUnits(5000n, 'JPY');
    expect(formatted).toBe('¥5000');
  });

  it('handles 3-decimal Middle Eastern currencies (BHD, KWD, OMR)', () => {
    const minorUnits = registry.toMinorUnits('2.500', 'BHD');
    expect(minorUnits).toBe(2500n);

    const formatted = registry.formatMinorUnits(2500n, 'BHD');
    expect(formatted).toBe('BD2.500');
  });

  it('verifies regional clearing rails (SEPA, FEDWIRE, PIX, UPI)', () => {
    expect(registry.supportsRail('EUR', 'SEPA')).toBe(true);
    expect(registry.supportsRail('USD', 'FEDWIRE')).toBe(true);
    expect(registry.supportsRail('BRL', 'PIX')).toBe(true);
    expect(registry.supportsRail('INR', 'UPI')).toBe(true);
    expect(registry.supportsRail('USD', 'SEPA')).toBe(false);
  });

  it('validates currency existence and rejects invalid codes', () => {
    expect(registry.isValid('USD')).toBe(true);
    expect(registry.isValid('EUR')).toBe(true);
    expect(registry.isValid('XYZ_FAKE')).toBe(false);
  });
});
