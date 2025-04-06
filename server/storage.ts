import { type Task, type InsertTask, type MoodEntry, type InsertMoodEntry, type GratitudeEntry, type InsertGratitudeEntry, tasks, moodEntries, gratitudeEntries, type Note, type InsertNote, notes, goals, type Goal, type InsertGoal } from "@shared/schema";
import { db } from "./db";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  // Tasks
  getTasks(category: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

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
  async getTasks(category: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.category, category))
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

export class InMemoryStorage implements IStorage {
  private tasks: Task[] = [];
  private moodEntries: MoodEntry[] = [];
  private gratitudeEntries: GratitudeEntry[] = [];
  private notes: Note[] = [];
  private nextId = 1;

  async getTasks(category: string): Promise<Task[]> {
    return this.tasks
      .filter(task => task.category === category)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async createTask(task: InsertTask): Promise<Task> {
    const newTask: Task = {
      id: this.nextId++,
      content: task.content,
      completed: task.completed ?? false,
      priority: task.priority ?? 0,
      category: task.category,
      eta: task.eta,
      difficulty: task.difficulty,
      timestamp: new Date()
    };
    this.tasks.push(newTask);
    return newTask;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    const index = this.tasks.findIndex(task => task.id === id);
    if (index === -1) {
      throw new Error(`Task ${id} not found`);
    }
    const updatedTask = { ...this.tasks[index], ...updates };
    this.tasks[index] = updatedTask;
    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
    const index = this.tasks.findIndex(task => task.id === id);
    if (index !== -1) {
      this.tasks.splice(index, 1);
    }
  }

  async getMoodEntries(): Promise<MoodEntry[]> {
    return [...this.moodEntries]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }

  async createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry> {
    const newEntry: MoodEntry = {
      id: this.nextId++,
      mood: entry.mood,
      timestamp: new Date()
    };
    this.moodEntries.push(newEntry);
    return newEntry;
  }

  async getGratitudeEntries(): Promise<GratitudeEntry[]> {
    return [...this.gratitudeEntries]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }

  async createGratitudeEntry(entry: InsertGratitudeEntry): Promise<GratitudeEntry> {
    const newEntry: GratitudeEntry = {
      id: this.nextId++,
      content: entry.content,
      timestamp: new Date()
    };
    this.gratitudeEntries.push(newEntry);
    return newEntry;
  }

  async deleteGratitudeEntry(id: number): Promise<void> {
    const index = this.gratitudeEntries.findIndex(entry => entry.id === id);
    if (index !== -1) {
      this.gratitudeEntries.splice(index, 1);
    }
  }

  async getNotes(): Promise<Note[]> {
    return [...this.notes]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }

  async createNote(note: InsertNote): Promise<Note> {
    const newNote: Note = {
      id: this.nextId++,
      content: note.content,
      timestamp: new Date()
    };
    this.notes.push(newNote);
    return newNote;
  }

  async deleteNote(id: number): Promise<void> {
    const index = this.notes.findIndex(note => note.id === id);
    if (index !== -1) {
      this.notes.splice(index, 1);
    }
  }

  async clearAllData(): Promise<void> {
    this.tasks = [];
    this.moodEntries = [];
    this.gratitudeEntries = [];
    this.notes = [];
  }
}

export const storage = new InMemoryStorage();