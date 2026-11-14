import crypto from 'node:crypto';
import {
  createCloudEvent,
  EventTypes,
  type CloudEvent,
  type PaymentSettledPayload,
} from '@oenexa/event-schemas';
import type {
  PaymentIntent,
  PaymentRail,
  PaymentStatus,
  SettlementRecord,
} from '../domain/types.js';

export class PaymentService {
  private intents = new Map<string, PaymentIntent>();
  private idempotencyIndex = new Map<string, string>(); // idempotencyKey -> intentId
  private settlements = new Map<string, SettlementRecord>();
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
      amount: params.amount,
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

  public getOutbox(): CloudEvent<any>[] {
    return [...this.outbox];
  }
}
