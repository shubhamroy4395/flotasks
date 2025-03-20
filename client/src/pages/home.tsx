import { useState, useEffect } from "react";
import { TaskList } from "@/components/task-list";
import { MoodTracker } from "@/components/mood-tracker";
import { GratitudeSection } from "@/components/gratitude-section";
import { ReminderSection } from "@/components/reminder-section";
import { CustomCard } from "@/components/custom-card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Moon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Task, CustomCard as CustomCardType } from "@shared/schema";

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: customCards } = useQuery<CustomCardType[]>({
    queryKey: ["/api/custom-cards"],
  });

  const createTask = useMutation({
    mutationFn: async (task: { content: string; priority: number; category: string }) => {
      await apiRequest("POST", "/api/tasks", task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const handleCardPin = (id: number) => {
    queryClient.invalidateQueries({ queryKey: ["/api/custom-cards"] });
  };

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

            {/* Custom Cards */}
            {customCards?.filter(card => card.isPinned).map(card => (
              <CustomCard
                key={card.id}
                id={card.id}
                defaultTitle={card.title}
                onPin={handleCardPin}
              />
            ))}

            {isCreatingCard && (
              <CustomCard
                onPin={handleCardPin}
              />
            )}

            {!isCreatingCard && (
              <Button
                variant="outline"
                size="lg"
                className="w-full bg-gradient-to-r from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100 border-none font-medium"
                onClick={() => setIsCreatingCard(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Custom Card
              </Button>
            )}

            {/* Unpinned Custom Cards */}
            {customCards?.filter(card => !card.isPinned).map(card => (
              <CustomCard
                key={card.id}
                id={card.id}
                defaultTitle={card.title}
                onPin={handleCardPin}
              />
            ))}
          </div>

          {/* Side Panels */}
          <div className="space-y-6">
            <MoodTracker />
            <GratitudeSection />
            <ReminderSection />
          </div>
        </div>
      </div>
    </div>
  );
}