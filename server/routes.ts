import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertMoodSchema, insertGratitudeSchema, insertNoteSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Tasks
  app.get("/api/tasks/:category/:date", async (req, res) => {
    const { category, date } = req.params;
    const tasks = await storage.getTasks(category, date);
    res.json(tasks);
  });

  app.post("/api/tasks", async (req, res) => {
    const result = insertTaskSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const task = await storage.createTask(result.data);
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