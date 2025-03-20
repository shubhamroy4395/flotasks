import { type Task, type InsertTask, type MoodEntry, type InsertMoodEntry, 
  type GratitudeEntry, type InsertGratitudeEntry, type CustomCard, type InsertCustomCard,
  type CustomTask, type InsertCustomTask, tasks, moodEntries, gratitudeEntries,
  customCards, customTasks } from "@shared/schema";
import { db } from "./db";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  // Tasks
  getTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

  // Custom Cards
  getCustomCards(): Promise<CustomCard[]>;
  getCustomCard(id: number): Promise<CustomCard | undefined>;
  createCustomCard(card: InsertCustomCard): Promise<CustomCard>;
  updateCustomCard(id: number, card: Partial<CustomCard>): Promise<CustomCard>;
  deleteCustomCard(id: number): Promise<void>;

  // Custom Tasks
  getCustomCardTasks(cardId: number): Promise<CustomTask[]>;
  createCustomTask(task: InsertCustomTask): Promise<CustomTask>;
  updateCustomTask(id: number, task: Partial<CustomTask>): Promise<CustomTask>;
  deleteCustomTask(id: number): Promise<void>;

  // Mood
  getMoodEntries(): Promise<MoodEntry[]>;
  createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry>;

  // Gratitude
  getGratitudeEntries(): Promise<GratitudeEntry[]>;
  createGratitudeEntry(entry: InsertGratitudeEntry): Promise<GratitudeEntry>;
  deleteGratitudeEntry(id: number): Promise<void>;
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

  async deleteGratitudeEntry(id: number): Promise<void> {
    await db.delete(gratitudeEntries).where(eq(gratitudeEntries.id, id));
  }

  // Custom Cards
  async getCustomCards(): Promise<CustomCard[]> {
    return await db.select().from(customCards).orderBy(desc(customCards.isPinned), desc(customCards.timestamp));
  }

  async getCustomCard(id: number): Promise<CustomCard | undefined> {
    const [card] = await db.select().from(customCards).where(eq(customCards.id, id));
    return card;
  }

  async createCustomCard(card: InsertCustomCard): Promise<CustomCard> {
    const [newCard] = await db.insert(customCards).values(card).returning();
    return newCard;
  }

  async updateCustomCard(id: number, updates: Partial<CustomCard>): Promise<CustomCard> {
    const [updatedCard] = await db
      .update(customCards)
      .set(updates)
      .where(eq(customCards.id, id))
      .returning();

    if (!updatedCard) {
      throw new Error(`Custom card ${id} not found`);
    }

    return updatedCard;
  }

  async deleteCustomCard(id: number): Promise<void> {
    await db.delete(customCards).where(eq(customCards.id, id));
  }

  // Custom Tasks
  async getCustomCardTasks(cardId: number): Promise<CustomTask[]> {
    return await db.select().from(customTasks).where(eq(customTasks.cardId, cardId));
  }

  async createCustomTask(task: InsertCustomTask): Promise<CustomTask> {
    const [newTask] = await db.insert(customTasks).values(task).returning();
    return newTask;
  }

  async updateCustomTask(id: number, updates: Partial<CustomTask>): Promise<CustomTask> {
    const [updatedTask] = await db
      .update(customTasks)
      .set(updates)
      .where(eq(customTasks.id, id))
      .returning();

    if (!updatedTask) {
      throw new Error(`Custom task ${id} not found`);
    }

    return updatedTask;
  }

  async deleteCustomTask(id: number): Promise<void> {
    await db.delete(customTasks).where(eq(customTasks.id, id));
  }
}

export const storage = new DatabaseStorage();