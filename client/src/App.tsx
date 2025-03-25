import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Header/Banner */}
      <header className="w-full bg-white shadow-sm py-4 px-6 mb-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {currentDateTime.toLocaleDateString()} {currentDateTime.toLocaleTimeString()}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 
            bg-clip-text text-transparent 
            drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.2)]
            hover:drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]
            transition-all duration-300">
            Flo Tasks
          </h1>
        </div>
      </header>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;