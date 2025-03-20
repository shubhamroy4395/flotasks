import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { ArrowUpDown, Clock, Plus, X, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import type { Task } from "@shared/schema";

// Helper function to convert time string to minutes
const convertTimeToMinutes = (time: string): number => {
  if (!time) return 0;
  const hours = time.match(/(\d+)h/);
  const minutes = time.match(/(\d+)min/);
  return (hours ? parseInt(hours[1]) * 60 : 0) + (minutes ? parseInt(minutes[1]) : 0);
};

// Helper function to format minutes to readable time
const formatTotalTime = (totalMinutes: number): string => {
  if (totalMinutes === 0) return "";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}min`);
  return parts.join(" ");
};

const PRIORITIES = [
  {
    label: "L",
    value: 3,
    color: "bg-blue-100 hover:bg-blue-200 text-blue-700",
    title: "Leverage (L)",
    subtitle: "High Impact, Low Effort 🚀",
    description: "These tasks deliver outsized results with minimal effort. Prioritize them first!"
  },
  {
    label: "N",
    value: 2,
    color: "bg-gray-100 hover:bg-gray-200 text-gray-700",
    title: "Neutral (N)",
    subtitle: "Necessary but Balanced ⚖️",
    description: "These tasks are important but don't drastically change outcomes. Handle them after leverage tasks."
  },
  {
    label: "O",
    value: 1,
    color: "bg-red-100 hover:bg-red-200 text-red-700",
    title: "Overhead (O)",
    subtitle: "High Effort, Low Reward ⏳",
    description: "These tasks consume time without significant returns. Avoid or delegate if possible."
  }
];

const TIME_SLOTS = [
  "5min", "10min", "15min", "30min", "45min", "1h", "2h"
];

interface TaskListProps {
  title: string;
  tasks: Task[];
  onSave: (task: { content: string; priority: number; category: string }) => void;
}

export function TaskList({ title, tasks, onSave }: TaskListProps) {
  const initialLines = title === "Other Tasks" ? 8 : 10;
  const [entries, setEntries] = useState(() => {
    const lines = Array(initialLines).fill(null).map((_, i) => ({
      id: i + 1,
      content: "",
      isEditing: false,
      completed: false,
      priority: 0,
      eta: ""
    }));

    tasks.forEach((task, index) => {
      if (index < lines.length) {
        lines[index] = {
          ...lines[index],
          content: task.content,
          completed: task.completed,
          priority: task.priority,
          eta: task.eta || ""
        };
      }
    });

    return lines;
  });

  const [activeTask, setActiveTask] = useState<{
    index: number;
    content: string;
    priority: number;
    eta: string;
  } | null>(null);

  const [totalTime, setTotalTime] = useState<number>(0);
  const [showCelebration, setShowCelebration] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [confettiPosition, setConfettiPosition] = useState({ x: 0, y: 0 });

  // Calculate total time whenever entries change
  useEffect(() => {
    const newTotal = entries.reduce((total, entry) => {
      if (!entry.completed && entry.content && entry.eta) {
        return total + convertTimeToMinutes(entry.eta);
      }
      return total;
    }, 0);
    setTotalTime(newTotal);
  }, [entries]);

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
        category: title === "Today's Tasks" ? "today" : "other"
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

  const toggleComplete = (index: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setConfettiPosition({ x: rect.x, y: rect.y });

    setEntries(prev =>
      prev.map((entry, i) => {
        if (i === index) {
          const newCompleted = !entry.completed;
          if (newCompleted) {
            setShowCelebration(index);
            setShowConfetti(true);
            setTimeout(() => {
              setShowCelebration(null);
              setShowConfetti(false);
            }, 1000);
          }
          return { ...entry, completed: newCompleted };
        }
        return entry;
      })
    );
  };

  const toggleSort = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    setEntries(prev => [...prev].sort((a, b) => {
      if (!a.content && !b.content) return 0;
      if (!a.content) return 1;
      if (!b.content) return -1;
      return sortDirection === 'asc'
        ? b.priority - a.priority
        : a.priority - b.priority;
    }));
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl font-extrabold text-gray-800">{title}</CardTitle>
            {totalTime > 0 && (
              <div className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-bold text-blue-700">
                  {formatTotalTime(totalTime)}
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 italic">Click any line to add a task</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSort}
            className="text-gray-600 hover:text-gray-800 font-semibold"
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            Sort
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {}}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add More
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {showConfetti && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              style={{
                position: 'fixed',
                left: confettiPosition.x,
                top: confettiPosition.y,
                pointerEvents: 'none',
                zIndex: 50
              }}
            >
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0 }}
                  animate={{
                    x: (Math.random() - 0.5) * 100,
                    y: Math.random() * -100,
                    rotate: Math.random() * 360
                  }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  style={{
                    position: 'absolute',
                    width: '8px',
                    height: '8px',
                    backgroundColor: ['#FFD700', '#FFA500', '#FF69B4', '#00CED1'][i % 4],
                    borderRadius: '50%'
                  }}
                />
              ))}
            </motion.div>
          )}
          <AnimatePresence mode="sync">
            {entries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="group flex items-center gap-4 py-2 border-b border-dashed border-gray-200 cursor-pointer relative"
                whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                transition={{ duration: 0.2 }}
                layout
                onClick={(e) => handleLineClick(index, e)}
              >
                {showCelebration === index && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -top-2 -right-2"
                  >
                    <Sparkles className="h-6 w-6 text-yellow-400" />
                  </motion.div>
                )}

                <span className="text-sm text-gray-400 w-6 font-mono font-bold">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="relative">
                  <Checkbox
                    checked={entry.completed}
                    onCheckedChange={(checked) => {
                      toggleComplete(index, checked ? document.activeElement as HTMLElement : document.body);
                    }}
                    className="h-5 w-5"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {activeTask?.index === index ? (
                  <motion.div
                    className="flex flex-col w-full gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    layout
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Input
                        autoFocus
                        value={activeTask.content}
                        onChange={(e) => setActiveTask({ ...activeTask, content: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && handleSave()}
                        className="flex-1 border-none shadow-none bg-transparent focus:ring-0 focus:outline-none font-semibold"
                        placeholder="What needs to be done?"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveTask(null)}
                        className="h-8 w-8 hover:bg-gray-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <TooltipProvider>
                          {PRIORITIES.map(({ label, value, color, title, subtitle, description }) => (
                            <Tooltip key={label}>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={`px-2 ${color} font-bold ${activeTask.priority === value ? 'ring-2 ring-offset-2' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTask({ ...activeTask, priority: value });
                                  }}
                                >
                                  {label}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs bg-white border shadow-lg">
                                <p className="font-bold">{title}</p>
                                <p className="text-sm font-semibold">{subtitle}</p>
                                <p className="text-xs text-gray-600 mt-1">{description}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </TooltipProvider>
                      </div>

                      <select
                        value={activeTask.eta}
                        onChange={(e) => setActiveTask({ ...activeTask, eta: e.target.value })}
                        className="rounded-md border-gray-200 px-2 py-1.5 text-sm bg-transparent font-semibold"
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
                        variant="outline"
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-300"
                      >
                        Save
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    className={`flex items-center justify-between w-full cursor-text ${
                      entry.completed ? 'line-through text-gray-400' : 'text-gray-700 font-semibold'
                    }`}
                    layout
                  >
                    <span>{entry.content || " "}</span>
                    {entry.content && (
                      <motion.div
                        className="flex items-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        {entry.priority !== undefined && (
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                            PRIORITIES.find(p => p.value === entry.priority)?.color
                          }`}>
                            {PRIORITIES.find(p => p.value === entry.priority)?.label}
                          </span>
                        )}
                        {entry.eta && (
                          <span className="flex items-center text-xs text-gray-500 font-semibold">
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
        </div>
      </CardContent>
    </Card>
  );
}