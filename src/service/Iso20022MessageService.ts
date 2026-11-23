import { randomUUID } from 'node:crypto';

export interface CreditTransferInstruction {
  messageId?: string;
  endToEndId: string;
  debtorName: string;
  debtorIban: string;
  debtorBic: string;
  creditorName: string;
  creditorIban: string;
  creditorBic: string;
  amount: number;
  currency: string;
  remittanceInfo: string;
  executionDate?: string;
}

export interface StatementEntry {
  entryRef: string;
  amount: number;
  creditDebitIndicator: 'CRDT' | 'DBIT';
  bookingDate: string;
  accountServicerRef?: string;
}

export interface BankStatementReport {
  statementId: string;
  accountIban: string;
  openingBalance: number;
  closingBalance: number;
  currency: string;
  entries: StatementEntry[];
  calculatedClosingBalance: number;
  isReconciled: boolean;
}

export class Iso20022MessageService {
  /**
   * Validate International Bank Account Number (IBAN) using ISO 13616 Modulo 97-10 algorithm.
   */
  public static validateIban(iban: string): boolean {
    const sanitized = iban.replace(/[\s-]/g, '').toUpperCase();
    if (sanitized.length < 15 || sanitized.length > 34) {
      return false;
    }
    // Country code must be two alpha chars, check digits must be two numeric digits
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(sanitized)) {
      return false;
    }
    // Rearrange: move first 4 characters to end
    const rearranged = sanitized.slice(4) + sanitized.slice(0, 4);
    // Convert letters to numbers (A=10, B=11, ... Z=35)
    let numericStr = '';
    for (const char of rearranged) {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        numericStr += (code - 55).toString();
      } else {
        numericStr += char;
      }
    }
    // Perform modulo 97 in chunks to avoid JS integer overflow
    let remainder = 0;
    for (let i = 0; i < numericStr.length; i += 7) {
      const chunk = remainder.toString() + numericStr.substring(i, Math.min(i + 7, numericStr.length));
      remainder = parseInt(chunk, 10) % 97;
    }
    return remainder === 1;
  }

  /**
   * Generate an ISO 20022 pain.001.001.09 Customer Credit Transfer Initiation XML.
   */
  public generatePain001(instruction: CreditTransferInstruction): string {
    if (!Iso20022MessageService.validateIban(instruction.debtorIban)) {
      throw new Error(`Invalid Debtor IBAN format: ${instruction.debtorIban}`);
    }
    if (!Iso20022MessageService.validateIban(instruction.creditorIban)) {
      throw new Error(`Invalid Creditor IBAN format: ${instruction.creditorIban}`);
    }
    if (instruction.amount <= 0) {
      throw new Error(`Transfer amount must be strictly positive: ${instruction.amount}`);
    }

    const msgId = instruction.messageId || `ONX-PAIN001-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const creationTime = new Date().toISOString();
    const execDate = instruction.executionDate || creationTime.split('T')[0];
    const formattedAmount = instruction.amount.toFixed(2);

    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${creationTime}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>OENEXA CLEARING &amp; SETTLEMENT INSTITUTION</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMTINF-${msgId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <ReqdExctnDt>
        <Dt>${execDate}</Dt>
      </ReqdExctnDt>
      <Dbtr>
        <Nm>${instruction.debtorName}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${instruction.debtorIban.replace(/\s/g, '').toUpperCase()}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${instruction.debtorBic}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${instruction.endToEndId}</EndToEndId>
          <UETR>${randomUUID()}</UETR>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="${instruction.currency}">${formattedAmount}</InstdAmt>
        </Amt>
        <CdtrAgt>
          <FinInstnId>
            <BICFI>${instruction.creditorBic}</BICFI>
          </FinInstnId>
        </CdtrAgt>
        <Cdtr>
          <Nm>${instruction.creditorName}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <IBAN>${instruction.creditorIban.replace(/\s/g, '').toUpperCase()}</IBAN>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${instruction.remittanceInfo}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
  }

  /**
   * Parse and validate an ISO 20022 camt.053.001.08 Bank-to-Customer Statement XML.
   */
  public parseCamt053(xmlContent: string): BankStatementReport {
    const getTagValue = (xml: string, tag: string): string => {
      const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`));
      return match ? match[1].trim() : '';
    };

    const statementId = getTagValue(xmlContent, 'Id');
    const accountIban = getTagValue(xmlContent, 'IBAN');
    const currency = xmlContent.match(/Ccy="([A-Z]{3})"/)?.[1] || 'EUR';

    // Extract balances (OPBD = Opening, CLBD = Closing)
    let openingBalance = 0;
    let closingBalance = 0;

    const balanceRegex = /<Bal>([\s\S]*?)<\/Bal>/g;
    let balMatch: RegExpExecArray | null;
    while ((balMatch = balanceRegex.exec(xmlContent)) !== null) {
      const balXml = balMatch[1];
      const code = getTagValue(balXml, 'Cd');
      const amtStr = getTagValue(balXml, 'Amt');
      const amt = parseFloat(amtStr) || 0;
      const cdtDbt = getTagValue(balXml, 'CdtDbtInd');
      const signedAmt = cdtDbt === 'DBIT' ? -amt : amt;

      if (code === 'OPBD' || code === 'PRCD') {
        openingBalance = signedAmt;
      } else if (code === 'CLBD') {
        closingBalance = signedAmt;
      }
    }

    // Extract entries
    const entries: StatementEntry[] = [];
    const entryRegex = /<Ntry>([\s\S]*?)<\/Ntry>/g;
    let ntryMatch: RegExpExecArray | null;
    let totalCredits = 0;
    let totalDebits = 0;

    while ((ntryMatch = entryRegex.exec(xmlContent)) !== null) {
      const ntryXml = ntryMatch[1];
      const amtStr = getTagValue(ntryXml, 'Amt');
      const amt = parseFloat(amtStr) || 0;
      const indicator = getTagValue(ntryXml, 'CdtDbtInd') as 'CRDT' | 'DBIT';
      const bookingDate = getTagValue(ntryXml, 'Dt') || getTagValue(ntryXml, 'DtTm');
      const entryRef = getTagValue(ntryXml, 'AcctSvcrRef') || `NTRY-${entries.length + 1}`;

      if (indicator === 'CRDT') {
        totalCredits += amt;
      } else if (indicator === 'DBIT') {
        totalDebits += amt;
      }

      entries.push({
        entryRef,
        amount: amt,
        creditDebitIndicator: indicator,
        bookingDate,
        accountServicerRef: entryRef,
      });
    }

    const calculatedClosingBalance = Number((openingBalance + totalCredits - totalDebits).toFixed(2));
    const isReconciled = Math.abs(calculatedClosingBalance - closingBalance) < 0.001;

    return {
      statementId,
      accountIban,
      openingBalance,
      closingBalance,
      currency,
      entries,
      calculatedClosingBalance,
      isReconciled,
    };
  }
}
