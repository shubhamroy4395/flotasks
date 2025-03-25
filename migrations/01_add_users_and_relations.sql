-- Create session table for express-session
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY,
  "username" text NOT NULL,
  "email" text NOT NULL,
  "password" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create unique indices
CREATE UNIQUE INDEX IF NOT EXISTS "email_idx" ON "users" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "username_idx" ON "users" ("username");

-- Modify existing tables
-- tasks table
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "user_id" integer REFERENCES "users" ("id");

-- mood_entries table
ALTER TABLE "mood_entries" ADD COLUMN IF NOT EXISTS "user_id" integer REFERENCES "users" ("id");

-- gratitude_entries table
ALTER TABLE "gratitude_entries" ADD COLUMN IF NOT EXISTS "user_id" integer REFERENCES "users" ("id");

-- notes table
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "user_id" integer REFERENCES "users" ("id");