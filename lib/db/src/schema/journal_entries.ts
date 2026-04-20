import { pgTable, serial, text, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { engagementsTable } from "./engagements";

export const journalEntriesTable = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  engagementId: integer("engagement_id").notNull().references(() => engagementsTable.id),
  entryDate: text("entry_date").notNull(),
  postedBy: text("posted_by").notNull(),
  description: text("description").notNull(),
  debitAccount: text("debit_account"),
  creditAccount: text("credit_account"),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  postingTime: text("posting_time"),
  referenceNumber: text("reference_number"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntriesTable).omit({ id: true, createdAt: true });
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntriesTable.$inferSelect;
