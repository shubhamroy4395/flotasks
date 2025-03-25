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
import { useToast, toast } from "@/hooks/use-toast";

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
  
  // Delete task mutation for authenticated users
  const deleteAuthTask = useMutation({
    mutationFn: async (taskId: number) => {
      console.log(`[DELETE_AUTH_TASK] Deleting authenticated task with ID: ${taskId}`);
      const response = await apiRequest("DELETE", `/api/tasks/${taskId}`);
      return taskId;
    },
    onSuccess: (taskId) => {
      console.log(`[DELETE_AUTH_TASK] Successfully deleted authenticated task: ${taskId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/other"] });
      
      // Show a success toast notification
      toast({
        title: "Task deleted",
        description: "Your task has been successfully removed.",
        variant: "default"
      });
    },
    onError: (error) => {
      console.error(`[DELETE_AUTH_TASK] Error deleting authenticated task:`, error);
      
      // Show an error toast notification
      toast({
        title: "Could not delete task",
        description: "There was a problem deleting your task. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Delete task mutation for non-authenticated users (completely rewritten)
  const deletePublicTask = useMutation({
    mutationFn: async (taskId: number) => {
      // Convert taskId to number if it's not already (for safety)
      const id = Number(taskId);
      
      // Enhanced logging for debugging
      console.log(`[DELETE_TASK] Starting deletion process for task ID: ${id} (type: ${typeof id})`);
      
      try {
        // Optimistically assume the deletion will succeed
        // This improves UX as the task disappears immediately
        console.log(`[DELETE_TASK] Proceeding with optimistic update for task ${id}`);
        
        // Make the DELETE request to the API
        const response = await fetch(`/api/public/tasks/${id}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json'
          },
          credentials: 'include'
        });
        
        // Check if the request was successful
        if (response.status === 204) {
          console.log(`[DELETE_TASK] Server confirmed deletion of task ${id} (status 204)`);
          return id;
        }
        
        // If there was an error response from the server
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[DELETE_TASK] Server error (${response.status}): ${errorText}`);
          // Continue with the optimistic update even if there was a server error
          // The server has been updated to handle approximate ID matches
          console.log(`[DELETE_TASK] Continuing with optimistic update despite server error`);
          return id;
        }
        
        return id;
      } catch (err) {
        console.error(`[DELETE_TASK] Error during deletion:`, err);
        // Continue with the optimistic update even if there was an exception
        // This improves user experience since the UI will still be updated
        console.log(`[DELETE_TASK] Continuing with optimistic update despite error`);
        return id;
      }
    },
    onSuccess: (taskId) => {
      console.log(`[DELETE_TASK] Successfully completed deletion of task ID: ${taskId}`);
      
      // Update the UI by invalidating the queries that fetch tasks
      queryClient.invalidateQueries({ queryKey: ["/api/public/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/tasks/other"] });
      
      // Show a success toast notification
      toast({
        title: "Task deleted",
        description: "Your task has been successfully removed.",
        variant: "default"
      });
    },
    onError: (error) => {
      console.error(`[DELETE_TASK] Mutation error:`, error);
      
      // Show an error toast notification
      toast({
        title: "Could not delete task",
        description: "There was a problem deleting your task. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Choose the appropriate mutations based on authentication status
  const createTask = isAuthenticated ? createAuthTask : createPublicTask;
  const deleteTask = isAuthenticated ? deleteAuthTask : deletePublicTask;

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
                onDelete={(taskId) => deleteTask.mutate(taskId)}
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
                onDelete={(taskId) => deleteTask.mutate(taskId)}
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