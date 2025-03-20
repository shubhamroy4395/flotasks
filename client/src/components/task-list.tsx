import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { ArrowUpDown, Clock } from "lucide-react";
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
  { label: "L", value: 1, color: "text-blue-600 bg-blue-50", title: "Leverage" },
  { label: "N", value: 0, color: "text-gray-600 bg-gray-50", title: "Neutral" },
  { label: "O", value: 2, color: "text-red-600 bg-red-50", title: "Overhead" }
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
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  const toggleSort = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    setEntries(prev => [...prev].sort((a, b) => {
      if (!a.content && !b.content) return 0;
      if (!a.content) return 1;
      if (!b.content) return -1;
      return sortDirection === 'asc' ? 
        a.priority - b.priority : 
        b.priority - a.priority;
    }));
  };

  const getPriorityBadge = (priority: number) => {
    const priorityInfo = PRIORITIES.find(p => p.value === priority);
    if (!priorityInfo) return null;
    return (
      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${priorityInfo.color}`}>
        {priorityInfo.label}
      </span>
    );
  };

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Today's Tasks</CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={toggleSort}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowUpDown className="h-4 w-4 mr-1" />
          Sort by Priority
        </Button>
      </CardHeader>
      <div className="p-6 space-y-2">
        <AnimatePresence>
          {entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="group flex items-center gap-4 py-2 border-b border-dashed border-gray-200"
              whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-sm text-gray-400 w-6">{String(index + 1).padStart(2, '0')}</span>
              <Checkbox
                checked={entry.completed}
                onCheckedChange={() => toggleComplete(index)}
                className="h-5 w-5"
              />

              {activeTask?.index === index ? (
                <motion.div 
                  className="flex items-center gap-3 w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Input
                    autoFocus
                    value={activeTask.content}
                    onChange={(e) => setActiveTask({ ...activeTask, content: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    className="flex-1 border-none shadow-none bg-transparent focus:ring-0 placeholder:text-gray-400"
                    placeholder="What needs to be done?"
                  />
                  <div className="flex gap-2 items-center">
                    {PRIORITIES.map(({ label, value, color, title }) => (
                      <Button
                        key={label}
                        size="sm"
                        variant="ghost"
                        className={`px-2 ${color}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTask({ ...activeTask, priority: value });
                        }}
                        title={title}
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
                </motion.div>
              ) : (
                <motion.div 
                  className={`flex items-center gap-3 w-full cursor-text ${entry.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
                  onClick={() => handleLineClick(index)}
                  layout
                >
                  <span className="flex-1">
                    {entry.content || "Click to add a task..."}
                  </span>
                  {entry.content && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {getPriorityBadge(entry.priority)}
                      {entry.eta && (
                        <span className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {entry.eta}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  );
}