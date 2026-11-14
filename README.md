# OENEXA Pay Service (`oenexa-pay`)

> **Tri-Rail Merchant Payment Gateway & ISO 20022 SEPA Instant Settlement Service**  
> Governed by the OENEXA FinTech Architecture & Payments Engineering Organizations.

## 1. Domain Ownership
This repository authoritatively owns the **Payment & Merchant Settlement Domain**:
- **Owned Data**: Payment Intents, Merchant Accounts, Settlement Records, Payment Webhooks, Routing Rules.
- **Owned APIs**: `POST /v1/pay/intents`, `POST /v1/pay/intents/:id/confirm`, `GET /v1/pay/settlements`.
- **Owned Events**: `com.oenexa.pay.intent.created.v1`, `com.oenexa.pay.settled.v1`, `com.oenexa.pay.failed.v1`.
- **Database Boundary**: Isolated `oenexa-pay-prod-db`. Zero shared databases.

## 2. Tri-Rail Routing Capabilities
1. **ONXC_NATIVE**: Direct sovereign Layer 1 blockchain settlement.
2. **SEPA_INSTANT**: Real-time European EUR payments via ISO 20022 `pacs.008` format.
3. **CARD**: PCI-DSS tokenized card processing.
