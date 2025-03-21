import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { ArrowUpDown, Clock, Plus, X, Sparkles, Info, Calendar, ArrowRight, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import type { Task } from "@shared/schema";
import { addDays, subDays, isSameDay } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

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
    color: "bg-gradient-to-r from-blue-100 to-emerald-50 text-blue-700",
    title: "Leverage (L)",
    subtitle: "High Impact, Low Effort 🚀",
    description: "These tasks deliver outsized results with minimal effort. Prioritize them first!"
  },
  {
    label: "N",
    value: 2,
    color: "bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700",
    title: "Neutral (N)",
    subtitle: "Necessary but Balanced ⚖️",
    description: "These tasks are important but don't drastically change outcomes. Handle them after leverage tasks."
  },
  {
    label: "O",
    value: 1,
    color: "bg-gradient-to-r from-red-50 to-orange-50 text-red-700",
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
  onMoveTask?: (taskId: number, targetDate: Date) => void;
  onDeleteTask?: (taskId: number) => void;
  selectedDate?: Date;
}

export function TaskList({ title, tasks, onSave, onMoveTask, onDeleteTask, selectedDate }: TaskListProps) {
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
    setConfettiPosition({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });

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
            }, 2000); // Increased duration for better visibility
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

  const addMoreTasks = () => {
    setEntries(prev => [
      ...prev,
      ...Array(5).fill(null).map((_, i) => ({
        id: prev.length + i + 1,
        content: "",
        isEditing: false,
        completed: false,
        priority: 0,
        eta: ""
      }))
    ]);
  };

  const renderMoveToDateButton = (taskId: number) => {
    if (!onMoveTask) return null;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex flex-col gap-2 p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMoveTask(taskId, addDays(selectedDate || new Date(), 1))}
              className="justify-start font-normal"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Move to Tomorrow
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMoveTask(taskId, subDays(selectedDate || new Date(), 1))}
              className="justify-start font-normal"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Move to Yesterday
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const renderTaskActions = (entry: typeof entries[0], index: number) => {
    if (!entry.content || activeTask?.index === index) return null;

    return (
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
        {/* Quick move to tomorrow button */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onMoveTask) {
                    onMoveTask(entry.id, addDays(selectedDate || new Date(), 1));
                  }
                }}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={5}>
              <p>Move task to tomorrow</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Delete button */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDeleteTask) {
                    onDeleteTask(entry.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={5}>
              <p>Delete task</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {entry.priority !== undefined && (
          <span className={`px-2 py-0.5 rounded-md text-xs font-black ${
            PRIORITIES.find(p => p.value === entry.priority)?.color
          }`}>
            {PRIORITIES.find(p => p.value === entry.priority)?.label}
          </span>
        )}
        {entry.eta && (
          <span className="flex items-center text-xs text-gray-500 font-bold">
            <Clock className="h-3 w-3 mr-1" />
            {entry.eta}
          </span>
        )}
      </div>
    );
  };


  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-b from-white to-gray-50 border-t-4 border-t-blue-400 transform-gpu">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 flex-wrap gap-4 bg-white bg-opacity-80">
        <div>
          <div className="flex items-center gap-3">
            <CardTitle className="text-2xl font-black text-gray-800 tracking-tight">{title}</CardTitle>
            {totalTime > 0 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-1.5 rounded-full shadow-sm"
              >
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-extrabold text-blue-700">
                  {formatTotalTime(totalTime)}
                </span>
              </motion.div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 font-medium italic">Click any line to add a task</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSort}
            className="text-gray-600 hover:text-gray-800 font-bold"
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            Sort
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addMoreTasks}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add More
          </Button>
        </div>
      </CardHeader>
      <CardContent className="bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CiAgPHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPgogIDxwYXRoIGQ9Ik0zMCAzMG0tMSAwYTEgMSAwIDEgMCAyIDBhMSAxIDAgMSAwIC0yIDB6IiBmaWxsPSJyZ2JhKDIyOSwgMjMxLCAyMzUsIDAuNSkiLz4KPC9zdmc+')] bg-repeat">
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
                zIndex: 50,
                width: 0,
                height: 0
              }}
            >
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{
                    x: (Math.random() - 0.5) * 300,
                    y: Math.random() * -300,
                    rotate: Math.random() * 360 * (Math.random() > 0.5 ? 1 : -1),
                    opacity: 0,
                  }}
                  transition={{
                    duration: Math.random() * 1 + 1,
                    ease: [0.4, 0, 0.2, 1],
                    opacity: { duration: Math.random() * 1 + 0.5 }
                  }}
                  style={{
                    position: 'absolute',
                    width: Math.random() * 8 + 6 + 'px',
                    height: Math.random() * 8 + 6 + 'px',
                    backgroundColor: [
                      '#FFD700', '#FFA500', '#FF69B4', '#00CED1',
                      '#9B59B6', '#2ECC71', '#E74C3C', '#3498DB',
                      '#F1C40F', '#E67E22', '#16A085', '#8E44AD'
                    ][i % 12],
                    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transform: 'translate(-50%, -50%)'
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
                className="group flex items-center gap-4 py-3 border-b border-dashed border-gray-200 cursor-pointer relative hover:bg-white hover:bg-opacity-60 transition-all duration-300"
                whileHover={{ scale: 1.002 }}
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
                    <Sparkles className="h-6 w-6 text-yellow-400 filter drop-shadow-lg" />
                  </motion.div>
                )}

                <span className="text-sm text-gray-400 w-6 font-mono font-bold">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="relative">
                  <Checkbox
                    checked={entry.completed}
                    disabled={!entry.content}
                    onCheckedChange={(checked) => {
                      if (entry.content) {
                        toggleComplete(index, checked ? document.activeElement as HTMLElement : document.body);
                      }
                    }}
                    className={`h-5 w-5 transition-transform duration-200 ${
                      entry.content ? 'hover:scale-110' : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Task content or edit form */}
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
                        className="flex-1 border-none shadow-none bg-transparent focus:ring-0 focus:outline-none font-bold text-gray-700 placeholder:text-gray-400"
                        placeholder="What needs to be done?"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveTask(null)}
                        className="h-8 w-8 hover:bg-gray-100 transition-colors duration-200"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {PRIORITIES.map(({ label, value, color }) => (
                            <Button
                              key={label}
                              size="sm"
                              variant="ghost"
                              className={`px-2 ${color} font-black transform transition-all duration-200 hover:scale-105 ${activeTask.priority === value ? 'ring-2 ring-offset-2' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTask({ ...activeTask, priority: value });
                              }}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-gray-700"
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-4">
                              {PRIORITIES.map(({ label, title, subtitle, description, color }) => (
                                <div key={label} className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-md text-xs font-black ${color}`}>
                                      {label}
                                    </span>
                                    <h4 className="font-bold">{title}</h4>
                                  </div>
                                  <p className="text-sm font-medium">{subtitle}</p>
                                  <p className="text-xs text-gray-600">{description}</p>
                                </div>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <select
                        value={activeTask?.eta || ""}
                        onChange={(e) => setActiveTask({ ...activeTask, eta: e.target.value })}
                        className="rounded-md border-gray-200 px-2 py-1.5 text-sm bg-transparent font-bold"
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
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 border-blue-200 hover:border-blue-300 font-bold transform transition-all duration-200 hover:scale-105"
                      >
                        Save
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    className={`flex items-center justify-between w-full cursor-text ${
                      entry.completed ? 'line-through text-gray-400' : 'text-gray-700 font-bold'
                    }`}
                    layout
                  >
                    <span>{entry.content || " "}</span>
                    {entry.content && renderTaskActions(entry, index)}
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