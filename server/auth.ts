import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { User } from "@shared/schema";

// Setup Passport
passport.use(
  new LocalStrategy(
    {
      usernameField: "email", // Use email as the username field
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        // Find user by email
        const user = await storage.getUserByEmail(email);
        
        // If user not found or password doesn't match
        if (!user) {
          return done(null, false, { message: "Incorrect email or password" });
        }
        
        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect email or password" });
        }
        
        // Successful login
        return done(null, user);
      } catch (err) {
        console.error("Login error:", err);
        return done(err);
      }
    }
  )
);

// User serialization/deserialization for session
passport.serializeUser((user: any, done) => {
  // Only serialize the user id
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    // Fetch user from database
    const user = await storage.getUserById(id);
    
    if (!user) {
      return done(new Error("User not found"), null);
    }
    
    // Create a sanitized user object without password
    const { password, ...userWithoutPassword } = user;
    
    done(null, userWithoutPassword as User);
  } catch (err) {
    console.error("Deserialization error:", err);
    done(err, null);
  }
});

// Middleware to check if user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

// Setup session and passport middleware
export function setupAuth(app: Express) {
  const PgSession = connectPgSimple(session);
  
  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: 'session',
        createTableIfMissing: true, // Create session table if it doesn't exist
      }),
      secret: process.env.SESSION_SECRET || "my-journal-app-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
      },
    })
  );
  
  app.use(passport.initialize());
  app.use(passport.session());
}

// Helper functions
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}