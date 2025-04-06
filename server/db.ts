import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Create mock db connection for development
const mockPool = {
  query: async () => ({ rows: [] }),
  release: () => {},
  end: () => {},
  on: () => {},
  // Add other required methods that might be called
} as unknown as Pool;

// Use the mock database connection instead of requiring a real one
export const pool = mockPool;
export const db = drizzle({ client: mockPool, schema });
