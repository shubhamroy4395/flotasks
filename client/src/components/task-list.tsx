import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { ArrowUpDown, Clock, Plus, X, Sparkles, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import type { Task } from "@shared/schema";
import { trackEvent, Events } from "@/lib/amplitude";
import debounce from 'lodash/debounce';
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";

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
  onDelete?: (taskId: number) => void;
}

export function TaskList({ title, tasks, onSave, onDelete }: TaskListProps) {
  const queryClient = useQueryClient();
  // State management
  const [entries, setEntries] = useState(() => {
    const initialLines = title === "Other Tasks" ? 8 : 10;
    const lines = Array(initialLines).fill(null).map((_, i) => ({
      id: i + 1,
      content: "",
      isEditing: false,
      completed: false,
      priority: 0,
      eta: "",
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
    isDirty: boolean;
  } | null>(null);

  const [totalTime, setTotalTime] = useState<number>(0);
  const [showCelebration, setShowCelebration] = useState<number | null>(null);
  const [sortState, setSortState] = useState<'lno' | 'onl' | 'default'>('default');
  const [initialEntries, setInitialEntries] = useState(entries);

  // Refs for tracking state
  const lastSavedContentRef = useRef<string>("");
  const savingRef = useRef(false);

  // Effect hooks
  useEffect(() => {
    setInitialEntries([...entries]);
  }, [tasks]);

  useEffect(() => {
    const newTotal = entries.reduce((total, entry) => {
      if (!entry.completed && entry.content && entry.eta) {
        return total + convertTimeToMinutes(entry.eta);
      }
      return total;
    }, 0);
    setTotalTime(newTotal);
  }, [entries]);

  // Core save functionality
  const saveTask = useCallback((content: string, priority: number, eta: string) => {
    if (!content.trim() || !activeTask || savingRef.current) return;

    savingRef.current = true;

    // Update entries silently
    setEntries(prev =>
      prev.map((entry, i) =>
        i === activeTask.index
          ? {
              ...entry,
              content: content.trim(),
              priority,
              eta,
              timestamp: new Date()
            }
          : entry
      )
    );

    // Save to backend
    onSave({
      content: content.trim(),
      priority,
      category: title === "Today's Tasks" ? "today" : "other"
    });

    // Track event only for new tasks or significant changes
    if (content.trim() !== lastSavedContentRef.current) {
      const eventName = title === "Today's Tasks" ? Events.TaskToday.Created : Events.TaskOther.Created;
      trackEvent(eventName, {
        category: title === "Today's Tasks" ? "today" : "other",
        priority_level: PRIORITIES.find(p => p.value === priority)?.label || 'N',
        priority_value: priority,
        has_time: Boolean(eta),
        estimated_minutes: convertTimeToMinutes(eta),
        task: {
          id: activeTask.index + 1,
          content: content.trim(),
          time: eta,
          position: activeTask.index,
          word_count: content.trim().split(/\s+/).length,
          length: content.length
        }
      });
      lastSavedContentRef.current = content.trim();
    }

    savingRef.current = false;
  }, [title, onSave, activeTask]);

  // Debounced save for content changes
  const debouncedSave = useCallback(
    debounce((content: string, priority: number, eta: string) => {
      saveTask(content, priority, eta);
    }, 1000),
    [saveTask]
  );

  // Event handlers
  const handleLineClick = (index: number, e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const entry = entries[index];
    setActiveTask({
      index,
      content: entry.content || "",
      priority: entry.priority || 0,
      eta: entry.eta || "",
      isDirty: false
    });
    lastSavedContentRef.current = entry.content || "";
  };

  const handleInputChange = (value: string) => {
    if (!activeTask) return;
    setActiveTask(prev => ({ ...prev!, content: value, isDirty: true }));
    debouncedSave(value, activeTask.priority, activeTask.eta);
  };

  const handlePriorityChange = (value: number) => {
    if (!activeTask) return;
    setActiveTask(prev => ({ ...prev!, priority: value, isDirty: true }));
    saveTask(activeTask.content, value, activeTask.eta);
  };

  const handleEtaChange = (value: string) => {
    if (!activeTask) return;
    setActiveTask(prev => ({ ...prev!, eta: value, isDirty: true }));
    saveTask(activeTask.content, activeTask.priority, value);
  };

  const handleBlur = () => {
    if (!activeTask) return;

    if (activeTask.isDirty) {
      saveTask(activeTask.content, activeTask.priority, activeTask.eta);
    }

    if (!activeTask.content.trim()) {
      setActiveTask(null);
    }
  };

  const toggleComplete = (index: number) => {
    setEntries(prev =>
      prev.map((entry, i) => {
        if (i === index) {
          const newCompleted = !entry.completed;
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
  };

  const toggleSort = () => {
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
        eta: "",
        timestamp: new Date()
      }))
    ]);
  };

  // Keyboard shortcut handlers
  const nextEmptyIndex = useCallback(() => {
    return entries.findIndex(entry => !entry.content.trim());
  }, [entries]);

  const activeEntry = activeTask; //for convenience

  const keyboardHandlers = {
    addNewItem: () => {
      const index = nextEmptyIndex();
      if (index >= 0) {
        // Create a synthetic React mouse event instead of a native MouseEvent
        const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent<HTMLElement>;
        handleLineClick(index, syntheticEvent);
      } else {
        addMoreTasks();
      }
    },
    togglePriority: () => {
      if (!activeEntry) return;
      const currentPriority = activeEntry.priority;
      const nextPriority = (currentPriority % 3) + 1;
      handlePriorityChange(nextPriority);
    },
    focusNext: () => {
      if (activeEntry && activeEntry.index < entries.length - 1) {
        // Create a synthetic React mouse event
        const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent<HTMLElement>;
        handleLineClick(activeEntry.index + 1, syntheticEvent);
      }
    },
    focusPrev: () => {
      if (activeEntry && activeEntry.index > 0) {
        // Create a synthetic React mouse event
        const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent<HTMLElement>;
        handleLineClick(activeEntry.index - 1, syntheticEvent);
      }
    },
    complete: () => {
      if (activeEntry) {
        toggleComplete(activeEntry.index);
        setActiveTask(null);
      }
    },
    delete: () => {
      if (activeEntry) {
        // Find the actual entry from entries array by index
        const actualEntry = entries[activeEntry.index];
        if (actualEntry && actualEntry.id) {
          deleteEntry.mutate(actualEntry.id);
          setActiveTask(null);
        }
      }
    }
  };

  // Get authentication state
  const { isAuthenticated } = useAuth();

  const deleteEntry = useMutation({
    mutationFn: async (id: number) => {
      const startTime = performance.now();
      
      // Handle temporary IDs differently (they don't exist on the server)
      if (id < 0) {
        return Promise.resolve(); // No need to call API for local-only entries
      }
      
      // Use the correct API endpoint based on authentication state
      const apiEndpoint = isAuthenticated ? `/api/tasks/${id}` : `/api/public/tasks/${id}`;
      const response = await fetch(apiEndpoint, { method: 'DELETE' });
      
      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.statusText}`);
      }
      
      const endTime = performance.now();

      trackEvent(Events.Performance.ApiCall, {
        endpoint: apiEndpoint,
        method: 'DELETE',
        durationMs: endTime - startTime
      });
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/tasks"] });
      const previousTasks = queryClient.getQueryData<Task[]>(["/api/tasks"]);

      // Optimistically update the UI
      setEntries(prev => prev.filter(entry => entry.id !== deletedId));

      // For server-stored tasks, update the cache
      if (deletedId > 0) {
        queryClient.setQueryData<Task[]>(["/api/tasks"], old =>
          old?.filter(task => task.id !== deletedId) || []
        );
      }

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["/api/tasks"], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    }
  });

  useKeyboardShortcuts(keyboardHandlers, {
    enabled: true,
    trackingPrefix: title === "Today's Tasks" ? 'today_tasks.' : 'other_tasks.'
  });


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
            {sortState === 'lno' ? 'L→N→O' : sortState === 'onl' ? 'O→N→L' : 'Default'}
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
                        toggleComplete(index);
                      }
                    }}
                    className={`h-5 w-5 transition-transform duration-200 ${
                      entry.content ? 'hover:scale-110' : 'opacity-50 cursor-not-allowed'
                    }`}
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
                        onChange={(e) => handleInputChange(e.target.value)}
                        onBlur={handleBlur}
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
                              className={`px-2 ${color} font-black transform transition-all duration-200 hover:scale-105 ${
                                activeTask.priority === value ? 'ring-2 ring-offset-2' : ''
                              }`}
                              onClick={() => handlePriorityChange(value)}
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
                        value={activeTask.eta}
                        onChange={(e) => handleEtaChange(e.target.value)}
                        className="rounded-md border-gray-200 px-2 py-1.5 text-sm bg-transparent font-bold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Time</option>
                        {TIME_SLOTS.map(slot => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
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
                          <span className="flex items-center text-xs text-gray-500 font-bold">
                            <Clock className="h-3 w-3 mr-1" />
                            {entry.eta}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete && onDelete(entry.id);
                          }}
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-transparent transition-opacity ml-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
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

async function apiRequest(method: string, url: string) {
  const response = await fetch(url, { method });
  if (!response.ok) {
    const message = `An error has occured: ${response.statusText}`;
    throw new Error(message);
  }
  return response.json();
}