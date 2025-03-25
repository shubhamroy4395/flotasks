import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./index.css";

// Get the Google Client ID from the environment variables
// In Vite, environment variables must start with VITE_
const googleClientId = "930481351011-kt5hkoihks2a60lvnac6mgkujg2e21ei.apps.googleusercontent.com";

// Hard-code the Google Client ID for development
// In production, this would be loaded from environment variables
createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <App />
  </GoogleOAuthProvider>
);
