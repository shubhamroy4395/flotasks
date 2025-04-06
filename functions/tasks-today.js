// Netlify serverless function for tasks/today endpoint
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
    // For simplicity in this example, we'll use localStorage on the client side
    // In a production app, you would use a proper database like Fauna, MongoDB, etc.
    if (event.httpMethod === "GET") {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([]), // Return empty array initially
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
} 