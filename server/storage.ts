import { type Task, type InsertTask, type MoodEntry, type InsertMoodEntry, type GratitudeEntry, type InsertGratitudeEntry, tasks, moodEntries, gratitudeEntries, type Note, type InsertNote, notes } from "@shared/schema";
import { db } from "./db";
import { desc, eq, and } from "drizzle-orm";

export interface IStorage {
  // Tasks
  getTasks(category: string, date: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  moveTaskToDate(id: number, newDate: string): Promise<Task>;

  // Mood
  getMoodEntries(): Promise<MoodEntry[]>;
  createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry>;

  // Gratitude
  getGratitudeEntries(): Promise<GratitudeEntry[]>;
  createGratitudeEntry(entry: InsertGratitudeEntry): Promise<GratitudeEntry>;
  deleteGratitudeEntry(id: number): Promise<void>;

  // Notes
  getNotes(): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  deleteNote(id: number): Promise<void>;

  // Clear All Data
  clearAllData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getTasks(category: string, date: string): Promise<Task[]> {
    const result = await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.category, category),
        eq(tasks.date, date)
      ))
      .orderBy(desc(tasks.timestamp));
    
    // Additional validation to ensure date matching
    return result.filter(task => task.date === date);
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

  async moveTaskToDate(id: number, newDate: string): Promise<Task> {
    const [movedTask] = await db
      .update(tasks)
      .set({ date: newDate })
      .where(eq(tasks.id, id))
      .returning();

    if (!movedTask) {
      throw new Error(`Task ${id} not found`);
    }

    return movedTask;
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

  async deleteGratitudeEntry(id: number): Promise<void> {
    await db.delete(gratitudeEntries).where(eq(gratitudeEntries.id, id));
  }

  async getNotes(): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .orderBy(desc(notes.timestamp))
      .limit(10);
  }

  async createNote(note: InsertNote): Promise<Note> {
    const [newNote] = await db.insert(notes).values(note).returning();
    return newNote;
  }

  async deleteNote(id: number): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }

  async clearAllData(): Promise<void> {
    await db.delete(tasks);
    await db.delete(moodEntries);
    await db.delete(gratitudeEntries);
    await db.delete(notes);
  }
}

export const storage = new DatabaseStorage();