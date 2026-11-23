import { describe, it, expect } from 'vitest';
import { Iso20022MessageService, CreditTransferInstruction } from '../service/Iso20022MessageService.js';

describe('ISO 20022 Interbank Messaging & Reconciliation Suite', () => {
  const service = new Iso20022MessageService();

  describe('IBAN ISO 13616 Modulo 97-10 Validation', () => {
    it('validates authentic European IBANs', () => {
      // Standard valid sample IBANs (Germany, France, Netherlands)
      expect(Iso20022MessageService.validateIban('DE89370400440532013000')).toBe(true);
      expect(Iso20022MessageService.validateIban('FR1420041010050500013M02606')).toBe(true);
      expect(Iso20022MessageService.validateIban('NL91ABNA0417164300')).toBe(true);
    });

    it('rejects forged, truncated, or invalid check-digit IBANs', () => {
      expect(Iso20022MessageService.validateIban('DE89370400440532013001')).toBe(false); // Tampered check digit
      expect(Iso20022MessageService.validateIban('US1234')).toBe(false); // Too short
      expect(Iso20022MessageService.validateIban('INVALID_IBAN_FORMAT')).toBe(false);
    });
  });

  describe('pain.001.001.09 Credit Transfer Generation', () => {
    const validInstruction: CreditTransferInstruction = {
      endToEndId: 'E2E-ONX-20261124-001',
      debtorName: 'OENEXA LIQUIDITY AG',
      debtorIban: 'DE89370400440532013000',
      debtorBic: 'DBEUMM21XXX',
      creditorName: 'MERCHANT COMMERCE BV',
      creditorIban: 'NL91ABNA0417164300',
      creditorBic: 'ABNANL2AXXX',
      amount: 15420.50,
      currency: 'EUR',
      remittanceInfo: 'Settlement Batch 2026-W48',
    };

    it('generates schema-compliant pain.001 XML with UETR and controls', () => {
      const xml = service.generatePain001(validInstruction);

      expect(xml).toContain('urn:iso:std:iso:20022:tech:xsd:pain.001.001.09');
      expect(xml).toContain('<CtrlSum>15420.50</CtrlSum>');
      expect(xml).toContain('<InstdAmt Ccy="EUR">15420.50</InstdAmt>');
      expect(xml).toContain('<EndToEndId>E2E-ONX-20261124-001</EndToEndId>');
      expect(xml).toContain('<IBAN>DE89370400440532013000</IBAN>');
      expect(xml).toContain('<IBAN>NL91ABNA0417164300</IBAN>');
      expect(xml).toContain('<UETR>');
    });

    it('throws error when debtor or creditor IBAN fails ISO 13616', () => {
      expect(() => {
        service.generatePain001({
          ...validInstruction,
          creditorIban: 'NL91ABNA0000000000', // Invalid checksum
        });
      }).toThrow(/Invalid Creditor IBAN format/);
    });

    it('throws error for non-positive transfer amounts', () => {
      expect(() => {
        service.generatePain001({
          ...validInstruction,
          amount: -50.00,
        });
      }).toThrow(/strictly positive/);
    });
  });

  describe('camt.053.001.08 Bank Statement Ingestion & Mathematical Reconciliation', () => {
    it('successfully reconciles balanced interbank statement', () => {
      const camt053Xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08">
  <BkToCstmrStmt>
    <Stmt>
      <Id>STMT-2026-11-24-001</Id>
      <Acct>
        <Id><IBAN>DE89370400440532013000</IBAN></Id>
      </Acct>
      <Bal>
        <Cd>OPBD</Cd>
        <Amt Ccy="EUR">100000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
      </Bal>
      <Bal>
        <Cd>CLBD</Cd>
        <Amt Ccy="EUR">125000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
      </Bal>
      <Ntry>
        <Amt Ccy="EUR">35000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Dt>2026-11-24</Dt>
        <AcctSvcrRef>SEPA-IN-88912</AcctSvcrRef>
      </Ntry>
      <Ntry>
        <Amt Ccy="EUR">10000.00</Amt>
        <CdtDbtInd>DBIT</CdtDbtInd>
        <Dt>2026-11-24</Dt>
        <AcctSvcrRef>WIRE-OUT-99124</AcctSvcrRef>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

      const report = service.parseCamt053(camt053Xml);

      expect(report.statementId).toBe('STMT-2026-11-24-001');
      expect(report.accountIban).toBe('DE89370400440532013000');
      expect(report.openingBalance).toBe(100000.00);
      expect(report.closingBalance).toBe(125000.00);
      expect(report.calculatedClosingBalance).toBe(125000.00);
      expect(report.isReconciled).toBe(true);
      expect(report.entries).toHaveLength(2);
    });

    it('flags statement when transactions do not equal closing balance (ledger drift)', () => {
      const driftingCamt053Xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08">
  <BkToCstmrStmt>
    <Stmt>
      <Id>STMT-DRIFT-002</Id>
      <Acct>
        <Id><IBAN>DE89370400440532013000</IBAN></Id>
      </Acct>
      <Bal>
        <Cd>OPBD</Cd>
        <Amt Ccy="EUR">50000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
      </Bal>
      <Bal>
        <Cd>CLBD</Cd>
        <Amt Ccy="EUR">55000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
      </Bal>
      <Ntry>
        <Amt Ccy="EUR">1000.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Dt>2026-11-24</Dt>
      </Ntry>
    </Stmt>
  </BkToCstmrStmt>
</Document>`;

      const report = service.parseCamt053(driftingCamt053Xml);

      expect(report.calculatedClosingBalance).toBe(51000.00);
      expect(report.closingBalance).toBe(55000.00);
      expect(report.isReconciled).toBe(false);
    });
  });
});
