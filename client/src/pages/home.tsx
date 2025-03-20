import { useState, useEffect } from "react";
import { TaskList } from "@/components/task-list";
import { MoodTracker } from "@/components/mood-tracker";
import { GratitudeSection } from "@/components/gratitude-section";
import { ReminderSection } from "@/components/reminder-section";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Moon } from "lucide-react";
import type { Task } from "@shared/schema";
import { GoalsSection } from "@/components/goals-section";

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const queryClient = useQueryClient();

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

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Date and Time Bar */}
      <div className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold">{format(currentTime, 'dd-MMM-yyyy')}</h2>
            <span className="text-gray-500">|</span>
            <span className="text-xl text-gray-600">{format(currentTime, 'HH:mm:ss')}</span>
          </div>
          <button className="p-2 rounded-full hover:bg-gray-100">
            <Moon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Today's Tasks */}
          <div className="col-span-4">
            <TaskList
              title="Today's Tasks"
              tasks={todayTasks || []}
              onSave={(task) => createTask.mutate({ ...task, category: "today" })}
            />
          </div>

          {/* Middle Column - Goals and Other Tasks */}
          <div className="col-span-4 space-y-6">
            <GoalsSection />
            <TaskList
              title="Other Tasks"
              tasks={otherTasks || []}
              onSave={(task) => createTask.mutate({ ...task, category: "other" })}
            />
          </div>

          {/* Right Column - Mood, Gratitude, Reminders */}
          <div className="col-span-4 space-y-6">
            <MoodTracker />
            <GratitudeSection />
            <ReminderSection />
          </div>
        </div>
      </div>
    </div>
  );
}