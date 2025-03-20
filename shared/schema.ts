import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  completed: boolean("completed").notNull().default(false),
  priority: integer("priority").notNull().default(0), // 0: neutral, 1: low, 2: medium, 3: high
  category: text("category").notNull(), // 'todo', 'goal', 'reminder', 'chore', 'custom'
});

export const moodEntries = pgTable("mood_entries", {
  id: serial("id").primaryKey(),
  mood: text("mood").notNull(), // emoji representation
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const gratitudeEntries = pgTable("gratitude_entries", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const insertMoodSchema = createInsertSchema(moodEntries).omit({ id: true });
export const insertGratitudeSchema = createInsertSchema(gratitudeEntries).omit({ id: true });

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type MoodEntry = typeof moodEntries.$inferSelect;
export type InsertMoodEntry = z.infer<typeof insertMoodSchema>;
export type GratitudeEntry = typeof gratitudeEntries.$inferSelect;
export type InsertGratitudeEntry = z.infer<typeof insertGratitudeSchema>;
