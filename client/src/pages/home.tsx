import { useState, useEffect } from "react";
import { ResizableTaskList } from "@/components/resizable-task-list";
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
import { DailySummary } from "@/components/daily-summary";
import { EnhancedThemeToggle } from "@/components/enhanced-theme-toggle";


export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [goals, setGoals] = useState<Array<{ id: number; content: string; completed: boolean }>>([]);
  const queryClient = useQueryClient();

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
  }, [queryClient]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: todayTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/today"],
  });

  const { data: otherTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/other"],
  });

  const createTask = useMutation({
    mutationFn: async (task: { content: string; priority: number; category: string }) => {
      await apiRequest("POST", "/api/tasks", task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/other"] });
    },
  });
  
  const deleteTask = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/other"] });
    },
  });
  
  const updateTask = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Task> }) => {
      await apiRequest("PATCH", `/api/tasks/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/other"] });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Date and Time Bar */}
      <div className="bg-card border-b border-border py-4 px-6 sticky top-0 z-10 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-foreground">
              {format(currentTime, 'EEEE')}
            </h2>
            <span className="text-muted-foreground">•</span>
            <span className="text-xl font-bold text-foreground">
              {format(currentTime, 'dd-MMM-yyyy')}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xl font-bold text-foreground">
              {format(currentTime, 'HH:mm:ss')}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold tracking-tight text-primary font-tangerine hover:text-accent-foreground transition-all duration-300 hover:scale-105">
              Flo Tasks
            </h1>
            <EnhancedThemeToggle />
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Daily Summary - Top Full Width Card Row */}
        <div className="mb-6">
          <DailySummary 
            todayTasks={todayTasks || []} 
            otherTasks={otherTasks || []} 
            goals={goals || []}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Today's Tasks (wider) */}
          <div className="lg:col-span-5">
            <ResizableTaskList
              title="Today's Tasks"
              tasks={todayTasks || []}
              onSave={(task) => createTask.mutate({ ...task, category: "today" })}
              onDelete={(id) => deleteTask.mutate(id)}
              onUpdate={(id, updates) => updateTask.mutate({ id, updates })}
              defaultWidth={550}
              defaultHeight={500}
              minWidth={300}
              minHeight={250}
            />
          </div>

          {/* Middle Column - Goals and Backlog */}
          <div className="lg:col-span-4 space-y-6">
            <GoalsSection onGoalsChange={setGoals} />
            <ResizableTaskList
              title="Backlog"
              tasks={otherTasks || []}
              onSave={(task) => createTask.mutate({ ...task, category: "other" })}
              onDelete={(id) => deleteTask.mutate(id)}
              onUpdate={(id, updates) => updateTask.mutate({ id, updates })}
              defaultWidth={450}
              defaultHeight={400}
              minWidth={250}
              minHeight={200}
            />
          </div>

          {/* Right Column - Mood, Gratitude, Reminders */}
          <div className="lg:col-span-3 space-y-6">
            <MoodTracker />
            <GratitudeSection />
            <ReminderSection />
            <NotesSection />
          </div>
        </div>
      </div>
    </div>
  );
}