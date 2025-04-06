// Netlify serverless function for clearing data
export async function handler(event, context) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "DELETE, OPTIONS",
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
    // This function would normally clear data from a database
    // In our case, we'll just return a success response
    // The client-side code will handle clearing localStorage
    if (event.httpMethod === "DELETE") {
      return {
        statusCode: 204,
        headers,
        body: "", // No content for successful DELETE
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