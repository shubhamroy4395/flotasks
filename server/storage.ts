import { type Task, type InsertTask, type MoodEntry, type InsertMoodEntry, type GratitudeEntry, type InsertGratitudeEntry } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private tasks: Map<number, Task>;
  private moodEntries: Map<number, MoodEntry>;
  private gratitudeEntries: Map<number, GratitudeEntry>;
  private currentIds: { tasks: number; mood: number; gratitude: number };

  constructor() {
    this.tasks = new Map();
    this.moodEntries = new Map();
    this.gratitudeEntries = new Map();
    this.currentIds = { tasks: 1, mood: 1, gratitude: 1 };
  }

  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.currentIds.tasks++;
    const newTask: Task = { ...task, id };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Task ${id} not found`);
    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
    this.tasks.delete(id);
  }

  async getMoodEntries(): Promise<MoodEntry[]> {
    return Array.from(this.moodEntries.values());
  }

  async createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry> {
    const id = this.currentIds.mood++;
    const newEntry: MoodEntry = { ...entry, id };
    this.moodEntries.set(id, newEntry);
    return newEntry;
  }

  async getGratitudeEntries(): Promise<GratitudeEntry[]> {
    return Array.from(this.gratitudeEntries.values());
  }

  async createGratitudeEntry(entry: InsertGratitudeEntry): Promise<GratitudeEntry> {
    const id = this.currentIds.gratitude++;
    const newEntry: GratitudeEntry = { ...entry, id };
    this.gratitudeEntries.set(id, newEntry);
    return newEntry;
  }
}

export const storage = new MemStorage();
