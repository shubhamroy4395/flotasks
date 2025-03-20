import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import type { Task } from "@shared/schema";

interface TaskListProps {
  tasks: Task[];
  onSave: (task: { content: string; priority: number; category: string }) => void;
}

const DEFAULT_TASKS = Array(10).fill(null).map((_, i) => ({
  id: i,
  content: "",
  isEditing: false
}));

const PRIORITIES = [
  { label: "L", value: 1 },
  { label: "N", value: 0 },
  { label: "H", value: 2 }
];

export function TaskList({ tasks, onSave }: TaskListProps) {
  const [entries, setEntries] = useState(DEFAULT_TASKS);
  const [activeTask, setActiveTask] = useState<{
    index: number;
    content: string;
    priority: number;
    eta: string;
  } | null>(null);

  const handleLineClick = (index: number) => {
    if (activeTask?.index === index) return;
    setActiveTask({
      index,
      content: entries[index].content,
      priority: 0,
      eta: ""
    });
  };

  const handleSave = () => {
    if (!activeTask) return;
    const { content, priority } = activeTask;
    onSave({
      content,
      priority,
      category: "todo"
    });
    setEntries(prev => 
      prev.map((entry, i) => 
        i === activeTask.index 
          ? { ...entry, content, isEditing: false }
          : entry
      )
    );
    setActiveTask(null);
  };

  return (
    <Card className="p-6 bg-[#fcfcfc]">
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.id}
            className="group flex items-center gap-4 p-2 border-b border-dashed border-gray-200 cursor-text"
            onClick={() => handleLineClick(index)}
            whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
          >
            {activeTask?.index === index ? (
              <div className="flex items-center gap-3 w-full">
                <Input
                  autoFocus
                  value={activeTask.content}
                  onChange={(e) => setActiveTask({ ...activeTask, content: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  className="flex-1 border-none bg-transparent focus:ring-0 placeholder:text-gray-400"
                  placeholder="What's on your mind?"
                />
                <div className="flex gap-2">
                  {PRIORITIES.map(({ label, value }) => (
                    <Button
                      key={label}
                      size="sm"
                      variant={activeTask.priority === value ? "default" : "outline"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTask({ ...activeTask, priority: value });
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                  <Input
                    type="time"
                    value={activeTask.eta}
                    onChange={(e) => setActiveTask({ ...activeTask, eta: e.target.value })}
                    className="w-24"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button onClick={handleSave}>Save</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 w-full text-gray-600">
                {entry.content || "Click to add a task..."}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </Card>
  );
}