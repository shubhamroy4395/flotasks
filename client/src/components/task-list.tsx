import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import type { Task } from "@shared/schema";

interface TaskListProps {
  tasks: Task[];
  onSave: (task: { content: string; priority: number; category: string }) => void;
}

const DEFAULT_TASKS = Array(10).fill(null).map((_, i) => ({
  id: i,
  content: "",
  isEditing: false,
  completed: false
}));

const PRIORITIES = [
  { label: "L", value: 1, color: "text-blue-600 hover:bg-blue-50" },
  { label: "N", value: 0, color: "text-gray-600 hover:bg-gray-50" },
  { label: "O", value: 2, color: "text-red-600 hover:bg-red-50" }
];

const TIME_SLOTS = [
  "5min", "10min", "15min", "30min", "45min", "1h", "2h"
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

  const toggleComplete = (index: number) => {
    setEntries(prev => 
      prev.map((entry, i) => 
        i === index 
          ? { ...entry, completed: !entry.completed }
          : entry
      )
    );
  };

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader>
        <CardTitle>Today's Tasks</CardTitle>
      </CardHeader>
      <div className="p-6 space-y-2">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.id}
            className="group flex items-center gap-4 py-2 border-b border-dashed border-gray-200"
            initial={false}
            animate={{ opacity: 1 }}
          >
            <Checkbox
              checked={entry.completed}
              onCheckedChange={() => toggleComplete(index)}
              className="h-5 w-5"
            />

            {activeTask?.index === index ? (
              <div className="flex items-center gap-3 w-full">
                <Input
                  autoFocus
                  value={activeTask.content}
                  onChange={(e) => setActiveTask({ ...activeTask, content: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  className="flex-1 border-none shadow-none bg-transparent focus:ring-0 placeholder:text-gray-400"
                  placeholder="What needs to be done?"
                />
                <div className="flex gap-2 items-center">
                  {PRIORITIES.map(({ label, value, color }) => (
                    <Button
                      key={label}
                      size="sm"
                      variant="ghost"
                      className={`px-2 ${color} ${activeTask.priority === value ? 'bg-opacity-20' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTask({ ...activeTask, priority: value });
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                  <select
                    value={activeTask.eta}
                    onChange={(e) => setActiveTask({ ...activeTask, eta: e.target.value })}
                    className="border-none bg-transparent text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">Time</option>
                    {TIME_SLOTS.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                  <Button 
                    onClick={handleSave}
                    size="sm"
                    variant="ghost"
                    className="text-green-600 hover:bg-green-50"
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className={`flex items-center gap-3 w-full cursor-text ${entry.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
                onClick={() => handleLineClick(index)}
              >
                {entry.content || "Click to add a task..."}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </Card>
  );
}