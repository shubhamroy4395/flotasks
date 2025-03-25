import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./index.css";

// Get the Google Client ID from the environment variables
// In Vite, environment variables must start with VITE_
const googleClientId = "965201933554-kkrgve0d4q0cqr19l16trnlbk45qb6ft.apps.googleusercontent.com";

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <App />
  </GoogleOAuthProvider>
);
