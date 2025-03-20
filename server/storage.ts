import { type Task, type InsertTask, type MoodEntry, type InsertMoodEntry, type GratitudeEntry, type InsertGratitudeEntry, tasks, moodEntries, gratitudeEntries } from "@shared/schema";
import { db } from "./db";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  // Tasks
  getTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

  // Mood
  getMoodEntries(): Promise<MoodEntry[]>;
  createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry>;

  // Gratitude
  getGratitudeEntries(): Promise<GratitudeEntry[]>;
  createGratitudeEntry(entry: InsertGratitudeEntry): Promise<GratitudeEntry>;
}

export class DatabaseStorage implements IStorage {
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();

    if (!updatedTask) {
      throw new Error(`Task ${id} not found`);
    }

    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getMoodEntries(): Promise<MoodEntry[]> {
    return await db
      .select()
      .from(moodEntries)
      .orderBy(desc(moodEntries.timestamp))
      .limit(10);
  }

  async createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry> {
    const [newEntry] = await db.insert(moodEntries).values(entry).returning();
    return newEntry;
  }

  async getGratitudeEntries(): Promise<GratitudeEntry[]> {
    return await db
      .select()
      .from(gratitudeEntries)
      .orderBy(desc(gratitudeEntries.timestamp))
      .limit(10);
  }

  async createGratitudeEntry(entry: InsertGratitudeEntry): Promise<GratitudeEntry> {
    const [newEntry] = await db.insert(gratitudeEntries).values(entry).returning();
    return newEntry;
  }
}

export const storage = new DatabaseStorage();