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
import { NotesSection } from "@/components/notes-section"; // Import the new component


export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
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

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: todayTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/today"],
  });

  const createTask = useMutation({
    mutationFn: async (task: { content: string; priority: number; category: string }) => {
      await apiRequest("POST", "/api/tasks", task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/today"] });
    },
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Date and Time Bar */}
      <div className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10 shadow-md">
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
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Today's Tasks */}
          <div className="lg:col-span-5">
            <TaskList
              title="Today's Tasks"
              tasks={todayTasks || []}
              onSave={(task) => createTask.mutate({ ...task, category: "today" })}
            />
          </div>

          {/* Middle Column - Goals and Mood */}
          <div className="lg:col-span-4 space-y-6">
            <GoalsSection />
            <MoodTracker />
          </div>

          {/* Right Column - Gratitude and Reminders */}
          <div className="lg:col-span-3 space-y-6">
            <GratitudeSection />
            <ReminderSection />
            <NotesSection />
          </div>
        </div>
      </div>
    </div>
  );
}