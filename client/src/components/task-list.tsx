import { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { ArrowUpDown, Clock, Plus, X, Sparkles, Info, Trash2, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import type { Task } from "@shared/schema";
import { trackEvent, Events } from "@/lib/amplitude";
import { showCalendarExportPopup } from "@/lib/calendar-export";

// Helper function to convert time string to minutes
const convertTimeToMinutes = (time: string): number => {
  if (!time) return 0;
  const hours = time.match(/(\d+\.?\d*)h/);
  const minutes = time.match(/(\d+)min/);
  return (hours ? parseFloat(hours[1]) * 60 : 0) + (minutes ? parseInt(minutes[1]) : 0);
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
  "8h", "6h", "4h", "3h", "2h", "1.5h", "1h", "45min", "30min", "15min", "10min", "5min"
];

const TASK_DIFFICULTIES = [
  {
    emoji: "🍰",
    label: "Cakewalk",
    value: "easy",
    description: "Quick task, low complexity"
  },
  {
    emoji: "😒",
    label: "Meh",
    value: "moderate",
    description: "Average difficulty and effort required"
  },
  {
    emoji: "🙄",
    label: "Ugh, fine",
    value: "challenging",
    description: "Requires significant focus and effort"
  },
  {
    emoji: "😱",
    label: "Panic Mode",
    value: "urgent",
    description: "Time-sensitive task needing immediate attention"
  },
  {
    emoji: "👑",
    label: "VIP Task",
    value: "important",
    description: "High-value task with significant impact"
  }
];

interface TaskListProps {
  title: string;
  tasks: Task[];
  onSave: (task: { content: string; priority: number; difficulty: string; category: string }) => void;
  onDelete?: (id: number) => void;
  onUpdate?: (id: number, updates: Partial<Task>) => void;
}

function TaskListComponent({ title, tasks, onSave, onDelete, onUpdate }: TaskListProps) {
  const initialLines = title === "Other Tasks" ? 8 : 10;
  const [entries, setEntries] = useState(() => {
    const lines = Array(initialLines).fill(null).map((_, i) => ({
      id: i + 1,
      content: "",
      isEditing: false,
      completed: false,
      priority: 0,
      eta: "",
      difficulty: "",
      timestamp: new Date()
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
    difficulty?: string;
  } | null>(null);

  const [totalTime, setTotalTime] = useState<number>(0);
  const [showCelebration, setShowCelebration] = useState<number | null>(null);
  const [sortState, setSortState] = useState<'lno' | 'onl' | 'default'>('default');
  const [initialEntries, setInitialEntries] = useState(entries);

  // Store initial entries when they're first created
  useEffect(() => {
    setInitialEntries([...entries]);
  }, [tasks]);

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

  // Track component mount
  useEffect(() => {
    trackEvent(
      title === "Today's Tasks" ? Events.TaskToday.View : Events.TaskOther.View,
      {
        taskCount: tasks.length,
        completedCount: tasks.filter(t => t.completed).length,
        averagePriority: tasks.reduce((acc, t) => acc + t.priority, 0) / tasks.length || 0,
        timeOfDay: new Date().getHours(),
      }
    );
  }, []);

  const handleLineClick = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const entry = entries[index];
    setActiveTask({
      index,
      content: entry.content || "",
      priority: entry.priority || 0,
      eta: entry.eta || "",
      difficulty: entry.difficulty || ""
    });

    // Track task editing interaction
    if (entry.content) {
      trackEvent(title === "Today's Tasks" ? Events.TaskToday.Edited : Events.TaskOther.Edited, {
        taskId: entry.id,
        currentPriority: entry.priority,
        currentEta: entry.eta,
        position: index,
        category: title === "Today's Tasks" ? "today" : "other"
      });
    }
  }, [entries, title]);

  const handleSave = useCallback(() => {
    if (!activeTask) return;
    const { content, priority, eta, difficulty } = activeTask;

    if (content.trim()) {
      onSave({
        content,
        priority,
        difficulty: difficulty || "",
        category: title === "Today's Tasks" ? "today" : "other"
      });

      // Determine event name based on task category
      const eventName = title === "Today's Tasks" ? Events.TaskToday.Created : Events.TaskOther.Created;

      // Track task creation with filterable properties
      trackEvent(eventName, {
        // Top-level properties for easy filtering in Amplitude
        category: title === "Today's Tasks" ? "today" : "other",
        priority_level: PRIORITIES.find(p => p.value === priority)?.label || 'N', // L, N, O
        priority_value: priority, // 3, 2, 1
        has_time: Boolean(eta),
        estimated_minutes: convertTimeToMinutes(eta),
        difficulty: difficulty || 'none',

        // Detailed task properties
        task: {
          id: activeTask.index + 1,
          content: content.trim(),
          time: eta,
          position: activeTask.index,
          word_count: content.trim().split(/\s+/).length,
          length: content.length
        },

        // Context for analysis
        task_context: {
          total_tasks: entries.filter(e => e.content).length,
          completed_tasks: entries.filter(e => e.completed).length,
          priority_distribution: PRIORITIES.reduce((acc, p) => {
            acc[p.label] = entries.filter(e => e.priority === p.value).length;
            return acc;
          }, {} as Record<string, number>)
        }
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
              difficulty: difficulty || "",
              isEditing: false
            }
          : entry
      )
    );
    setActiveTask(null);
  }, [activeTask, entries, onSave, title]);

  const toggleComplete = useCallback((index: number) => {
    setEntries(prev =>
      prev.map((entry, i) => {
        if (i === index) {
          const newCompleted = !entry.completed;
          
          // Find the corresponding task in the tasks array
          const taskToUpdate = tasks.find(t => t.content === entry.content && t.priority === entry.priority);
          
          // Update the task in the database if we have the onUpdate handler and a valid task
          if (onUpdate && taskToUpdate) {
            onUpdate(taskToUpdate.id, { 
              completed: newCompleted,
              // Ensure we explicitly pass the priority and difficulty to maintain it during update
              priority: entry.priority,
              difficulty: entry.difficulty
            });
          }
          
          if (newCompleted) {
            setShowCelebration(index);
            setTimeout(() => setShowCelebration(null), 2000);

            // Determine event name based on task category
            const eventName = title === "Today's Tasks" ? Events.TaskToday.Completed : Events.TaskOther.Completed;

            // Track completion with filterable properties
            trackEvent(eventName, {
              // Top-level properties for easy filtering
              category: title === "Today's Tasks" ? "today" : "other",
              priority_level: PRIORITIES.find(p => p.value === entry.priority)?.label || 'N',
              priority_value: entry.priority,
              has_time: Boolean(entry.eta),
              estimated_minutes: convertTimeToMinutes(entry.eta),
              difficulty: entry.difficulty || 'none',
              completion_time: Date.now(),

              // Task details
              task: {
                id: entry.id,
                content: entry.content,
                position: index,
                age_ms: Date.now() - new Date(entry.timestamp).getTime()
              },

              // Context
              task_context: {
                total_tasks: entries.filter(e => e.content).length,
                completed_tasks: entries.filter(e => e.completed).length + 1,
                completion_rate: ((entries.filter(e => e.completed).length + 1) / 
                                entries.filter(e => e.content).length) * 100
              }
            });
          }
          return { ...entry, completed: newCompleted };
        }
        return entry;
      })
    );
  }, [entries, onUpdate, tasks, title]);

  const toggleSort = useCallback(() => {
    setSortState(prev => {
      const states: ('lno' | 'onl' | 'default')[] = ['lno', 'onl', 'default'];
      const currentIndex = states.indexOf(prev);
      const nextState = states[(currentIndex + 1) % states.length];

      // Track sorting with structured properties
      const taskCategory = title === "Today's Tasks" ? 'today' : 'other';
      const eventName = taskCategory === 'today' ? Events.TaskToday.Sorted : Events.TaskOther.Sorted;

      trackEvent(eventName, {
        sort: {
          newState: nextState,
          previousState: prev
        },
        taskCategory,
        task_context: {
          total_tasks: entries.filter(e => e.content).length,
          completed_tasks: entries.filter(e => e.completed).length,
          priority_distribution: entries.reduce((acc, entry) => {
            if (entry.priority) {
              acc[PRIORITIES.find(p => p.value === entry.priority)?.label || ''] = 
                (acc[PRIORITIES.find(p => p.value === entry.priority)?.label || ''] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>),
          averagePriority: entries.reduce((acc, entry) => acc + (entry.priority || 0), 0) / 
                           entries.filter(e => e.content).length || 0
        }
      });

      setEntries(prev => {
        if (nextState === 'default') {
          return [...initialEntries];
        }

        return [...prev].sort((a, b) => {
          if (!a.content && !b.content) return 0;
          if (!a.content) return 1;
          if (!b.content) return -1;

          return nextState === 'lno'
            ? b.priority - a.priority
            : a.priority - b.priority;
        });
      });

      return nextState;
    });
  }, [entries, initialEntries, title]);

  const addMoreTasks = useCallback(() => {
    setEntries(prev => [
      ...prev,
      ...Array(5).fill(null).map((_, i) => ({
        id: prev.length + i + 1,
        content: "",
        isEditing: false,
        completed: false,
        priority: 0,
        eta: "",
        difficulty: "",
        timestamp: new Date()
      }))
    ]);
  }, []);

  const handleDelete = useCallback((taskId: number, index: number) => {
    const entry = entries[index];
    // Find the corresponding task in the tasks array
    const taskToDelete = tasks.find(t => t.content === entry.content && t.priority === entry.priority);
    
    // Only call the API if we have a real task ID and onDelete function
    if (onDelete && taskToDelete) {
      onDelete(taskToDelete.id);
      
      // Track the deletion event
      const eventName = title === "Today's Tasks" ? Events.TaskToday.Deleted : Events.TaskOther.Deleted;
      trackEvent(eventName, {
        taskId: taskToDelete.id,
        category: title === "Today's Tasks" ? "today" : "other"
      });
    }
    
    // Update local state to immediately reflect deletion
    setEntries(prev => 
      prev.map((entry, i) => 
        i === index ? { ...entry, content: "", completed: false, priority: 0, eta: "", difficulty: "" } : entry
      )
    );
  }, [entries, onDelete, tasks, title]);

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-t-4 border-t-primary transform-gpu card-enhanced">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <CardTitle className="text-2xl font-black text-foreground tracking-tight">{title}</CardTitle>
            {totalTime > 0 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1 bg-accent px-4 py-1.5 rounded-full shadow-sm"
              >
                <Clock className="h-4 w-4 text-accent-foreground" />
                <span className="text-sm font-extrabold text-accent-foreground">
                  {formatTotalTime(totalTime)}
                </span>
              </motion.div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-medium italic">Click any line to add a task</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSort}
            className="text-muted-foreground hover:text-foreground font-bold hover-highlight active-scale"
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            {sortState === 'lno' ? 'L→N→O' : sortState === 'onl' ? 'O→N→L' : 'Default'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addMoreTasks}
            className="text-primary hover:text-primary-foreground hover:bg-primary/20 font-bold active-scale"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add More
          </Button>
        </div>
      </CardHeader>
      <CardContent className="bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CiAgPHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPgogIDxwYXRoIGQ9Ik0zMCAzMG0tMSAwYTEgMSAwIDEgMCAyIDBhMSAxIDAgMSAwIC0yIDB6IiBmaWxsPSJyZ2JhKDIyOSwgMjMxLCAyMzUsIDAuNSkiLz4KPC9zdmc+')] bg-repeat pr-5">
        <div className="space-y-2">
          <AnimatePresence mode="sync">
            {entries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="group flex items-center gap-3 px-3 pr-5 py-2.5 border-b border-dashed border-border cursor-pointer relative hover:bg-card/70 transition-all duration-300 interactive-row"
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

                <span className="text-sm text-muted-foreground w-6 font-mono font-bold">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="relative flex items-center justify-center w-6">
                  <Checkbox
                    checked={entry.completed}
                    disabled={!entry.content}
                    onCheckedChange={(checked) => {
                      if (entry.content) {
                        toggleComplete(index);
                      }
                    }}
                    className={`h-4 w-4 transition-transform duration-200 ${
                      entry.content ? 'hover:scale-110' : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {activeTask?.index === index ? (
                  <motion.div
                    className="flex flex-col w-full gap-2 max-w-[95%]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    layout
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col w-full space-y-2">
                      {/* Task input row with close button */}
                      <div className="flex items-center gap-2 w-full">
                        <div className="flex-1">
                          <Input
                            autoFocus
                            value={activeTask.content}
                            onChange={(e) => setActiveTask({ ...activeTask, content: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (!e.shiftKey) {
                                  e.preventDefault();
                                  handleSave();
                                  // Move to the next task after saving
                                  if (activeTask.index < entries.length - 1) {
                                    const nextIndex = activeTask.index + 1;
                                    const nextEntry = entries[nextIndex];
                                    setTimeout(() => {
                                      setActiveTask({
                                        index: nextIndex,
                                        content: nextEntry.content || "",
                                        priority: nextEntry.priority || 0,
                                        eta: nextEntry.eta || "",
                                        difficulty: nextEntry.difficulty || ""
                                      });
                                    }, 0);
                                  }
                                }
                              } else if (e.key === "ArrowUp" && activeTask.index > 0) {
                                // Move to the previous task
                                e.preventDefault();
                                const prevIndex = activeTask.index - 1;
                                const prevEntry = entries[prevIndex];
                                setActiveTask({
                                  index: prevIndex,
                                  content: prevEntry.content || "",
                                  priority: prevEntry.priority || 0,
                                  eta: prevEntry.eta || "",
                                  difficulty: prevEntry.difficulty || ""
                                });
                              } else if (e.key === "ArrowDown" && activeTask.index < entries.length - 1) {
                                // Move to the next task
                                e.preventDefault();
                                const nextIndex = activeTask.index + 1;
                                const nextEntry = entries[nextIndex];
                                setActiveTask({
                                  index: nextIndex,
                                  content: nextEntry.content || "",
                                  priority: nextEntry.priority || 0,
                                  eta: nextEntry.eta || "",
                                  difficulty: nextEntry.difficulty || ""
                                });
                              }
                            }}
                            className="h-9 border-input rounded-md border shadow-none focus:ring-0 focus:outline-none font-bold text-foreground placeholder:text-muted-foreground"
                            placeholder="What needs to be done?"
                          />
                        </div>
                        
                        <Button
                          onClick={handleSave}
                          size="sm"
                          variant="secondary"
                          className="h-9 px-4 bg-muted text-muted-foreground font-medium"
                        >
                          Save
                        </Button>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setActiveTask(null)}
                          className="h-8 w-8 hover:bg-muted transition-colors duration-200 hover-highlight active-scale"
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>

                      {/* Controls Row - In a container with definite width constraints */}
                      <div className="flex items-center gap-2 max-w-full pb-1 pr-1 flex-wrap sm:flex-nowrap overflow-x-hidden">
                        {/* Priority selector - compact and inline */}
                        <div className="flex gap-1 items-center">
                          {PRIORITIES.map(({ label, value, color }) => (
                            <Button
                              key={label}
                              size="sm"
                              variant="ghost"
                              className={`px-2 py-0 h-7 ${color} font-black transform transition-all duration-200 hover:scale-105 ${activeTask.priority === value ? 'ring-1 ring-offset-1' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTask({ ...activeTask, priority: value });
                              }}
                              title={`Set ${label} priority`}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>

                        {/* Time selector with fixed width */}
                        <select
                          value={activeTask.eta}
                          onChange={(e) => setActiveTask({ ...activeTask, eta: e.target.value })}
                          className="rounded-md border-border px-2 py-1 text-sm h-7 bg-transparent font-bold text-foreground w-24"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">Time</option>
                          {TIME_SLOTS.map(slot => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </select>

                        {/* Difficulty selector - renamed from Task Difficulty, with reduced width */}
                        <select
                          value={activeTask.difficulty || ""}
                          onChange={(e) => setActiveTask({ ...activeTask, difficulty: e.target.value })}
                          className="rounded-md border-border px-2 py-1 text-sm h-7 bg-transparent font-bold text-foreground w-24"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">Difficulty</option>
                          {TASK_DIFFICULTIES.map(difficulty => (
                            <option key={difficulty.value} value={difficulty.value}>{difficulty.emoji} {difficulty.label}</option>
                          ))}
                        </select>

                        {/* Help button */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground hover-highlight active-scale"
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-4">
                              <h3 className="font-bold text-sm">Task Priorities:</h3>
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
                              
                              <h3 className="font-bold text-sm mt-4">Difficulties:</h3>
                              <div className="grid grid-cols-2 gap-2">
                                {TASK_DIFFICULTIES.map(diff => (
                                  <div key={diff.value} className="flex items-center gap-1">
                                    <span>{diff.emoji}</span>
                                    <span className="text-xs font-medium">{diff.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    className={`flex items-center justify-between w-full cursor-text px-1 ${
                      entry.completed ? 'line-through text-muted-foreground' : 'text-foreground font-bold'
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
                          <span className={`px-2 py-0.5 rounded-md text-xs font-black ${
                            PRIORITIES.find(p => p.value === entry.priority)?.color
                          }`}>
                            {PRIORITIES.find(p => p.value === entry.priority)?.label}
                          </span>
                        )}
                        {entry.eta && (
                          <span className="flex items-center text-xs text-muted-foreground font-bold">
                            <Clock className="h-3 w-3 mr-1" />
                            {entry.eta}
                          </span>
                        )}
                        {entry.difficulty && (
                          <span className="flex items-center text-xs font-bold ml-1">
                            {TASK_DIFFICULTIES.find(d => d.value === entry.difficulty)?.emoji}
                          </span>
                        )}
                        
                        {/* Quick action buttons for unassigned tasks */}
                        {entry.content && (!entry.priority || !entry.eta || !entry.difficulty) && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!entry.priority && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground mr-1">Priority:</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-1.5 py-0 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Find the corresponding task in the tasks array
                                    const taskToUpdate = tasks.find(t => t.content === entry.content);
                                    if (onUpdate && taskToUpdate) {
                                      onUpdate(taskToUpdate.id, { priority: 3 });
                                      // Update local state
                                      setEntries(prev => prev.map((e, i) => i === index ? { ...e, priority: 3 } : e));
                                      // Track the event
                                      trackEvent(title === "Today's Tasks" ? Events.TaskToday.Updated : Events.TaskOther.Updated, {
                                        taskId: taskToUpdate.id,
                                        updatedField: 'priority',
                                        newValue: 3,
                                        oldValue: 0,
                                        category: title === "Today's Tasks" ? "today" : "other"
                                      });
                                    }
                                  }}
                                  title="High impact, low effort - Do first!"
                                >
                                  <span className="text-xs font-black">L</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-1.5 py-0 rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Find the corresponding task in the tasks array
                                    const taskToUpdate = tasks.find(t => t.content === entry.content);
                                    if (onUpdate && taskToUpdate) {
                                      onUpdate(taskToUpdate.id, { priority: 2 });
                                      // Update local state
                                      setEntries(prev => prev.map((e, i) => i === index ? { ...e, priority: 2 } : e));
                                      // Track the event
                                      trackEvent(title === "Today's Tasks" ? Events.TaskToday.Updated : Events.TaskOther.Updated, {
                                        taskId: taskToUpdate.id,
                                        updatedField: 'priority',
                                        newValue: 2,
                                        oldValue: 0,
                                        category: title === "Today's Tasks" ? "today" : "other"
                                      });
                                    }
                                  }}
                                  title="Necessary but balanced"
                                >
                                  <span className="text-xs font-black">N</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-1.5 py-0 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Find the corresponding task in the tasks array
                                    const taskToUpdate = tasks.find(t => t.content === entry.content);
                                    if (onUpdate && taskToUpdate) {
                                      onUpdate(taskToUpdate.id, { priority: 1 });
                                      // Update local state
                                      setEntries(prev => prev.map((e, i) => i === index ? { ...e, priority: 1 } : e));
                                      // Track the event
                                      trackEvent(title === "Today's Tasks" ? Events.TaskToday.Updated : Events.TaskOther.Updated, {
                                        taskId: taskToUpdate.id,
                                        updatedField: 'priority',
                                        newValue: 1,
                                        oldValue: 0,
                                        category: title === "Today's Tasks" ? "today" : "other"
                                      });
                                    }
                                  }}
                                  title="High effort, low reward - Avoid"
                                >
                                  <span className="text-xs font-black">O</span>
                                </Button>
                              </div>
                            )}
                            
                            {!entry.eta && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground mr-1">Time:</span>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                                      title="Set time estimate"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Clock className="h-3 w-3" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent side="bottom" className="w-56 p-1 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                                    {["15min", "30min", "1h", "2h", "4h"].map((time) => (
                                      <Button 
                                        key={time}
                                        variant="outline" 
                                        size="sm" 
                                        className="flex-1 text-xs py-0 h-7"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Find the corresponding task in the tasks array
                                          const taskToUpdate = tasks.find(t => t.content === entry.content);
                                          if (onUpdate && taskToUpdate) {
                                            onUpdate(taskToUpdate.id, { eta: time });
                                            // Update local state
                                            setEntries(prev => prev.map((e, i) => i === index ? { ...e, eta: time } : e));
                                            // Track the event
                                            trackEvent(title === "Today's Tasks" ? Events.TaskToday.TimeSet : Events.TaskOther.TimeSet, {
                                              taskId: taskToUpdate.id,
                                              time,
                                              category: title === "Today's Tasks" ? "today" : "other"
                                            });
                                          }
                                        }}
                                      >
                                        {time}
                                      </Button>
                                    ))}
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                            
                            {!entry.difficulty && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground mr-1">Level:</span>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-amber-500 hover:text-amber-700 hover:bg-amber-100 transition-colors"
                                      title="Set difficulty"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <span className="text-xs">😒</span>
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent side="bottom" className="w-64 p-1 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                                    {TASK_DIFFICULTIES.map((diff) => (
                                      <Button 
                                        key={diff.value}
                                        variant="outline" 
                                        size="sm" 
                                        className="flex-1 text-xs py-0 h-7 flex items-center gap-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Find the corresponding task in the tasks array
                                          const taskToUpdate = tasks.find(t => t.content === entry.content);
                                          if (onUpdate && taskToUpdate) {
                                            onUpdate(taskToUpdate.id, { difficulty: diff.value });
                                            // Update local state
                                            setEntries(prev => prev.map((e, i) => i === index ? { ...e, difficulty: diff.value } : e));
                                            // Track the event
                                            trackEvent(title === "Today's Tasks" ? Events.TaskToday.Updated : Events.TaskOther.Updated, {
                                              taskId: taskToUpdate.id,
                                              updatedField: 'difficulty',
                                              newValue: diff.value,
                                              oldValue: '',
                                              category: title === "Today's Tasks" ? "today" : "other"
                                            });
                                          }
                                        }}
                                      >
                                        <span>{diff.emoji}</span> {diff.label}
                                      </Button>
                                    ))}
                                  </PopoverContent>
                                </Popover>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Calendar export button */}
                        {tasks[index]?.id && entry.content && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-500/70 hover:text-blue-500 hover:bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity active-scale"
                            onClick={(e) => {
                              e.stopPropagation();
                              
                              // Find the corresponding task and export it
                              const taskToExport = tasks.find(t => t.content === entry.content && t.priority === entry.priority);
                              if (taskToExport) {
                                // Track calendar export event
                                trackEvent(
                                  title === "Today's Tasks" ? Events.TaskToday.Exported : Events.TaskOther.Exported, 
                                  {
                                    taskId: taskToExport.id,
                                    content: taskToExport.content,
                                    category: title === "Today's Tasks" ? "today" : "other"
                                  }
                                );
                                
                                showCalendarExportPopup(taskToExport);
                              }
                            }}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        
                        {/* Delete button */}
                        {tasks[index]?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity active-scale"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(tasks[index].id, index);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

// Optimize the TaskList component with React.memo
export const TaskList = memo(TaskListComponent);