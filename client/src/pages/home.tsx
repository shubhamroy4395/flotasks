import { useState, useEffect } from "react";
import { TaskList } from "@/components/task-list";
import { MoodTracker } from "@/components/mood-tracker";
import { GratitudeSection } from "@/components/gratitude-section";
import { ReminderSection } from "@/components/reminder-section";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Task } from "@shared/schema";
import { GoalsSection } from "@/components/goals-section";
import { NotesSection } from "@/components/notes-section";
import { useAuth } from "@/contexts/auth-context";
import { NavBar } from "@/components/nav-bar";
import { startTimer, endTimer } from "@/lib/performance";
import { PerformanceMonitor } from "@/components/performance-monitor";

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Start measuring page load time
  useEffect(() => {
    startTimer('home_page_load');
    
    return () => {
      endTimer('home_page_load', 'Page.HomeLoad');
    };
  }, []);

  // Handle page refresh/exit confirmation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Clear all data on every refresh and clear database data
  useEffect(() => {
    if (!isAuthenticated) return;

    // Clear all data from the cache
    queryClient.clear();

    // Invalidate all queries to force fresh data fetch
    queryClient.invalidateQueries();

    // Clear database data
    const clearData = async () => {
      try {
        await apiRequest("DELETE", "/api/data");
      } catch (error) {
        console.error("Failed to clear data:", error);
      }
    };

    clearData();
  }, [queryClient, isAuthenticated]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Queries for tasks when authenticated
  const { data: authTodayTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/today"],
    enabled: isAuthenticated,
  });

  const { data: authOtherTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/other"],
    enabled: isAuthenticated,
  });

  // Queries for tasks when not authenticated
  const { data: publicTodayTasks } = useQuery<Task[]>({
    queryKey: ["/api/public/tasks/today"],
    enabled: !isAuthenticated,
  });

  const { data: publicOtherTasks } = useQuery<Task[]>({
    queryKey: ["/api/public/tasks/other"],
    enabled: !isAuthenticated,
  });
  
  // Track data loading times
  useEffect(() => {
    if (isAuthenticated) {
      startTimer('auth_tasks_fetch');
      return () => {
        endTimer('auth_tasks_fetch', 'API.FetchAuthTasks');
      };
    } else {
      startTimer('public_tasks_fetch');
      return () => {
        endTimer('public_tasks_fetch', 'API.FetchPublicTasks');
      };
    }
  }, [isAuthenticated, authTodayTasks, authOtherTasks, publicTodayTasks, publicOtherTasks]);

  // Get the appropriate tasks based on authentication status
  const todayTasks = isAuthenticated ? authTodayTasks : publicTodayTasks;
  const otherTasks = isAuthenticated ? authOtherTasks : publicOtherTasks;

  // Create task mutation for authenticated users
  const createAuthTask = useMutation({
    mutationFn: async (task: { content: string; priority: number; category: string }) => {
      await apiRequest("POST", "/api/tasks", task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/other"] });
    },
  });

  // Create task mutation for non-authenticated users
  const createPublicTask = useMutation({
    mutationFn: async (task: { content: string; priority: number; category: string }) => {
      await apiRequest("POST", "/api/public/tasks", task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/tasks/other"] });
    },
  });

  // Choose the appropriate mutation based on authentication status
  const createTask = isAuthenticated ? createAuthTask : createPublicTask;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Top Date/Time Bar */}
      <div className="bg-white border-b border-gray-100 py-4 px-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-gray-800">
              {format(currentTime, 'EEEE')}
            </h2>
            <span className="text-gray-500">•</span>
            <span className="text-xl font-bold text-gray-700">
              {format(currentTime, 'dd-MMM-yyyy')}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-xl font-mono font-bold text-gray-700">
              {format(currentTime, 'HH:mm:ss')}
            </span>
          </div>
          
          {/* User account dropdown */}
          <NavBar />
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Today's Tasks (wider) */}
          <div className="lg:col-span-5">
            <PerformanceMonitor componentName="TodayTaskList">
              <TaskList
                title="Today's Tasks"
                tasks={todayTasks || []}
                onSave={(task) => createTask.mutate({ ...task, category: "today" })}
              />
            </PerformanceMonitor>
          </div>

          {/* Middle Column - Goals and Other Tasks */}
          <div className="lg:col-span-4 space-y-6">
            <PerformanceMonitor componentName="GoalsSection">
              <GoalsSection />
            </PerformanceMonitor>
            
            <PerformanceMonitor componentName="OtherTaskList">
              <TaskList
                title="Other Tasks"
                tasks={otherTasks || []}
                onSave={(task) => createTask.mutate({ ...task, category: "other" })}
              />
            </PerformanceMonitor>
          </div>

          {/* Right Column - Mood, Gratitude, Reminders */}
          <div className="lg:col-span-3 space-y-6">
            {/* Performance monitoring for each section */}
            <PerformanceMonitor componentName="MoodTracker">
              <MoodTracker />
            </PerformanceMonitor>
            
            <PerformanceMonitor componentName="GratitudeSection">
              <GratitudeSection />
            </PerformanceMonitor>
            
            <PerformanceMonitor componentName="ReminderSection">
              <ReminderSection />
            </PerformanceMonitor>
            
            <PerformanceMonitor componentName="NotesSection">
              <NotesSection />
            </PerformanceMonitor>
          </div>
        </div>
      </div>
    </div>
  );
}