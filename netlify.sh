#!/bin/bash

# Debugging output
echo "Starting Netlify build script..."
echo "Current directory: $(pwd)"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Clean up any existing dist
echo "Cleaning up existing dist directory..."
rm -rf dist
mkdir -p dist

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the client
echo "Building client..."
npm run build:clean

# Check if dist directory exists and has content
echo "Checking dist directory content..."
ls -la dist

# Create functions directory if it doesn't exist
echo "Setting up functions directory..."
mkdir -p functions

# Check if functions/index.js exists, if not create it
if [ ! -f "functions/index.js" ]; then
  echo "Creating basic functions/index.js file..."
  cat > functions/index.js << 'EOL'
// API handler for Netlify Functions
exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
  
  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }
  
  // Parse path to determine which API endpoint was requested
  const path = event.path.replace('/.netlify/functions/index', '');
  const segments = path.split('/').filter(s => s);
  
  if (segments[0] === 'api') {
    // Return empty data for now - would connect to a database in production
    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify([]),
    };
  }
  
  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: "Not found" }),
  };
};
EOL
fi

echo "Build process completed!"
exit 0 