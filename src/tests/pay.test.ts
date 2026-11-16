import { describe, it, expect } from 'vitest';
import { PaymentService } from '../service/PaymentService.js';
import { EventTypes } from '../domain/events.js';

describe('OENEXA Pay Service & Tri-Rail Settlement', () => {
  it('creates payment intent and enforces strict idempotency', () => {
    const service = new PaymentService();
    const result1 = service.createIntent({
      merchantId: 'mch_amazon_eu',
      amount: '120.0000',
      currency: 'EUR',
      rail: 'SEPA_INSTANT',
      idempotencyKey: 'idemp_key_unique_1',
    });

    expect(result1.intent.id.startsWith('pi_')).toBe(true);
    expect(result1.intent.status).toBe('PENDING');

    // Duplicate call with exact same idempotencyKey must return existing intent
    const result2 = service.createIntent({
      merchantId: 'mch_amazon_eu',
      amount: '120.0000',
      currency: 'EUR',
      rail: 'SEPA_INSTANT',
      idempotencyKey: 'idemp_key_unique_1',
    });

    expect(result2.intent.id).toBe(result1.intent.id);
  });

  it('settles ONXC native payment with sub-cent fee and emits CloudEvent', () => {
    const service = new PaymentService();
    const { intent } = service.createIntent({
      merchantId: 'mch_shopify_01',
      amount: '50.0000',
      currency: 'ONXC',
      rail: 'ONXC_NATIVE',
      idempotencyKey: 'idemp_onxc_88',
    });

    const { settlement, event } = service.settlePayment(intent.id);
    expect(settlement.intentId).toBe(intent.id);
    expect(settlement.rail).toBe('ONXC_NATIVE');
    expect(settlement.txReference.startsWith('0x')).toBe(true);
    expect(parseFloat(settlement.feeAmount)).toBe(0.05); // 0.1% fee
    expect(event.type).toBe(EventTypes.PAYMENT_SETTLED);
  });
});
