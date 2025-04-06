// This file acts as a proxy for all API requests
// It will route requests to the appropriate handler based on the path

// Helper to set CORS headers
const setCorsHeaders = (headers) => {
  return {
    ...headers,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
};

// Main handler function
export async function handler(event, context) {
  const path = event.path.replace('/.netlify/functions/index', '');
  const segments = path.split('/').filter(segment => segment);
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: setCorsHeaders({}),
      body: '',
    };
  }
  
  try {
    // Route based on the path segments
    if (segments[0] === 'api') {
      // API routes
      if (segments[1] === 'tasks') {
        // Tasks routes - /api/tasks/today or /api/tasks/other
        const category = segments[2] || '';
        
        if (event.httpMethod === 'GET') {
          return {
            statusCode: 200,
            headers: setCorsHeaders({"Content-Type": "application/json"}),
            body: JSON.stringify([]), // Return an empty array as default
          };
        } else if (event.httpMethod === 'POST') {
          return {
            statusCode: 201,
            headers: setCorsHeaders({"Content-Type": "application/json"}),
            body: JSON.stringify({ id: Date.now() }), // Mock new ID
          };
        } else if (event.httpMethod === 'DELETE') {
          return {
            statusCode: 204,
            headers: setCorsHeaders({}),
            body: '',
          };
        }
      } else if (segments[1] === 'mood') {
        // Mood routes - /api/mood
        return {
          statusCode: 200,
          headers: setCorsHeaders({"Content-Type": "application/json"}),
          body: JSON.stringify([]), // Return an empty array
        };
      } else if (segments[1] === 'notes') {
        // Notes routes - /api/notes
        return {
          statusCode: 200,
          headers: setCorsHeaders({"Content-Type": "application/json"}),
          body: JSON.stringify([]), // Return an empty array
        };
      } else if (segments[1] === 'gratitude') {
        // Gratitude routes - /api/gratitude
        return {
          statusCode: 200,
          headers: setCorsHeaders({"Content-Type": "application/json"}),
          body: JSON.stringify([]), // Return an empty array
        };
      } else if (segments[1] === 'data' && event.httpMethod === 'DELETE') {
        // Clear data route - /api/data
        return {
          statusCode: 204,
          headers: setCorsHeaders({}),
          body: '',
        };
      }
    }
    
    // If no route matches, return 404
    return {
      statusCode: 404,
      headers: setCorsHeaders({"Content-Type": "application/json"}),
      body: JSON.stringify({ error: "Route not found" }),
    };
  } catch (error) {
    console.error('Error handling request:', error);
    return {
      statusCode: 500,
      headers: setCorsHeaders({"Content-Type": "application/json"}),
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
} 