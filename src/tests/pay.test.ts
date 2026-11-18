import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PaymentService } from '../service/PaymentService.js';
import { EventTypes } from '../domain/events.js';
import { server } from '../index.js';
import http from 'node:http';

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

  it('handles partial and full refunds with CloudEvent emission', () => {
    const service = new PaymentService();
    const { intent } = service.createIntent({
      merchantId: 'mch_zalando_de',
      amount: '100.0000',
      currency: 'EUR',
      rail: 'CARD',
      idempotencyKey: 'idemp_card_zalando',
    });

    service.settlePayment(intent.id);

    // Partial refund of 40 EUR
    const { refund: partialRefund, event: partialEvent } = service.refundPayment({
      intentId: intent.id,
      amount: '40.0000',
      reason: 'Returned 1 item',
    });

    expect(partialRefund.amount).toBe('40.0000');
    expect(partialEvent.type).toBe(EventTypes.PAYMENT_REFUNDED);
    const updatedIntent1 = service.getIntent(intent.id);
    expect(updatedIntent1?.status).toBe('PARTIALLY_REFUNDED');
    expect(updatedIntent1?.refundedAmount).toBe('40.0000');

    // Full remaining refund of 60 EUR
    const { refund: fullRefund } = service.refundPayment({
      intentId: intent.id,
      reason: 'Returned remaining items',
    });

    expect(fullRefund.amount).toBe('60.0000');
    const updatedIntent2 = service.getIntent(intent.id);
    expect(updatedIntent2?.status).toBe('REFUNDED');
    expect(updatedIntent2?.refundedAmount).toBe('100.0000');

    // Attempting further refund must fail
    expect(() =>
      service.refundPayment({
        intentId: intent.id,
        amount: '10.0000',
        reason: 'Over-refund test',
      })
    ).toThrow(/exceeds remaining balance/);
  });

  it('rejects refund on un-settled intent', () => {
    const service = new PaymentService();
    const { intent } = service.createIntent({
      merchantId: 'mch_ikea_nl',
      amount: '250.0000',
      currency: 'EUR',
      rail: 'SEPA_INSTANT',
      idempotencyKey: 'idemp_ikea_pending',
    });

    expect(() =>
      service.refundPayment({
        intentId: intent.id,
        amount: '50.0000',
        reason: 'Cancellation',
      })
    ).toThrow(/must be settled before refunding/);
  });
});

describe('OENEXA Pay HTTP REST API (Law 4 Zero-Mock)', () => {
  let serverPort: number;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr) {
          serverPort = addr.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  function makeRequest(
    method: string,
    path: string,
    body?: any
  ): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const dataString = body ? JSON.stringify(body) : '';
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: serverPort,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dataString),
          },
        },
        (res) => {
          let chunks = '';
          res.on('data', (d) => (chunks += d.toString()));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode || 500, body: JSON.parse(chunks) });
            } catch {
              resolve({ status: res.statusCode || 500, body: chunks });
            }
          });
        }
      );
      req.on('error', reject);
      if (dataString) req.write(dataString);
      req.end();
    });
  }

  it('handles health and payment lifecycle over HTTP', async () => {
    // 1. Health check
    const health = await makeRequest('GET', '/health');
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('UP');

    // 2. Create intent
    const intentRes = await makeRequest('POST', '/api/pay/intent', {
      merchantId: 'mch_http_test',
      amount: '80.0000',
      currency: 'ONXC',
      rail: 'ONXC_NATIVE',
      idempotencyKey: 'idemp_http_88',
    });
    expect(intentRes.status).toBe(201);
    expect(intentRes.body.success).toBe(true);
    const intentId = intentRes.body.data.id;

    // 3. Query intent
    const queryRes = await makeRequest('GET', `/api/pay/intent/${intentId}`);
    expect(queryRes.status).toBe(200);
    expect(queryRes.body.data.status).toBe('PENDING');

    // 4. Settle payment
    const settleRes = await makeRequest('POST', '/api/pay/settle', { intentId });
    expect(settleRes.status).toBe(200);
    expect(settleRes.body.data.grossAmount).toBe('80.0000');

    // 5. Refund payment
    const refundRes = await makeRequest('POST', '/api/pay/refund', {
      intentId,
      amount: '80.0000',
      reason: 'Customer return via HTTP',
    });
    expect(refundRes.status).toBe(200);
    expect(refundRes.body.data.amount).toBe('80.0000');

    // 6. Outbox contains events
    const outboxRes = await makeRequest('GET', '/api/pay/outbox');
    expect(outboxRes.status).toBe(200);
    expect(outboxRes.body.data.length).toBeGreaterThanOrEqual(3);
  });
});
