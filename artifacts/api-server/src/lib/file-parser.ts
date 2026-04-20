import Papa from "papaparse";

export interface ParsedEntry {
  entryDate: string;
  postedBy: string;
  description: string;
  debitAccount?: string;
  creditAccount?: string;
  amount: number;
  postingTime?: string;
  referenceNumber?: string;
  rawData: Record<string, unknown>;
}

// Common column name mappings
const COLUMN_ALIASES: Record<string, string[]> = {
  entryDate: ["date", "entry_date", "posting_date", "journal_date", "doc_date", "transaction_date"],
  postedBy: ["user", "posted_by", "created_by", "entered_by", "username", "user_id", "preparer"],
  description: ["description", "memo", "narrative", "note", "details", "text", "particulars"],
  amount: ["amount", "value", "debit_amount", "credit_amount", "net_amount", "dr_amount", "cr_amount", "transaction_amount"],
  debitAccount: ["debit", "debit_account", "dr_account", "account_debit", "dr", "debit_gl"],
  creditAccount: ["credit", "credit_account", "cr_account", "account_credit", "cr", "credit_gl"],
  postingTime: ["time", "posting_time", "transaction_time", "entry_time", "created_time"],
  referenceNumber: ["reference", "ref", "reference_number", "ref_no", "voucher", "doc_number", "journal_id"],
};

function findColumn(headers: string[], field: string): string | undefined {
  const aliases = COLUMN_ALIASES[field] ?? [field];
  const lowerHeaders = headers.map(h => h.toLowerCase().trim().replace(/\s+/g, "_"));
  for (const alias of aliases) {
    const idx = lowerHeaders.findIndex(h => h === alias || h.includes(alias));
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}

export function parseCsv(content: string): { entries: ParsedEntry[]; errors: string[] } {
  const result = Papa.parse(content, { header: true, skipEmptyLines: true });
  const headers = result.meta.fields ?? [];
  const errors: string[] = [];

  if (headers.length === 0) {
    return { entries: [], errors: ["No columns found in CSV file"] };
  }

  const colMap: Record<string, string | undefined> = {};
  for (const field of Object.keys(COLUMN_ALIASES)) {
    colMap[field] = findColumn(headers, field);
  }

  const entries: ParsedEntry[] = [];
  const rows = result.data as Record<string, string>[];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const dateCol = colMap.entryDate;
      const userCol = colMap.postedBy;
      const descCol = colMap.description;
      const amtCol = colMap.amount;

      if (!dateCol || !row[dateCol]) {
        errors.push(`Row ${i + 2}: Missing date`);
        continue;
      }
      if (!userCol || !row[userCol]) {
        errors.push(`Row ${i + 2}: Missing user`);
        continue;
      }
      if (!descCol || !row[descCol]) {
        errors.push(`Row ${i + 2}: Missing description`);
        continue;
      }
      if (!amtCol || !row[amtCol]) {
        errors.push(`Row ${i + 2}: Missing amount`);
        continue;
      }

      const rawAmount = row[amtCol].replace(/[,$\s]/g, "");
      const amount = parseFloat(rawAmount);
      if (isNaN(amount)) {
        errors.push(`Row ${i + 2}: Invalid amount "${row[amtCol]}"`);
        continue;
      }

      entries.push({
        entryDate: row[dateCol],
        postedBy: row[userCol],
        description: row[descCol],
        amount,
        debitAccount: colMap.debitAccount ? row[colMap.debitAccount] : undefined,
        creditAccount: colMap.creditAccount ? row[colMap.creditAccount] : undefined,
        postingTime: colMap.postingTime ? row[colMap.postingTime] : undefined,
        referenceNumber: colMap.referenceNumber ? row[colMap.referenceNumber] : undefined,
        rawData: row,
      });
    } catch (err) {
      errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "Parse error"}`);
    }
  }

  return { entries, errors };
}

export function parseXlsx(buffer: Buffer): { entries: ParsedEntry[]; errors: string[] } {
  // XLSX parsing - we'll use dynamic import
  // For now fall back to treating as CSV if it's text
  return { entries: [], errors: ["XLSX parsing requires xlsx library"] };
}
