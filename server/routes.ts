import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertMoodSchema, insertGratitudeSchema, insertNoteSchema } from "@shared/schema";
import debug from 'debug';

const log = debug('app:routes');

export async function registerRoutes(app: Express): Promise<Server> {
  // Tasks
  app.get("/api/tasks/:category/:date", async (req, res) => {
    const { category, date } = req.params;
    log('Fetching tasks for category: %s, date: %s', category, date);
    const tasks = await storage.getTasks(category, date);
    log(`Found ${tasks.length} tasks for ${category} on ${date}:`, tasks);
    
    // Verify date matching
    const mismatchedTasks = tasks.filter(task => task.date !== date);
    if (mismatchedTasks.length > 0) {
      log('WARNING: Found tasks with mismatched dates:', mismatchedTasks);
    }
    
    res.json(tasks);
  });

  app.post("/api/tasks", async (req, res) => {
    const result = insertTaskSchema.safeParse(req.body);
    if (!result.success) {
      log('Task validation failed:', result.error);
      return res.status(400).json({ error: result.error });
    }

    // Additional date validation
    if (!result.data.date) {
      log('Task creation failed: Missing date');
      return res.status(400).json({ error: 'Date is required' });
    }

    log('Creating task:', result.data);
    const task = await storage.createTask(result.data);
    log('Created task:', task);
    res.json(task);
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    try {
      const task = await storage.updateTask(id, req.body);
      res.json(task);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  });

  app.post("/api/tasks/:id/move", async (req, res) => {
    const id = parseInt(req.params.id);
    const { newDate } = req.body;
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    if (!newDate) {
      return res.status(400).json({ error: "New date is required" });
    }
    try {
      const task = await storage.moveTaskToDate(id, newDate);
      res.json(task);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    try {
      await storage.deleteTask(id);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  });

  // Mood
  app.get("/api/mood", async (_req, res) => {
    const entries = await storage.getMoodEntries();
    res.json(entries);
  });

  app.post("/api/mood", async (req, res) => {
    const result = insertMoodSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const entry = await storage.createMoodEntry(result.data);
    res.json(entry);
  });

  // Gratitude
  app.get("/api/gratitude", async (_req, res) => {
    const entries = await storage.getGratitudeEntries();
    res.json(entries);
  });

  app.post("/api/gratitude", async (req, res) => {
    const result = insertGratitudeSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const entry = await storage.createGratitudeEntry(result.data);
    res.json(entry);
  });

  app.delete("/api/gratitude/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid gratitude entry ID" });
    }
    try {
      await storage.deleteGratitudeEntry(id);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  });

  // Notes
  app.get("/api/notes", async (_req, res) => {
    const notes = await storage.getNotes();
    res.json(notes);
  });

  app.post("/api/notes", async (req, res) => {
    const result = insertNoteSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const note = await storage.createNote(result.data);
    res.json(note);
  });

  app.delete("/api/notes/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid note ID" });
    }
    try {
      await storage.deleteNote(id);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  });

  // Clear all data
  app.delete("/api/data", async (_req, res) => {
    await storage.clearAllData();
    res.status(204).send();
  });

  const httpServer = createServer(app);
  return httpServer;
}