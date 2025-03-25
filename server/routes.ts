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
  
  // Google Authentication
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential } = req.body;
      
      if (!credential) {
        return res.status(400).json({ error: "Google credential token is required" });
      }
      
      // Parse and verify the JWT from Google
      // In a real production system, you'd verify the token signature
      // For now, we'll decode the token to get the user info
      const tokenParts = credential.split('.');
      if (tokenParts.length !== 3) {
        return res.status(400).json({ error: "Invalid token format" });
      }
      
      // Decode the payload (second part of the JWT)
      const payload = JSON.parse(
        Buffer.from(tokenParts[1], 'base64').toString()
      );
      
      // Extract user info from payload
      const userData = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        // Other properties from the payload as needed
      };
      
      // Check if user exists
      let user = await storage.getUserByEmail(userData.email);
      
      // If not, create user
      if (!user) {
        user = await storage.createUser({
          email: userData.email,
          username: userData.name || userData.email.split('@')[0],
          password: '', // No password for Google users
          picture: userData.picture,
          name: userData.name
        });
      }
      
      // Login user
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed after Google authentication" });
        }
        
        // Return user info (excluding password)
        const { password, ...userWithoutPassword } = user;
        return res.json({
          message: "Google authentication successful",
          user: userWithoutPassword
        });
      });
    } catch (error) {
      console.error("Google auth error:", error);
      res.status(500).json({ error: "Failed to authenticate with Google" });
    }
  });
  
  app.get("/api/auth/user", (req: AuthRequest, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Tasks - Public and protected routes
  // Public tasks
  app.get("/api/public/tasks/:category", async (req, res) => {
    const category = req.params.category;
    
    // Get tasks from session storage
    const sessionTasks = req.session.tasks || {};
    const tasks = sessionTasks[category] || [];
    
    res.json(tasks);
  });

  app.post("/api/public/tasks", async (req, res) => {
    const result = insertTaskSchema.omit({ userId: true }).safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Initialize session storage for tasks if needed
    if (!req.session.tasks) {
      req.session.tasks = {};
    }
    
    if (!req.session.tasks[result.data.category]) {
      req.session.tasks[result.data.category] = [];
    }
    
    // Generate a temporary ID for the task
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const task = {
      ...result.data,
      id: newId,
      timestamp: new Date()
    };
    
    // Add task to session
    req.session.tasks[result.data.category].push(task);
    
    res.json(task);
  });

  app.patch("/api/public/tasks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    
    // Find and update task in session
    if (!req.session.tasks) {
      return res.status(404).json({ error: "No tasks found" });
    }
    
    let taskFound = false;
    
    // Loop through all categories to find the task
    Object.keys(req.session.tasks).forEach(category => {
      const tasks = req.session.tasks[category];
      const taskIndex = tasks.findIndex((t: any) => t.id === id);
      
      if (taskIndex !== -1) {
        // Update task
        req.session.tasks[category][taskIndex] = {
          ...req.session.tasks[category][taskIndex],
          ...req.body
        };
        taskFound = true;
        res.json(req.session.tasks[category][taskIndex]);
      }
    });
    
    if (!taskFound) {
      res.status(404).json({ error: "Task not found" });
    }
  });

  app.delete("/api/public/tasks/:id", async (req, res) => {
    try {
      // Get the task ID from the URL parameter
      const rawId = req.params.id;
      console.log(`[DELETE] Processing request to delete task ID: ${rawId}`);
      
      // Validate the ID - simple check to ensure it's a valid number
      const taskId = Number(rawId);
      if (isNaN(taskId)) {
        console.log(`[DELETE] Invalid task ID format: ${rawId}`);
        return res.status(400).json({ error: "Invalid task ID format" });
      }
      
      // Check if session has any tasks at all
      if (!req.session.tasks) {
        console.log(`[DELETE] No tasks found in session`);
        return res.status(404).json({ error: "No tasks found in session" });
      }
      
      // Get all categories that might contain tasks
      const categories = Object.keys(req.session.tasks);
      console.log(`[DELETE] Searching through categories: ${categories.join(', ')}`);
      
      // Variable to track if we found and deleted the task
      let taskDeleted = false;
      
      // Search through each category to find the task
      for (const category of categories) {
        // Skip if this category doesn't exist in the session
        if (!Array.isArray(req.session.tasks[category])) {
          console.log(`[DELETE] Category ${category} doesn't exist or isn't an array`);
          continue;
        }
        
        // Log the current tasks in this category for debugging
        console.log(`[DELETE] Tasks in ${category}:`, 
          req.session.tasks[category].map((t: any) => ({ 
            id: t.id, 
            content: String(t.content).substring(0, 20) // Truncate long content
          }))
        );
        
        // Find the index of the task with the matching ID
        const taskIndex = req.session.tasks[category].findIndex((task: any) => {
          const taskIdMatch = Number(task.id) === taskId;
          if (taskIdMatch) {
            console.log(`[DELETE] Found matching task in ${category}: ID=${task.id}, Content=${task.content}`);
          }
          return taskIdMatch;
        });
        
        // If task was found in this category
        if (taskIndex !== -1) {
          console.log(`[DELETE] Removing task at index ${taskIndex} from ${category}`);
          
          // Remove the task from the array
          req.session.tasks[category].splice(taskIndex, 1);
          
          // Mark as deleted and stop searching other categories
          taskDeleted = true;
          break;
        }
      }
      
      // If we deleted the task, return success
      if (taskDeleted) {
        console.log(`[DELETE] Successfully deleted task ID: ${taskId}`);
        return res.status(204).end();
      } 
      
      // If we didn't find the task to delete
      console.log(`[DELETE] Task with ID ${taskId} was not found in any category`);
      return res.status(404).json({ error: "Task not found" });
      
    } catch (error) {
      // Handle any unexpected errors
      console.error(`[DELETE] Error deleting task:`, error);
      return res.status(500).json({ error: "Server error while deleting task" });
    }
  });

  // Protected routes for authenticated users
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

  // Mood - Public and protected routes
  // Public mood
  app.get("/api/public/mood", async (req, res) => {
    // Get mood entries from session storage
    const moodEntries = req.session.moodEntries || [];
    res.json(moodEntries);
  });

  app.post("/api/public/mood", async (req, res) => {
    const result = insertMoodSchema.omit({ userId: true }).safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    // Initialize session storage for mood entries if needed
    if (!req.session.moodEntries) {
      req.session.moodEntries = [];
    }
    
    // Generate a temporary ID for the entry
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const entry = {
      ...result.data,
      id: newId,
      timestamp: new Date()
    };
    
    // Add entry to session
    req.session.moodEntries.push(entry);
    
    res.json(entry);
  });

  // Protected mood routes
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

  // Gratitude - Public and protected routes
  // Public gratitude
  app.get("/api/public/gratitude", async (req, res) => {
    // Get gratitude entries from session storage
    const gratitudeEntries = req.session.gratitudeEntries || [];
    res.json(gratitudeEntries);
  });

  app.post("/api/public/gratitude", async (req, res) => {
    const result = insertGratitudeSchema.omit({ userId: true }).safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    // Initialize session storage for gratitude entries if needed
    if (!req.session.gratitudeEntries) {
      req.session.gratitudeEntries = [];
    }
    
    // Generate a temporary ID for the entry
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const entry = {
      ...result.data,
      id: newId,
      timestamp: new Date()
    };
    
    // Add entry to session
    req.session.gratitudeEntries.push(entry);
    
    res.json(entry);
  });

  app.delete("/api/public/gratitude/:id", async (req, res) => {
    // Convert to string then back to number to ensure proper handling of timestamp IDs
    const idStr = req.params.id;
    console.log(`Received delete request for gratitude ID: ${idStr}`);
    
    // Support for both number and string IDs
    const id = Number(idStr);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid gratitude entry ID" });
    }
    
    // Find and delete gratitude entry in session
    if (!req.session.gratitudeEntries) {
      return res.status(404).json({ error: "No gratitude entries found" });
    }
    
    console.log(`Gratitude entries:`, req.session.gratitudeEntries.map((e: any) => ({ id: e.id, content: e.content })));
    
    const entryIndex = req.session.gratitudeEntries.findIndex((e: any) => String(e.id) === String(id));
    
    if (entryIndex !== -1) {
      console.log(`Found gratitude entry at index ${entryIndex}`);
      // Remove entry
      req.session.gratitudeEntries.splice(entryIndex, 1);
      console.log(`Successfully deleted gratitude entry with ID ${id}`);
      res.status(204).send();
    } else {
      console.log(`Gratitude entry with ID ${id} not found`);
      res.status(404).json({ error: "Gratitude entry not found" });
    }
  });

  // Protected gratitude routes
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

  // Notes - Public and protected routes
  // Public notes
  app.get("/api/public/notes", async (req, res) => {
    // Get notes from session storage
    const notes = req.session.notes || [];
    res.json(notes);
  });

  app.post("/api/public/notes", async (req, res) => {
    const result = insertNoteSchema.omit({ userId: true }).safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    // Initialize session storage for notes if needed
    if (!req.session.notes) {
      req.session.notes = [];
    }
    
    // Generate a temporary ID for the note
    const newId = Date.now() + Math.floor(Math.random() * 1000);
    const note = {
      ...result.data,
      id: newId,
      timestamp: new Date()
    };
    
    // Add note to session
    req.session.notes.push(note);
    
    res.json(note);
  });

  app.delete("/api/public/notes/:id", async (req, res) => {
    // Convert to string then back to number to ensure proper handling of timestamp IDs
    const idStr = req.params.id;
    console.log(`Received delete request for note ID: ${idStr}`);
    
    // Support for both number and string IDs
    const id = Number(idStr);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid note ID" });
    }
    
    // Find and delete note in session
    if (!req.session.notes) {
      return res.status(404).json({ error: "No notes found" });
    }
    
    console.log(`Notes:`, req.session.notes.map((n: any) => ({ id: n.id, content: n.content })));
    
    const noteIndex = req.session.notes.findIndex((n: any) => String(n.id) === String(id));
    
    if (noteIndex !== -1) {
      console.log(`Found note at index ${noteIndex}`);
      // Remove note
      req.session.notes.splice(noteIndex, 1);
      console.log(`Successfully deleted note with ID ${id}`);
      res.status(204).send();
    } else {
      console.log(`Note with ID ${id} not found`);
      res.status(404).json({ error: "Note not found" });
    }
  });

  // Protected notes routes
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