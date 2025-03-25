import { type Task, type InsertTask, type MoodEntry, type InsertMoodEntry, type GratitudeEntry, type InsertGratitudeEntry, tasks, moodEntries, gratitudeEntries, type Note, type InsertNote, notes, type User, type InsertUser, users } from "@shared/schema";
import { db } from "./db";
import { desc, eq, and } from "drizzle-orm";

export interface IStorage {
  // User Authentication
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Tasks
  getTasks(category: string, userId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

  // Mood
  getMoodEntries(userId: number): Promise<MoodEntry[]>;
  createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry>;

  // Gratitude
  getGratitudeEntries(userId: number): Promise<GratitudeEntry[]>;
  createGratitudeEntry(entry: InsertGratitudeEntry): Promise<GratitudeEntry>;
  deleteGratitudeEntry(id: number): Promise<void>;

  // Notes
  getNotes(userId: number): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  deleteNote(id: number): Promise<void>;

  // Clear All Data
  clearAllData(): Promise<void>;
  clearUserData(userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User Authentication Methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserById(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Tasks Methods
  async getTasks(category: string, userId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.category, category),
          eq(tasks.userId, userId)
        )
      )
      .orderBy(desc(tasks.timestamp));
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

  // Mood Methods
  async getMoodEntries(userId: number): Promise<MoodEntry[]> {
    return await db
      .select()
      .from(moodEntries)
      .where(eq(moodEntries.userId, userId))
      .orderBy(desc(moodEntries.timestamp))
      .limit(10);
  }

  async createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry> {
    const [newEntry] = await db.insert(moodEntries).values(entry).returning();
    return newEntry;
  }

  // Gratitude Methods
  async getGratitudeEntries(userId: number): Promise<GratitudeEntry[]> {
    return await db
      .select()
      .from(gratitudeEntries)
      .where(eq(gratitudeEntries.userId, userId))
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

  // Notes Methods
  async getNotes(userId: number): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
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

  // Data Clearing Methods
  async clearAllData(): Promise<void> {
    await db.delete(tasks);
    await db.delete(moodEntries);
    await db.delete(gratitudeEntries);
    await db.delete(notes);
    await db.delete(users);
  }

  async clearUserData(userId: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.userId, userId));
    await db.delete(moodEntries).where(eq(moodEntries.userId, userId));
    await db.delete(gratitudeEntries).where(eq(gratitudeEntries.userId, userId));
    await db.delete(notes).where(eq(notes.userId, userId));
  }
}

export const storage = new DatabaseStorage();