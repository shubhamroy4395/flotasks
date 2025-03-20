import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  completed: boolean("completed").notNull().default(false),
  priority: integer("priority").notNull().default(0),
  category: text("category").notNull(),
});

export const customCards = pgTable("custom_cards", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  order: integer("order").notNull().default(0),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const customTasks = pgTable("custom_tasks", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id").notNull(),
  content: text("content").notNull(),
  completed: boolean("completed").notNull().default(false),
  priority: integer("priority").notNull().default(0),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const moodEntries = pgTable("mood_entries", {
  id: serial("id").primaryKey(),
  mood: text("mood").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const gratitudeEntries = pgTable("gratitude_entries", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const insertCustomCardSchema = createInsertSchema(customCards).omit({ id: true });
export const insertCustomTaskSchema = createInsertSchema(customTasks).omit({ id: true });
export const insertMoodSchema = createInsertSchema(moodEntries).omit({ id: true });
export const insertGratitudeSchema = createInsertSchema(gratitudeEntries).omit({ id: true });

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type CustomCard = typeof customCards.$inferSelect;
export type InsertCustomCard = z.infer<typeof insertCustomCardSchema>;
export type CustomTask = typeof customTasks.$inferSelect;
export type InsertCustomTask = z.infer<typeof insertCustomTaskSchema>;
export type MoodEntry = typeof moodEntries.$inferSelect;
export type InsertMoodEntry = z.infer<typeof insertMoodSchema>;
export type GratitudeEntry = typeof gratitudeEntries.$inferSelect;
export type InsertGratitudeEntry = z.infer<typeof insertGratitudeSchema>;