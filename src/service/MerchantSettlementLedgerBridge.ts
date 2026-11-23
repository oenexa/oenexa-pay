import crypto from 'node:crypto';
import type { SettlementRecord } from '../domain/types.js';

export interface PayLedgerPosting {
  accountCode: string; // 1301 (Fiat Bank), 1101 (Hot Vault), 2101 (Merchant Liability), 4102 (Pay Fee Revenue)
  merchantId?: string;
  asset: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: string;
}

export interface PaymentSettlementJournal {
  journalId: string;
  settlementId: string;
  intentId: string;
  postings: PayLedgerPosting[];
  timestamp: string;
}

export class MerchantSettlementLedgerBridge {
  public constructSettlementJournal(settlement: SettlementRecord): PaymentSettlementJournal {
    const gross = parseFloat(settlement.grossAmount);
    const fee = parseFloat(settlement.feeAmount);
    const net = parseFloat(settlement.netAmount);

    if (Math.abs(gross - (net + fee)) > 0.0001) {
      throw new Error(`Accounting discrepancy in settlement ${settlement.id}: gross != net + fee`);
    }

    const postings: PayLedgerPosting[] = [];
    const asset = settlement.currency;

    // 1. Inflow from External Rail (SEPA / Swift / On-Chain)
    // Asset clearing: Debit 1301 (Bank Clearing) or 1101 (Crypto MPC Vault)
    const assetAccount = asset === 'EUR' || asset === 'USD' ? '1301' : '1101';
    postings.push({
      accountCode: assetAccount,
      asset,
      direction: 'DEBIT',
      amount: gross.toFixed(4),
    });

    // 2. Merchant Liability Incurred
    // Credit 2101 (Client/Merchant Balance Liability increases by net amount)
    postings.push({
      accountCode: '2101',
      merchantId: settlement.merchantId,
      asset,
      direction: 'CREDIT',
      amount: net.toFixed(4),
    });

    // 3. Platform Merchant Processing Fee Revenue
    // Credit 4102 (Pay Merchant Fee Revenue increases by fee amount)
    postings.push({
      accountCode: '4102',
      asset,
      direction: 'CREDIT',
      amount: fee.toFixed(4),
    });

    // Invariant Verification
    this.verifyInvariants(asset, postings);

    return {
      journalId: `jrnl_pay_${settlement.id}_${crypto.randomBytes(4).toString('hex')}`,
      settlementId: settlement.id,
      intentId: settlement.intentId,
      postings,
      timestamp: new Date().toISOString(),
    };
  }

  private verifyInvariants(asset: string, postings: PayLedgerPosting[]): void {
    const debits = postings
      .filter((p) => p.direction === 'DEBIT')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const credits = postings
      .filter((p) => p.direction === 'CREDIT')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    if (Math.abs(debits - credits) > 0.0001) {
      throw new Error(
        `CRITICAL ACCOUNTING ERROR: Payment double-entry invariant violated for ${asset}. Debits=${debits}, Credits=${credits}`
      );
    }
  }
}
