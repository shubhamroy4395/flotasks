import { useState, useEffect } from "react";
import { TaskList } from "@/components/task-list";
import { MoodTracker } from "@/components/mood-tracker";
import { GratitudeSection } from "@/components/gratitude-section";
import { ReminderSection } from "@/components/reminder-section";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays, subDays } from "date-fns";
import type { Task } from "@shared/schema";
import { GoalsSection } from "@/components/goals-section";
import { NotesSection } from "@/components/notes-section";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');

  const { data: todayTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/today", formattedDate],
    queryFn: () => 
      fetch(`/api/tasks/today/${formattedDate}`).then(res => res.json())
  });

  const { data: otherTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/other", formattedDate],
    queryFn: () => 
      fetch(`/api/tasks/other/${formattedDate}`).then(res => res.json())
  });

  const createTask = useMutation({
    mutationFn: async (task: { content: string; priority: number; category: string }) => {
      await apiRequest("POST", "/api/tasks", { ...task, date: formattedDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today", formattedDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/other", formattedDate] });
    },
  });

  const moveTask = useMutation({
    mutationFn: async ({ taskId, newDate }: { taskId: number; newDate: string }) => {
      await apiRequest("POST", `/api/tasks/${taskId}/move`, { newDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task moved successfully",
        description: "The task has been moved to the selected date.",
        duration: 3000,
      });
    },
  });

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => 
      direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1)
    );
  };

  const handleTaskMove = async (taskId: number, targetDate: Date) => {
    await moveTask.mutate({
      taskId,
      newDate: format(targetDate, 'yyyy-MM-dd')
    });
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Date and Time Bar */}
      <div className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate('prev')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold text-gray-800">
                {format(selectedDate, 'EEEE')}
              </h2>
              <span className="text-gray-500">•</span>
              <span className="text-xl font-bold text-gray-700">
                {format(selectedDate, 'dd-MMM-yyyy')}
              </span>
              {isToday && (
                <>
                  <span className="text-gray-500">•</span>
                  <span className="text-xl font-mono font-bold text-gray-700">
                    {format(currentTime, 'HH:mm:ss')}
                  </span>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate('next')}
              className="hover:bg-gray-100"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {!isToday && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Go to Today
            </Button>
          )}
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Today's Tasks (wider) */}
          <div className="lg:col-span-5">
            <TaskList
              title="Today's Tasks"
              tasks={todayTasks || []}
              onSave={(task) => createTask.mutate({ ...task, category: "today" })}
              onMoveTask={handleTaskMove}
              selectedDate={selectedDate}
            />
          </div>

          {/* Middle Column - Goals and Other Tasks */}
          <div className="lg:col-span-4 space-y-6">
            <GoalsSection />
            <TaskList
              title="Other Tasks"
              tasks={otherTasks || []}
              onSave={(task) => createTask.mutate({ ...task, category: "other" })}
              onMoveTask={handleTaskMove}
              selectedDate={selectedDate}
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