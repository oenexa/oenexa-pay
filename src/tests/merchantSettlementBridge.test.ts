import { describe, it, expect } from 'vitest';
import { MerchantSettlementLedgerBridge } from '../service/MerchantSettlementLedgerBridge.js';
import type { SettlementRecord } from '../domain/types.js';

describe('MerchantSettlementLedgerBridge Double-Entry Suite', () => {
  const bridge = new MerchantSettlementLedgerBridge();

  it('constructs balanced double-entry postings for fiat SEPA settlement', () => {
    const settlement: SettlementRecord = {
      id: 'set_12345',
      intentId: 'pi_test_sepa_1',
      merchantId: 'merch_corp_global',
      grossAmount: '1000.0000',
      feeAmount: '15.0000', // 1.5% fee
      netAmount: '985.0000',
      currency: 'EUR',
      rail: 'SEPA_INSTANT',
      txReference: 'TX_SEPA_EUR_9921',
      settledAt: new Date().toISOString(),
    };

    const journal = bridge.constructSettlementJournal(settlement);

    expect(journal.settlementId).toBe('set_12345');
    expect(journal.postings.length).toBe(3);

    // Asset account is 1301 (Fiat clearing)
    const debit = journal.postings.find((p) => p.direction === 'DEBIT');
    expect(debit?.accountCode).toBe('1301');
    expect(debit?.amount).toBe('1000.0000');

    // Merchant credit is 2101
    const merchantCredit = journal.postings.find((p) => p.direction === 'CREDIT' && p.accountCode === '2101');
    expect(merchantCredit?.amount).toBe('985.0000');
    expect(merchantCredit?.merchantId).toBe('merch_corp_global');

    // Revenue fee is 4102
    const feeCredit = journal.postings.find((p) => p.direction === 'CREDIT' && p.accountCode === '4102');
    expect(feeCredit?.amount).toBe('15.0000');
  });

  it('throws an error if gross amount does not equal net + fee', () => {
    const corruptSettlement: SettlementRecord = {
      id: 'set_corrupt',
      intentId: 'pi_bad',
      merchantId: 'merch_1',
      grossAmount: '1000.0000',
      feeAmount: '10.0000',
      netAmount: '900.0000', // Missing 90 EUR
      currency: 'EUR',
      rail: 'SEPA_INSTANT',
      txReference: 'TX_SEPA_CORRUPT',
      settledAt: new Date().toISOString(),
    };

    expect(() => {
      bridge.constructSettlementJournal(corruptSettlement);
    }).toThrow(/Accounting discrepancy/);
  });
});
