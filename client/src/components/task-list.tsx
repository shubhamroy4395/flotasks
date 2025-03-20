import { motion, AnimatePresence } from "framer-motion";
import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";
import type { Task } from "@shared/schema";

interface TaskListProps {
  tasks: Task[];
  onComplete: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  category?: string;
}

const priorityColors = {
  0: "bg-gray-100",
  1: "bg-blue-100",
  2: "bg-yellow-100",
  3: "bg-red-100",
};

export function TaskList({ tasks, onComplete, onDelete, category }: TaskListProps) {
  const filteredTasks = category
    ? tasks.filter((task) => task.category === category)
    : tasks;

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {filteredTasks.map((task) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            layout
          >
            <Card
              className={`p-4 flex items-center justify-between ${
                priorityColors[task.priority as keyof typeof priorityColors]
              }`}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) => onComplete(task.id, checked as boolean)}
                />
                <span
                  className={`${
                    task.completed ? "line-through text-gray-500" : ""
                  }`}
                >
                  {task.content}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-red-500"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
