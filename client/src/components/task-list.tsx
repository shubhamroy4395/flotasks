import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { ArrowUpDown, Clock, Plus } from "lucide-react";
import type { Task } from "@shared/schema";

interface TaskListProps {
  tasks: Task[];
  onSave: (task: { content: string; priority: number; category: string }) => void;
  title?: string;
}

const PRIORITIES = [
  { label: "L", value: 3, color: "bg-blue-100 text-blue-700", title: "Leverage" },
  { label: "N", value: 2, color: "bg-gray-100 text-gray-700", title: "Neutral" },
  { label: "O", value: 1, color: "bg-red-100 text-red-700", title: "Overhead" }
];

const TIME_SLOTS = [
  "5min", "10min", "15min", "30min", "45min", "1h", "2h"
];

export function TaskList({ tasks, onSave, title = "Today's Tasks" }: TaskListProps) {
  const [entries, setEntries] = useState(
    Array(10).fill(null).map((_, i) => ({
      id: i,
      content: "",
      isEditing: false,
      completed: false,
      priority: 0,
      eta: ""
    }))
  );
  const [activeTask, setActiveTask] = useState<{
    index: number;
    content: string;
    priority: number;
    eta: string;
  } | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleLineClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const entry = entries[index];
    setActiveTask({
      index,
      content: entry.content || "",
      priority: entry.priority || 0,
      eta: entry.eta || ""
    });
  };

  const handleSave = () => {
    if (!activeTask) return;
    const { content, priority } = activeTask;

    if (content.trim()) {
      onSave({
        content,
        priority,
        category: "todo"
      });
    }

    setEntries(prev =>
      prev.map((entry, i) =>
        i === activeTask.index
          ? { ...entry, content: content.trim(), priority, isEditing: false }
          : entry
      )
    );
    setActiveTask(null);
  };

  const toggleComplete = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
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
        b.priority - a.priority :
        a.priority - b.priority;
    }));
  };

  const addMoreTasks = () => {
    setEntries(prev => [
      ...prev,
      ...Array(5).fill(null).map((_, i) => ({
        id: prev.length + i,
        content: "",
        isEditing: false,
        completed: false,
        priority: 0,
        eta: ""
      }))
    ]);
  };

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 p-4">
        <div>
          <CardTitle className="font-semibold">{title}</CardTitle>
          <p className="text-sm text-gray-500 mt-1 italic">Click any line to add a task</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSort}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            Sort
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addMoreTasks}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add More
          </Button>
        </div>
      </CardHeader>

      <div className="p-4 space-y-2">
        <AnimatePresence mode="sync">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              className="group flex items-center gap-3 py-2 px-2 rounded-md hover:bg-gray-50 transition-colors"
              onClick={(e) => handleLineClick(index, e)}
            >
              <span className="text-sm text-gray-400 w-6 text-center">
                {String(index + 1).padStart(2, '0')}
              </span>

              <Checkbox
                checked={entry.completed}
                onCheckedChange={() => toggleComplete(index, event as React.MouseEvent)}
                className="h-5 w-5"
              />

              {activeTask?.index === index ? (
                <div className="flex-1 flex items-center gap-3">
                  <Input
                    autoFocus
                    value={activeTask.content}
                    onChange={(e) => setActiveTask({ ...activeTask, content: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    className="flex-1 min-w-0"
                    placeholder="What needs to be done?"
                  />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {PRIORITIES.map(({ label, value, color }) => (
                      <Button
                        key={label}
                        variant="ghost"
                        size="sm"
                        className={`w-8 h-8 ${color} ${
                          activeTask.priority === value ? 'ring-2 ring-offset-2' : ''
                        }`}
                        onClick={() => setActiveTask({ ...activeTask, priority: value })}
                      >
                        {label}
                      </Button>
                    ))}
                    <Button
                      onClick={handleSave}
                      size="sm"
                      className="bg-green-50 text-green-600 hover:bg-green-100"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className={`truncate ${entry.completed ? 'line-through text-gray-400' : ''}`}>
                    {entry.content || ' '}
                  </span>
                  {entry.content && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        PRIORITIES.find(p => p.value === entry.priority)?.color
                      }`}>
                        {PRIORITIES.find(p => p.value === entry.priority)?.label}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  );
}