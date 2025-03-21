import { useState, useEffect } from "react";
import { TaskList } from "@/components/task-list";
import { MoodTracker } from "@/components/mood-tracker";
import { GratitudeSection } from "@/components/gratitude-section";
import { ReminderSection } from "@/components/reminder-section";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays, subDays, isBefore, isAfter } from "date-fns";
import type { Task } from "@shared/schema";
import { GoalsSection } from "@/components/goals-section";
import { NotesSection } from "@/components/notes-section";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const TASK_STORAGE_KEY = 'tasks_cache_v1';
const MAX_DAYS = 8;

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Clean up old task data
  useEffect(() => {
    const cleanupOldData = () => {
      const storedData = localStorage.getItem(TASK_STORAGE_KEY);
      if (storedData) {
        const data = JSON.parse(storedData);
        const cutoffDate = subDays(new Date(), MAX_DAYS);

        // Filter out data older than MAX_DAYS
        const filteredData = Object.entries(data).reduce((acc: any, [date, tasks]) => {
          if (!isBefore(new Date(date), cutoffDate)) {
            acc[date] = tasks;
          }
          return acc;
        }, {});

        localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(filteredData));
      }
    };

    cleanupOldData();
    const cleanup = setInterval(cleanupOldData, 24 * 60 * 60 * 1000); // Run daily
    return () => clearInterval(cleanup);
  }, []);

  const formattedDate = format(selectedDate, 'yyyy-MM-dd');

  // Modified query to use cache and ensure date-specific tasks
  const { data: todayTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/today", formattedDate],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/today/${formattedDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch today tasks');
      }
      const tasks = await response.json();
      return tasks.filter(task => task.date === formattedDate);
    },
  });

  const { data: otherTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/other", formattedDate],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/other/${formattedDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch other tasks');
      }
      const tasks = await response.json();
      return tasks.filter(task => task.date === formattedDate);
    },
  });

  const createTask = useMutation({
    mutationFn: async (task: {
      content: string;
      priority: number;
      category: string;
    }) => {
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
      // Invalidate queries for both current date and tomorrow
      const tomorrow = format(addDays(selectedDate, 1), 'yyyy-MM-dd');
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today", formattedDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/other", formattedDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today", tomorrow] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/other", tomorrow] });

      toast({
        title: "Task moved",
        description: "Your task has been moved to tomorrow's list",
        duration: 3000,
      });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      // Invalidate queries for the current date only
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today", formattedDate] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/other", formattedDate] });
      toast({
        title: "Task deleted",
        description: "Your task has been removed",
        duration: 3000,
      });
    },
  });

  const navigateDate = (direction: "prev" | "next") => {
    setSelectedDate((prev) => {
      const newDate = direction === "prev" ? subDays(prev, 1) : addDays(prev, 1);

      // Limit navigation: 1 week back, 1 day forward
      const oneWeekAgo = subDays(new Date(), 7);
      const tomorrow = addDays(new Date(), 1);

      if (isBefore(newDate, oneWeekAgo)) {
        toast({
          title: "Navigation limit reached",
          description: "You can only view tasks up to one week in the past",
          duration: 3000,
        });
        return prev;
      }
      if (isAfter(newDate, tomorrow)) {
        toast({
          title: "Navigation limit reached",
          description: "You can only plan tasks up to tomorrow",
          duration: 3000,
        });
        return prev;
      }

      return newDate;
    });
  };

  const handleTaskMove = async (taskId: number, targetDate: Date) => {
    await moveTask.mutate({
      taskId,
      newDate: format(targetDate, "yyyy-MM-dd"),
    });
  };

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Date and Time Bar */}
      <div className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate("prev")}
              disabled={isBefore(subDays(selectedDate, 1), subDays(new Date(), 7))}
              className="hover:bg-gray-100 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold text-gray-800">
                {format(selectedDate, "EEEE")}
              </h2>
              <span className="text-gray-500">•</span>
              <span className="text-xl font-bold text-gray-700">
                {format(selectedDate, "dd-MMM-yyyy")}
              </span>
              {isToday && (
                <>
                  <span className="text-gray-500">•</span>
                  <span className="text-xl font-mono font-bold text-gray-700">
                    {format(currentTime, "HH:mm:ss")}
                  </span>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate("next")}
              disabled={isAfter(addDays(selectedDate, 1), addDays(new Date(), 1))}
              className="hover:bg-gray-100 disabled:opacity-50"
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
              onDeleteTask={(taskId) => deleteTask.mutate(taskId)}
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
              onDeleteTask={(taskId) => deleteTask.mutate(taskId)}
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