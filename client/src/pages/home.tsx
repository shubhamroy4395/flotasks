import { useState, useEffect } from "react";
import { TaskListV2 } from "@/components/task-list-v2";
import { MoodTracker } from "@/components/mood-tracker";
import { GratitudeSection } from "@/components/gratitude-section";
import { ReminderSection } from "@/components/reminder-section";
import { format } from "date-fns";
import { GoalsSection } from "@/components/goals-section";
import { NotesSection } from "@/components/notes-section";
import { useAuth } from "@/contexts/auth-context";
import { NavBar } from "@/components/nav-bar";
import { startTimer, endTimer } from "@/lib/performance";
import { PerformanceMonitor } from "@/components/performance-monitor";
import { useTaskStore } from "@/stores/taskStore";

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Get the task store
  const { fetchTasks, isLoading: tasksLoading } = useTaskStore();
  
  // Start measuring page load time
  useEffect(() => {
    startTimer('home_page_load');
    
    // Fetch tasks when component mounts
    fetchTasks();
    
    return () => {
      endTimer('home_page_load', 'Page.HomeLoad');
    };
  }, [fetchTasks]);

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Track data loading times
  useEffect(() => {
    startTimer('task_store_fetch');
    return () => {
      endTimer('task_store_fetch', 'API.FetchTasks');
    };
  }, []);

  // Combine loading states
  const isLoading = authLoading || tasksLoading;

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
              <TaskListV2
                title="Today's Tasks"
                category="today"
              />
            </PerformanceMonitor>
          </div>

          {/* Middle Column - Goals and Other Tasks */}
          <div className="lg:col-span-4 space-y-6">
            <PerformanceMonitor componentName="GoalsSection">
              <GoalsSection />
            </PerformanceMonitor>
            
            <PerformanceMonitor componentName="OtherTaskList">
              <TaskListV2
                title="Other Tasks"
                category="other"
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