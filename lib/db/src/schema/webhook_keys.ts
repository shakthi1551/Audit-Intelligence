import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const webhookKeysTable = pgTable("webhook_keys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  createdBy: integer("created_by").notNull(),
  active: boolean("active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWebhookKeySchema = createInsertSchema(webhookKeysTable).omit({ id: true, createdAt: true });
export type InsertWebhookKey = z.infer<typeof insertWebhookKeySchema>;
export type WebhookKey = typeof webhookKeysTable.$inferSelect;
