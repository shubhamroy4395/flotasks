#!/bin/bash

# Debugging output
echo "Starting Netlify build script..."
echo "Current directory: $(pwd)"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Clean up any existing dist directories
echo "Cleaning up existing dist directories..."
rm -rf dist client/dist

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install client dependencies and build
echo "Building client..."
cd client
npm install
npm run build
cd ..

# Check if client/dist directory exists and has content
echo "Checking client/dist directory content..."
ls -la client/dist

# Copy build output to the correct dist directory
echo "Copying build output to dist directory..."
mkdir -p dist
cp -r client/dist/* dist/

# Create _redirects file for Netlify
echo "Creating _redirects file for Netlify..."
cat > dist/_redirects << 'EOL'
/api/*  /.netlify/functions/index  200
/*      /index.html                200
EOL

# Add a special CSS fix directly to dist
echo "Adding CSS fix for progress bars..."
cat >> dist/assets/index*.css << 'EOL'
/* Progress bar fixes for Netlify */
[role="progressbar"] > div > div {
  background: var(--theme-progress-foreground, hsl(var(--primary))) !important;
  height: 100% !important;
  border-radius: 9999px !important;
}
.progress-card-blue [role="progressbar"] > div > div {
  background: linear-gradient(90deg, #3b82f6, #2563eb) !important;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.3) !important;
}
.progress-card-green [role="progressbar"] > div > div {
  background: linear-gradient(90deg, #10b981, #059669) !important;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.3) !important;  
}
.progress-card-purple [role="progressbar"] > div > div {
  background: linear-gradient(90deg, #8b5cf6, #7c3aed) !important;
  box-shadow: 0 0 10px rgba(139, 92, 246, 0.3) !important;
}
.progress-card-amber [role="progressbar"] > div > div {
  background: linear-gradient(90deg, #f59e0b, #d97706) !important;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.3) !important;
}
EOL

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

echo "Final dist directory content:"
ls -la dist/

echo "Build process completed!"
exit 0 