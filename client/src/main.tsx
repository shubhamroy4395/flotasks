import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./index.css";

// Get the Google Client ID from the environment variables
// In Vite, environment variables must be accessed with import.meta.env and prefixed with VITE_
// If not available in env, use the hardcoded value from .env
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "930481351011-kt5hkoihks2a60lvnac6mgkujg2e21ei.apps.googleusercontent.com";

// Log the client ID for debugging (without revealing the full ID)
if (googleClientId) {
  console.log(`Google OAuth initialized with client ID: ${googleClientId.substring(0, 8)}...`);
} else {
  console.error("Google Client ID is missing! Please add VITE_GOOGLE_CLIENT_ID to your environment variables.");
}

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <App />
  </GoogleOAuthProvider>
);
