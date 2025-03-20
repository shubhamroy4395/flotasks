import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pin, PinOff } from "lucide-react";
import { TaskList } from "./task-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { CustomCard as CustomCardType, CustomTask } from "@shared/schema";

interface CustomCardProps {
  id?: number;
  defaultTitle?: string;
  onPin?: (id: number) => void;
}

export function CustomCard({ id, defaultTitle = "", onPin }: CustomCardProps) {
  const [isEditing, setIsEditing] = useState(!id);
  const [title, setTitle] = useState(defaultTitle);
  const queryClient = useQueryClient();

  const { data: card } = useQuery<CustomCardType>({
    queryKey: [`/api/custom-cards/${id}`],
    enabled: !!id,
  });

  const { data: tasks } = useQuery<CustomTask[]>({
    queryKey: [`/api/custom-cards/${id}/tasks`],
    enabled: !!id,
  });

  const createCard = useMutation({
    mutationFn: async (data: { title: string }) => {
      const res = await apiRequest("POST", "/api/custom-cards", data);
      return res.json();
    },
    onSuccess: (newCard) => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-cards"] });
      setIsEditing(false);
    },
  });

  const updatePin = useMutation({
    mutationFn: async (isPinned: boolean) => {
      await apiRequest("PATCH", `/api/custom-cards/${id}`, { isPinned });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-cards"] });
      if (onPin && id) onPin(id);
    },
  });

  const createTask = useMutation({
    mutationFn: async (data: { content: string; priority: number }) => {
      const res = await apiRequest("POST", `/api/custom-cards/${id}/tasks`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/custom-cards/${id}/tasks`] });
    },
  });

  const handleSave = () => {
    if (!title.trim()) return;
    createCard.mutate({ title: title.trim() });
  };

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100">
        {isEditing ? (
          <div className="flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Card Title"
              className="text-lg font-semibold border-none focus:ring-0 focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>
        ) : (
          <CardTitle className="font-semibold">{card?.title || title}</CardTitle>
        )}
        
        <div className="flex items-center gap-2">
          {id && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updatePin.mutate(!card?.isPinned)}
              className={`${card?.isPinned ? 'text-blue-600' : 'text-gray-400'} hover:text-blue-700`}
            >
              {card?.isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
            </Button>
          )}
          {isEditing && (
            <Button onClick={handleSave} size="sm">
              Save
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {id && (
          <TaskList
            tasks={tasks || []}
            onSave={(task) => createTask.mutate(task)}
          />
        )}
      </CardContent>
    </Card>
  );
}
