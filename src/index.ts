import http from 'node:http';
import { PaymentService } from './service/PaymentService.js';
import { MerchantSettlementLedgerBridge } from './service/MerchantSettlementLedgerBridge.js';

export * from './domain/types.js';
export * from './domain/events.js';
export * from './service/PaymentService.js';
export * from './service/MerchantSettlementLedgerBridge.js';
export * from './service/Iso20022MessageService.js';
export * from './registry/FiatCurrencyRegistry.js';

export const pay = new PaymentService();
export const settlementBridge = new MerchantSettlementLedgerBridge();
const PORT = Number(process.env.PORT) || 8086;

function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Malformed JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

export const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const url = req.url || '';
  const method = req.method || 'GET';

  try {
    if (url === '/health' && method === 'GET') {
      res.writeHead(200);
      return res.end(JSON.stringify({ status: 'UP', service: 'oenexa-pay', timestamp: new Date().toISOString() }));
    }

    if (url === '/api/pay/outbox' && method === 'GET') {
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true, data: pay.getOutbox() }));
    }

    if (url.startsWith('/api/pay/intent/') && method === 'GET') {
      const intentId = url.replace('/api/pay/intent/', '').trim();
      const intent = pay.getIntent(intentId);
      if (!intent) {
        res.writeHead(404);
        return res.end(JSON.stringify({ success: false, error: `Payment intent '${intentId}' not found` }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true, data: intent }));
    }

    if (url === '/api/pay/intent' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { merchantId, amount, currency, rail, idempotencyKey, metadata } = body;
      if (!merchantId || !amount || !currency || !rail || !idempotencyKey) {
        res.writeHead(400);
        return res.end(JSON.stringify({ success: false, error: 'Missing required fields for payment intent' }));
      }

      const result = pay.createIntent({ merchantId, amount, currency, rail, idempotencyKey, metadata });
      res.writeHead(201);
      return res.end(JSON.stringify({ success: true, data: result.intent, eventId: result.event.id }));
    }

    if (url === '/api/pay/settle' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { intentId } = body;
      if (!intentId) {
        res.writeHead(400);
        return res.end(JSON.stringify({ success: false, error: 'Missing intentId for settlement' }));
      }

      const result = pay.settlePayment(intentId);
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true, data: result.settlement, eventId: result.event.id }));
    }

    if (url === '/api/pay/refund' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { intentId, amount, reason } = body;
      if (!intentId) {
        res.writeHead(400);
        return res.end(JSON.stringify({ success: false, error: 'Missing intentId for refund' }));
      }

      const result = pay.refundPayment({ intentId, amount, reason: reason || 'Merchant refund' });
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true, data: result.refund, eventId: result.event.id }));
    }

    res.writeHead(404);
    return res.end(JSON.stringify({ success: false, error: 'Endpoint Not Found' }));
  } catch (err: any) {
    res.writeHead(400);
    return res.end(JSON.stringify({ success: false, error: err.message || 'Payment processing error' }));
  }
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[oenexa-pay] Payment Gateway & Rails Microservice listening on port ${PORT}`);
  });
}
