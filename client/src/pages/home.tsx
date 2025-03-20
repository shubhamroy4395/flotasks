import { useState } from "react";
import { TaskList } from "@/components/task-list";
import { MoodTracker } from "@/components/mood-tracker";
import { GratitudeSection } from "@/components/gratitude-section";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";

export default function Home() {
  const queryClient = useQueryClient();

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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center mb-8">Today's Tasks</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TaskList
              tasks={tasks || []}
              onSave={(task) => createTask.mutate(task)}
            />
          </div>

          <div className="space-y-6">
            <MoodTracker />
            <GratitudeSection />
          </div>
        </div>
      </div>
    </div>
  );
}