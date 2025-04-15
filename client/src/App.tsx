import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { StudyModeButton } from "@/components/study-with-me/StudyModeButton";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import DebugPage from "@/pages/debug";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/debug" component={DebugPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <StudyModeButton />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
