import { TaskInput } from "@/components/ui/task-input";
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

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: number }) => {
      await apiRequest("PATCH", `/api/tasks/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center mb-8">Today's Tasks</h1>

        <TaskInput onSubmit={(task) => createTask.mutate(task)} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">To-Do List</h2>
            {tasks && (
              <TaskList
                tasks={tasks}
                category="todo"
                onComplete={(id, completed) => updateTask.mutate({ id, completed })}
                onDelete={(id) => deleteTask.mutate(id)}
              />
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Goals & Reminders</h2>
            {tasks && (
              <>
                <TaskList
                  tasks={tasks}
                  category="goal"
                  onComplete={(id, completed) => updateTask.mutate({ id, completed })}
                  onDelete={(id) => deleteTask.mutate(id)}
                />
                <TaskList
                  tasks={tasks}
                  category="reminder"
                  onComplete={(id, completed) => updateTask.mutate({ id, completed })}
                  onDelete={(id) => deleteTask.mutate(id)}
                />
              </>
            )}
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
