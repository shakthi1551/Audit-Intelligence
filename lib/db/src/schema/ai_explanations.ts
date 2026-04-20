import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { journalEntriesTable } from "./journal_entries";

export const aiExplanationsTable = pgTable("ai_explanations", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => journalEntriesTable.id).unique(),
  explanation: text("explanation").notNull(),
  triggers: jsonb("triggers").$type<string[]>().notNull().default([]),
  isaReference: text("isa_reference").default("ISA 240"),
  modelUsed: text("model_used").default("claude-sonnet-4-6"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const insertAiExplanationSchema = createInsertSchema(aiExplanationsTable).omit({ id: true, generatedAt: true });
export type InsertAiExplanation = z.infer<typeof insertAiExplanationSchema>;
export type AiExplanation = typeof aiExplanationsTable.$inferSelect;
