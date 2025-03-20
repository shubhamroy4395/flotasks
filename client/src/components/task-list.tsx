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
}

const PRIORITIES = [
  { label: "L", value: 3, color: "bg-blue-100 text-blue-700", title: "Leverage" },
  { label: "N", value: 2, color: "bg-gray-100 text-gray-700", title: "Neutral" },
  { label: "O", value: 1, color: "bg-red-100 text-red-700", title: "Overhead" }
];

const TIME_SLOTS = [
  "5min", "10min", "15min", "30min", "45min", "1h", "2h"
];

export function TaskList({ tasks, onSave }: TaskListProps) {
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
    const { content, priority, eta } = activeTask;

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
          ? {
              ...entry,
              content: content.trim(),
              priority,
              eta,
              isEditing: false
            }
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
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 flex-wrap gap-4">
        <div>
          <CardTitle className="font-semibold">Today's Tasks</CardTitle>
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
      <motion.div
        className="p-6 space-y-2"
        layout
      >
        <AnimatePresence mode="sync">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="group flex items-center gap-4 py-2 border-b border-dashed border-gray-200"
              whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
              transition={{ duration: 0.2 }}
              layout
              onClick={(e) => handleLineClick(index, e)}
            >
              <span className="text-sm text-gray-400 w-6 font-mono">
                {String(index + 1).padStart(2, '0')}
              </span>
              <Checkbox
                checked={entry.completed}
                onCheckedChange={() => toggleComplete(index, event as React.MouseEvent)}
                className="h-5 w-5"
                onClick={(e) => e.stopPropagation()}
              />

              {activeTask?.index === index ? (
                <motion.div
                  className="flex items-center gap-3 w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  layout
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    autoFocus
                    value={activeTask.content}
                    onChange={(e) => setActiveTask({ ...activeTask, content: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    className="flex-1 border-none shadow-none bg-transparent focus:ring-0 focus:outline-none"
                    placeholder="What needs to be done?"
                  />
                  <div className="flex gap-2 items-center flex-wrap">
                    {PRIORITIES.map(({ label, value, color, title }) => (
                      <Button
                        key={label}
                        size="sm"
                        variant="ghost"
                        className={`px-2 ${color} ${activeTask.priority === value ? 'ring-2 ring-offset-2' : ''}`}
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
                  className={`flex items-center justify-between w-full cursor-text ${
                    entry.completed ? 'line-through text-gray-400' : 'text-gray-700'
                  }`}
                  layout
                >
                  <span className="font-medium">{entry.content || " "}</span>
                  {entry.content && (
                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      {entry.priority !== undefined && (
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                          PRIORITIES.find(p => p.value === entry.priority)?.color
                        }`}>
                          {PRIORITIES.find(p => p.value === entry.priority)?.label}
                        </span>
                      )}
                      {entry.eta && (
                        <span className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {entry.eta}
                        </span>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </Card>
  );
}