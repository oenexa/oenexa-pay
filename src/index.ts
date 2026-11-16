import http from 'node:http';
import { PaymentService } from './service/PaymentService.js';

export * from './domain/types.js';
export * from './domain/events.js';
export * from './service/PaymentService.js';

const pay = new PaymentService();
const PORT = Number(process.env.PORT) || 8086;

export const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: 'UP', service: 'oenexa-pay', timestamp: new Date().toISOString() }));
  }

  if (req.url === '/api/pay/outbox' && req.method === 'GET') {
    res.writeHead(200);
    return res.end(JSON.stringify({ success: true, data: pay.getOutbox() }));
  }

  res.writeHead(404);
  return res.end(JSON.stringify({ success: false, error: 'Endpoint Not Found' }));
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[oenexa-pay] Payment Gateway & Rails Microservice listening on port ${PORT}`);
  });
}
