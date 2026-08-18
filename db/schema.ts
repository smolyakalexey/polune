import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const analyticsEvents = sqliteTable("analytics_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  eventName: text("event_name").notNull(),
  intentId: text("intent_id"),
  archetype: text("archetype"),
  selectedDate: text("selected_date"),
  score: integer("score"),
  methodVersion: text("method_version").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_analytics_events_created_at").on(table.createdAt),
  index("idx_analytics_events_event_name_created_at").on(table.eventName, table.createdAt),
]);

export const feedbackResponses = sqliteTable("feedback_responses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  intentId: text("intent_id"),
  selectedDate: text("selected_date"),
  score: integer("score"),
  clarity: integer("clarity").notNull(),
  trust: integer("trust").notNull(),
  wouldReturn: text("would_return").notNull(),
  missingIntent: text("missing_intent"),
  comment: text("comment"),
  methodVersion: text("method_version").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_feedback_responses_created_at").on(table.createdAt),
  index("idx_feedback_responses_intent_created_at").on(table.intentId, table.createdAt),
]);
