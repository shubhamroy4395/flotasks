// build.js - Helper script for Netlify build process
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure client/dist directory exists
const distDir = path.join(__dirname, 'client', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Run the client build
console.log('📦 Building client...');
try {
  execSync('cd client && vite build', { stdio: 'inherit' });
  console.log('✅ Client build successful');
} catch (error) {
  console.error('❌ Client build failed', error);
  process.exit(1);
}

// Ensure functions directory exists
const functionsDir = path.join(__dirname, 'functions');
if (!fs.existsSync(functionsDir)) {
  fs.mkdirSync(functionsDir, { recursive: true });
  console.log('📁 Created functions directory');
}

// Check if we need to create basic function files
const tasksFile = path.join(functionsDir, 'tasks-today.js');
if (!fs.existsSync(tasksFile)) {
  console.log('📝 Creating basic function files...');
  // Create a basic tasks function
  const tasksFn = `
export async function handler(event, context) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }

  try {
    if (event.httpMethod === "GET") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([]),
      };
    }
    
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Method not supported" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error" }),
    };
  }
}`;

  fs.writeFileSync(tasksFile, tasksFn);
  console.log('✅ Created functions/tasks-today.js');
}

console.log('🎉 Build completed successfully!'); 