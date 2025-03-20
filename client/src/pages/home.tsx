import { useState, useEffect } from "react";
import { TaskList } from "@/components/task-list";
import { MoodTracker } from "@/components/mood-tracker";
import { GratitudeSection } from "@/components/gratitude-section";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Moon } from "lucide-react";
import type { Task } from "@shared/schema";

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const createTask = useMutation({
    mutationFn: async (task: { content: string; priority: number; category: string }) => {
      await apiRequest("POST", "/api/tasks", task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Date and Time Bar */}
      <div className="bg-white border-b border-gray-200 py-4 px-8 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
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

      <div className="max-w-7xl mx-auto p-8 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Task Section */}
          <div className="xl:col-span-3 space-y-6">
            <TaskList
              tasks={tasks || []}
              onSave={(task) => createTask.mutate(task)}
            />
          </div>

          {/* Side Panels */}
          <div className="space-y-6">
            <MoodTracker />
            <GratitudeSection />
          </div>
        </div>
      </div>
    </div>
  );
}