import crypto from 'node:crypto';
import {
  createCloudEvent,
  EventTypes,
  type CloudEvent,
  type PaymentSettledPayload,
  type PaymentRefundedPayload,
} from '../domain/events.js';
import type {
  PaymentIntent,
  PaymentRail,
  RefundRecord,
  SettlementRecord,
} from '../domain/types.js';

export class PaymentService {
  private intents = new Map<string, PaymentIntent>();
  private idempotencyIndex = new Map<string, string>(); // idempotencyKey -> intentId
  private settlements = new Map<string, SettlementRecord>(); // settlementId -> SettlementRecord
  private settlementsByIntent = new Map<string, SettlementRecord>(); // intentId -> SettlementRecord
  private refunds = new Map<string, RefundRecord>(); // refundId -> RefundRecord
  private refundsByIntent = new Map<string, RefundRecord[]>(); // intentId -> RefundRecord[]
  private outbox: CloudEvent<any>[] = [];

  /**
   * Creates a payment intent with strict idempotency verification
   */
  public createIntent(params: {
    merchantId: string;
    amount: string;
    currency: string;
    rail: PaymentRail;
    idempotencyKey: string;
    metadata?: Record<string, string>;
  }): { intent: PaymentIntent; event: CloudEvent<any> } {
    const parsedAmount = parseFloat(params.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Payment intent amount must be a positive number.');
    }

    // Check idempotency cache
    const existingId = this.idempotencyIndex.get(params.idempotencyKey);
    if (existingId) {
      const existing = this.intents.get(existingId);
      if (existing) {
        return {
          intent: existing,
          event: this.outbox.find((e) => e.data.intentId === existing.id)!,
        };
      }
    }

    const intentId = `pi_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const intent: PaymentIntent = {
      id: intentId,
      merchantId: params.merchantId,
      amount: parsedAmount.toFixed(4),
      currency: params.currency.toUpperCase(),
      rail: params.rail,
      status: 'PENDING',
      idempotencyKey: params.idempotencyKey,
      metadata: params.metadata,
      createdAt: new Date().toISOString(),
    };

    this.intents.set(intent.id, intent);
    this.idempotencyIndex.set(params.idempotencyKey, intent.id);

    const event = createCloudEvent({
      type: EventTypes.PAYMENT_INTENT_CREATED,
      source: 'https://api.oenexa.com/v1/pay',
      data: {
        intentId: intent.id,
        merchantId: intent.merchantId,
        amount: intent.amount,
        currency: intent.currency,
        rail: intent.rail,
      },
      subject: intent.id,
    });

    this.outbox.push(event);
    return { intent, event };
  }

  /**
   * Settles a payment intent across its designated settlement rail
   */
  public settlePayment(intentId: string): { settlement: SettlementRecord; event: CloudEvent<any> } {
    const intent = this.intents.get(intentId);
    if (!intent) {
      throw new Error(`Payment intent '${intentId}' not found.`);
    }

    if (intent.status === 'SETTLED') {
      throw new Error(`Payment intent '${intentId}' is already settled.`);
    }

    if (intent.status === 'REFUNDED') {
      throw new Error(`Payment intent '${intentId}' cannot be settled because it has been refunded.`);
    }

    intent.status = 'SETTLED';
    intent.settledAt = new Date().toISOString();

    const gross = parseFloat(intent.amount);
    const feeRate = intent.rail === 'ONXC_NATIVE' ? 0.001 : 0.015; // 0.1% for ONXC vs 1.5% for fiat/card
    const fee = gross * feeRate;
    const net = gross - fee;

    const txRef =
      intent.rail === 'ONXC_NATIVE'
        ? `0x${crypto.randomBytes(32).toString('hex')}`
        : `SEPA-INST-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const settlement: SettlementRecord = {
      id: `stl_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      intentId: intent.id,
      merchantId: intent.merchantId,
      rail: intent.rail,
      grossAmount: gross.toFixed(4),
      feeAmount: fee.toFixed(4),
      netAmount: net.toFixed(4),
      currency: intent.currency,
      txReference: txRef,
      settledAt: intent.settledAt,
    };

    this.settlements.set(settlement.id, settlement);
    this.settlementsByIntent.set(intent.id, settlement);

    const payload: PaymentSettledPayload = {
      paymentId: intent.id,
      merchantId: intent.merchantId,
      amount: intent.amount,
      currency: intent.currency,
      settledAt: intent.settledAt,
      rail: intent.rail,
    };

    const event = createCloudEvent({
      type: EventTypes.PAYMENT_SETTLED,
      source: 'https://api.oenexa.com/v1/pay',
      data: payload,
      subject: intent.id,
    });

    this.outbox.push(event);
    return { settlement, event };
  }

  /**
   * Processes a full or partial refund for a settled payment intent
   */
  public refundPayment(params: {
    intentId: string;
    amount?: string;
    reason: string;
  }): { refund: RefundRecord; event: CloudEvent<any> } {
    const intent = this.intents.get(params.intentId);
    if (!intent) {
      throw new Error(`Payment intent '${params.intentId}' not found.`);
    }

    if (intent.status === 'REFUNDED') {
      throw new Error(`Requested refund exceeds remaining balance of 0.0000 ${intent.currency} (already fully refunded).`);
    }

    if (intent.status !== 'SETTLED' && intent.status !== 'PARTIALLY_REFUNDED') {
      throw new Error(`Payment intent '${params.intentId}' must be settled before refunding. Current status: ${intent.status}`);
    }

    const currentRefunded = parseFloat(intent.refundedAmount || '0.0000');
    const totalGross = parseFloat(intent.amount);
    const refundAmt = params.amount ? parseFloat(params.amount) : totalGross - currentRefunded;

    if (isNaN(refundAmt) || refundAmt <= 0) {
      throw new Error('Refund amount must be a positive number.');
    }

    if (currentRefunded + refundAmt > totalGross + 0.0001) {
      throw new Error(`Requested refund of ${refundAmt.toFixed(4)} exceeds remaining balance of ${(totalGross - currentRefunded).toFixed(4)} ${intent.currency}`);
    }

    const newRefundedTotal = currentRefunded + refundAmt;
    intent.refundedAmount = newRefundedTotal.toFixed(4);
    intent.refundedAt = new Date().toISOString();
    intent.status = Math.abs(newRefundedTotal - totalGross) < 0.0001 ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    const txRef =
      intent.rail === 'ONXC_NATIVE'
        ? `0x${crypto.randomBytes(32).toString('hex')}`
        : `REFUND-SEPA-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const refund: RefundRecord = {
      id: `ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      intentId: intent.id,
      merchantId: intent.merchantId,
      amount: refundAmt.toFixed(4),
      currency: intent.currency,
      reason: params.reason || 'Customer requested return',
      rail: intent.rail,
      txReference: txRef,
      refundedAt: intent.refundedAt,
    };

    this.refunds.set(refund.id, refund);
    const existingList = this.refundsByIntent.get(intent.id) || [];
    existingList.push(refund);
    this.refundsByIntent.set(intent.id, existingList);

    const payload: PaymentRefundedPayload = {
      refundId: refund.id,
      paymentId: intent.id,
      merchantId: intent.merchantId,
      amount: refund.amount,
      currency: refund.currency,
      reason: refund.reason,
      rail: refund.rail,
      refundedAt: refund.refundedAt,
    };

    const event = createCloudEvent({
      type: EventTypes.PAYMENT_REFUNDED,
      source: 'https://api.oenexa.com/v1/pay',
      data: payload,
      subject: intent.id,
    });

    this.outbox.push(event);
    return { refund, event };
  }

  public getIntent(intentId: string): PaymentIntent | undefined {
    return this.intents.get(intentId);
  }

  public getSettlementByIntent(intentId: string): SettlementRecord | undefined {
    return this.settlementsByIntent.get(intentId);
  }

  public getRefundsByIntent(intentId: string): RefundRecord[] {
    return [...(this.refundsByIntent.get(intentId) || [])];
  }

  public getOutbox(): CloudEvent<any>[] {
    return [...this.outbox];
  }
}
