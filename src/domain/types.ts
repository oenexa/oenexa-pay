export type PaymentRail = 'ONXC_NATIVE' | 'SEPA_INSTANT' | 'CARD';

export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'SETTLED' | 'FAILED';

export interface PaymentIntent {
  id: string;
  merchantId: string;
  amount: string;
  currency: string;
  rail: PaymentRail;
  status: PaymentStatus;
  idempotencyKey: string;
  metadata?: Record<string, string>;
  createdAt: string;
  settledAt?: string;
}

export interface Merchant {
  id: string;
  name: string;
  payoutAddress: string;
  sepaIban?: string;
  activeRails: PaymentRail[];
}

export interface SettlementRecord {
  id: string;
  intentId: string;
  merchantId: string;
  rail: PaymentRail;
  grossAmount: string;
  feeAmount: string;
  netAmount: string;
  currency: string;
  txReference: string;
  settledAt: string;
}
