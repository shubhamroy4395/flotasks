import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertTaskSchema, 
  insertMoodSchema, 
  insertGratitudeSchema, 
  insertNoteSchema,
  loginSchema,
  registerSchema,
  insertUserSchema,
  User
} from "@shared/schema";
import passport from "passport";
import { isAuthenticated, hashPassword } from "./auth";

// Type for authenticated request
interface AuthRequest extends Request {
  user?: User;
  isAuthenticated(): boolean;
  logIn(user: any, callback: (err: any) => void): void;
  logout(callback: (err: any) => void): void;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Validate request body
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.format() });
      }
      
      // Check if user already exists
      const existingUserByEmail = await storage.getUserByEmail(result.data.email);
      if (existingUserByEmail) {
        return res.status(400).json({ error: "Email already in use" });
      }
      
      const existingUserByUsername = await storage.getUserByUsername(result.data.username);
      if (existingUserByUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(result.data.password);
      
      // Create user
      const user = await storage.createUser({
        username: result.data.username,
        email: result.data.email,
        password: hashedPassword
      });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "An error occurred during registration" });
    }
  });
  
  app.post("/api/auth/login", (req, res, next) => {
    // Validate request body
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.format() });
    }
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: info.message || "Authentication failed" });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        
        return res.json({
          message: "Login successful",
          user: userWithoutPassword
        });
      });
    })(req, res, next);
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.logout(function(err) {
      if (err) { 
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });
  
  app.get("/api/auth/user", (req: AuthRequest, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Protected Routes
  // Tasks
  app.get("/api/tasks/:category", isAuthenticated, async (req: AuthRequest, res) => {
    const category = req.params.category;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const tasks = await storage.getTasks(category, userId);
    res.json(tasks);
  });

  app.post("/api/tasks", isAuthenticated, async (req: AuthRequest, res) => {
    const result = insertTaskSchema.safeParse({
      ...req.body,
      userId: req.user?.id
    });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    const task = await storage.createTask(result.data);
    res.json(task);
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req, res) => {
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

  app.delete("/api/tasks/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    await storage.deleteTask(id);
    res.status(204).send();
  });

  // Mood
  app.get("/api/mood", isAuthenticated, async (req: AuthRequest, res) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const entries = await storage.getMoodEntries(userId);
    res.json(entries);
  });

  app.post("/api/mood", isAuthenticated, async (req: AuthRequest, res) => {
    const result = insertMoodSchema.safeParse({
      ...req.body,
      userId: req.user?.id
    });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    const entry = await storage.createMoodEntry(result.data);
    res.json(entry);
  });

  // Gratitude
  app.get("/api/gratitude", isAuthenticated, async (req: AuthRequest, res) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const entries = await storage.getGratitudeEntries(userId);
    res.json(entries);
  });

  app.post("/api/gratitude", isAuthenticated, async (req: AuthRequest, res) => {
    const result = insertGratitudeSchema.safeParse({
      ...req.body,
      userId: req.user?.id
    });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    const entry = await storage.createGratitudeEntry(result.data);
    res.json(entry);
  });

  app.delete("/api/gratitude/:id", isAuthenticated, async (req, res) => {
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
  app.get("/api/notes", isAuthenticated, async (req: AuthRequest, res) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    const notes = await storage.getNotes(userId);
    res.json(notes);
  });

  app.post("/api/notes", isAuthenticated, async (req: AuthRequest, res) => {
    const result = insertNoteSchema.safeParse({
      ...req.body,
      userId: req.user?.id
    });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    const note = await storage.createNote(result.data);
    res.json(note);
  });

  app.delete("/api/notes/:id", isAuthenticated, async (req, res) => {
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

  // Clear all data - Admin only
  app.delete("/api/data", async (_req, res) => {
    await storage.clearAllData();
    res.status(204).send();
  });
  
  // Clear user data
  app.delete("/api/user/data", isAuthenticated, async (req: AuthRequest, res) => {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    await storage.clearUserData(userId);
    res.status(204).send();
  });

  const httpServer = createServer(app);
  return httpServer;
}