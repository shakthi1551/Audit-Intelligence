import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { engagementsTable } from "./engagements";
import { usersTable } from "./users";

export const fraudEvaluationHandoffsTable = pgTable("fraud_evaluation_handoffs", {
  id: serial("id").primaryKey(),
  codeHash: text("code_hash").notNull().unique(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  engagementId: integer("engagement_id").notNull().references(() => engagementsTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type FraudEvaluationHandoff = typeof fraudEvaluationHandoffsTable.$inferSelect;