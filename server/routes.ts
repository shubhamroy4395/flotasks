import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, insertMoodSchema, insertGratitudeSchema, 
  insertCustomCardSchema, insertCustomTaskSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Tasks
  app.get("/api/tasks", async (_req, res) => {
    const tasks = await storage.getTasks();
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

  app.delete("/api/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    await storage.deleteTask(id);
    res.status(204).send();
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

  // Custom Cards
  app.get("/api/custom-cards", async (_req, res) => {
    const cards = await storage.getCustomCards();
    res.json(cards);
  });

  app.get("/api/custom-cards/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid card ID" });
    }
    const card = await storage.getCustomCard(id);
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }
    res.json(card);
  });

  app.post("/api/custom-cards", async (req, res) => {
    const result = insertCustomCardSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const card = await storage.createCustomCard(result.data);
    res.json(card);
  });

  app.patch("/api/custom-cards/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid card ID" });
    }
    try {
      const card = await storage.updateCustomCard(id, req.body);
      res.json(card);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/custom-cards/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid card ID" });
    }
    await storage.deleteCustomCard(id);
    res.status(204).send();
  });

  // Custom Tasks
  app.get("/api/custom-cards/:cardId/tasks", async (req, res) => {
    const cardId = parseInt(req.params.cardId);
    if (isNaN(cardId)) {
      return res.status(400).json({ error: "Invalid card ID" });
    }
    const tasks = await storage.getCustomCardTasks(cardId);
    res.json(tasks);
  });

  app.post("/api/custom-cards/:cardId/tasks", async (req, res) => {
    const cardId = parseInt(req.params.cardId);
    if (isNaN(cardId)) {
      return res.status(400).json({ error: "Invalid card ID" });
    }
    const result = insertCustomTaskSchema.safeParse({ ...req.body, cardId });
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const task = await storage.createCustomTask(result.data);
    res.json(task);
  });

  app.patch("/api/custom-cards/:cardId/tasks/:taskId", async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    try {
      const task = await storage.updateCustomTask(taskId, req.body);
      res.json(task);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/custom-cards/:cardId/tasks/:taskId", async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    await storage.deleteCustomTask(taskId);
    res.status(204).send();
  });

  const httpServer = createServer(app);
  return httpServer;
}