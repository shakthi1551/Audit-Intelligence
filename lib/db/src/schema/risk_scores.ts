import { pgTable, serial, text, timestamp, integer, numeric, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { journalEntriesTable } from "./journal_entries";

export const riskLevelEnum = pgEnum("risk_level", ["HIGH", "MEDIUM", "LOW"]);

export const riskScoresTable = pgTable("risk_scores", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => journalEntriesTable.id),
  totalScore: numeric("total_score", { precision: 5, scale: 2 }).notNull(),
  riskLevel: riskLevelEnum("risk_level").notNull(),
  postingTimeScore: numeric("posting_time_score", { precision: 5, scale: 2 }).notNull().default("0"),
  amountScore: numeric("amount_score", { precision: 5, scale: 2 }).notNull().default("0"),
  userConcentrationScore: numeric("user_concentration_score", { precision: 5, scale: 2 }).notNull().default("0"),
  keywordScore: numeric("keyword_score", { precision: 5, scale: 2 }).notNull().default("0"),
  frequencyScore: numeric("frequency_score", { precision: 5, scale: 2 }).notNull().default("0"),
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }).notNull().default("85"),
  overridden: boolean("overridden").notNull().default(false),
  overrideReason: text("override_reason"),
  overriddenBy: text("overridden_by"),
  overriddenAt: timestamp("overridden_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRiskScoreSchema = createInsertSchema(riskScoresTable).omit({ id: true, createdAt: true });
export type InsertRiskScore = z.infer<typeof insertRiskScoreSchema>;
export type RiskScore = typeof riskScoresTable.$inferSelect;
