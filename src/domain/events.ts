/**
 * Standalone Payment Events & CNCF CloudEvents v1.0 Spec
 */
export interface CloudEvent<T = Record<string, unknown>> {
  specversion: '1.0';
  id: string;
  source: string;
  type: string;
  time: string;
  datacontenttype: string;
  subject?: string;
  correlationid?: string;
  causationid?: string;
  data: T;
}

export const EventTypes = {
  PAYMENT_INTENT_CREATED: 'com.oenexa.pay.intent.created.v1',
  PAYMENT_SETTLED: 'com.oenexa.pay.settled.v1',
  PAYMENT_REFUNDED: 'com.oenexa.pay.refunded.v1',
  PAYMENT_FAILED: 'com.oenexa.pay.failed.v1',
} as const;

export interface PaymentSettledPayload {
  paymentId: string;
  merchantId: string;
  amount: string;
  currency: string;
  settledAt: string;
  rail: 'ONXC_NATIVE' | 'SEPA_INSTANT' | 'CARD';
}

export interface PaymentRefundedPayload {
  refundId: string;
  paymentId: string;
  merchantId: string;
  amount: string;
  currency: string;
  reason: string;
  rail: 'ONXC_NATIVE' | 'SEPA_INSTANT' | 'CARD';
  refundedAt: string;
}

export function createCloudEvent<T>(params: {
  type: string;
  source: string;
  data: T;
  subject?: string;
  correlationId?: string;
  causationId?: string;
}): CloudEvent<T> {
  return {
    specversion: '1.0',
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    source: params.source,
    type: params.type,
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    subject: params.subject,
    correlationid: params.correlationId,
    causationid: params.causationId,
    data: params.data,
  };
}
