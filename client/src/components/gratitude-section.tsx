import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { GratitudeEntry } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Events, trackEvent } from "@/lib/amplitude";
import debounce from 'lodash/debounce';

interface EntryLine {
  id: number;
  content: string;
  isEditing: boolean;
  timestamp: Date;
  isSaved: boolean;
}

export function GratitudeSection() {
  const [entries, setEntries] = useState<EntryLine[]>([]);
  const [activeEntry, setActiveEntry] = useState<{
    index: number;
    content: string;
    isDirty: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const queryClient = useQueryClient();
  const lastSavedContentRef = useRef<string>("");
  const savingRef = useRef(false);
  const startTimeRef = useRef(performance.now());

  // Enhanced query with proper error handling and loading states
  const { data: savedEntries = [], isError: isQueryError } = useQuery<GratitudeEntry[]>({
    queryKey: ["/api/gratitude"],
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    onError: (error) => {
      setError("Failed to load gratitude entries. Please try again.");
      console.error("Gratitude query error:", error);
    }
  });

  // Delete entry mutation with optimistic updates and error handling
  const deleteEntry = useMutation({
    mutationFn: async (id: number) => {
      const startTime = performance.now();
      await apiRequest("DELETE", `/api/gratitude/${id}`);
      const endTime = performance.now();

      trackEvent(Events.Performance.DeleteOperation, {
        endpoint: `/api/gratitude/${id}`,
        method: 'DELETE',
        durationMs: endTime - startTime
      });
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/gratitude"] });
      const previousEntries = queryClient.getQueryData<GratitudeEntry[]>(["/api/gratitude"]);

      // Optimistically update UI
      setEntries(prev => prev.filter(entry => entry.id !== deletedId));

      queryClient.setQueryData<GratitudeEntry[]>(["/api/gratitude"], old =>
        old?.filter(entry => entry.id !== deletedId) || []
      );

      return { previousEntries };
    },
    onError: (err, variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(["/api/gratitude"], context.previousEntries);
      }
      setError("Failed to delete entry. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gratitude"] });
    }
  });

  // Initialize entries with proper error handling
  useEffect(() => {
    try {
      const savedLines = savedEntries.map(entry => ({
        id: entry.id,
        content: entry.content,
        isEditing: false,
        timestamp: new Date(entry.timestamp),
        isSaved: true
      }));

      const emptyLines = Array(Math.max(3 - savedLines.length, 0)).fill(null).map((_, i) => ({
        id: Date.now() + i,
        content: "",
        isEditing: false,
        timestamp: new Date(),
        isSaved: false
      }));

      setEntries([...savedLines, ...emptyLines]);
    } catch (error) {
      console.error("Error initializing entries:", error);
      setError("Failed to initialize entries. Please refresh the page.");
    }
  }, [savedEntries]);

  // Performance tracking
  useEffect(() => {
    const loadTime = performance.now() - startTimeRef.current;
    trackEvent(Events.Performance.ComponentMount, {
      component: 'GratitudeSection',
      loadTimeMs: loadTime,
      savedEntriesCount: savedEntries.length
    });
  }, [savedEntries.length]);

  // Optimized save mutation with proper error handling
  const createEntry = useMutation({
    mutationFn: async (content: string) => {
      setIsLoading(true);
      const startTime = performance.now();
      try {
        const response = await apiRequest("POST", "/api/gratitude", { content });
        const endTime = performance.now();

        trackEvent(Events.Performance.ApiCall, {
          endpoint: '/api/gratitude',
          method: 'POST',
          durationMs: endTime - startTime
        });

        return response;
      } catch (error) {
        console.error("Error creating entry:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    onMutate: async (content) => {
      try {
        await queryClient.cancelQueries({ queryKey: ["/api/gratitude"] });
        const previousEntries = queryClient.getQueryData<GratitudeEntry[]>(["/api/gratitude"]);

        const optimisticEntry = {
          id: Date.now(),
          content,
          timestamp: new Date().toISOString()
        };

        queryClient.setQueryData<GratitudeEntry[]>(["/api/gratitude"], old => 
          [...(old || []), optimisticEntry]
        );

        return { previousEntries };
      } catch (error) {
        console.error("Error in mutation setup:", error);
        return { previousEntries: [] };
      }
    },
    onError: (err, variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(["/api/gratitude"], context.previousEntries);
      }
      setError("Failed to save entry. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gratitude"] });
    }
  });

  // Debounced save with improved error handling
  const debouncedSave = useRef(
    debounce(async (content: string) => {
      if (!content.trim() || savingRef.current) return;

      savingRef.current = true;
      try {
        const startTime = performance.now();
        await createEntry.mutateAsync(content);
        const endTime = performance.now();

        trackEvent(Events.Performance.SaveOperation, {
          component: 'GratitudeSection',
          durationMs: endTime - startTime,
          contentLength: content.length
        });

        lastSavedContentRef.current = content.trim();
      } catch (error) {
        console.error("Error in debouncedSave:", error);
        setError("Failed to save. Please try again.");
      } finally {
        savingRef.current = false;
      }
    }, 500) // Reduced debounce time for better responsiveness
  ).current;

  const handleLineClick = (index: number, e: React.MouseEvent) => {
    try {
      e.stopPropagation();
      const entry = entries[index];

      // Don't allow editing saved entries
      if (entry.isSaved) return;

      setActiveEntry({
        index,
        content: entry.content || "",
        isDirty: false
      });
      lastSavedContentRef.current = entry.content || "";
      setError(null);
    } catch (error) {
      console.error("Error in handleLineClick:", error);
      setError("Failed to activate line. Please try again.");
    }
  };

  const handleInputChange = (value: string) => {
    if (!activeEntry) return;

    try {
      setEntries(prev => 
        prev.map((entry, i) => 
          i === activeEntry.index 
            ? { ...entry, content: value }
            : entry
        )
      );

      setActiveEntry(prev => ({ ...prev!, content: value, isDirty: true }));

      if (value.trim() && value.trim() !== lastSavedContentRef.current) {
        debouncedSave(value);
      }
    } catch (error) {
      console.error("Error in handleInputChange:", error);
      setError("Failed to update entry. Please try again.");
    }
  };

  const handleBlur = () => {
    if (!activeEntry) return;

    try {
      if (activeEntry.isDirty && activeEntry.content.trim()) {
        debouncedSave(activeEntry.content);

        const nextEmptyIndex = entries.findIndex(
          (entry, idx) => idx > activeEntry.index && !entry.content.trim() && !entry.isSaved
        );

        if (nextEmptyIndex !== -1) {
          handleLineClick(nextEmptyIndex, new MouseEvent('click'));
          return;
        }
      }

      setActiveEntry(null);
    } catch (error) {
      console.error("Error in handleBlur:", error);
      setError("Failed to save entry. Please try again.");
    }
  };

  const addMoreEntries = () => {
    try {
      setEntries(prev => [
        ...prev,
        {
          id: Date.now(),
          content: "",
          isEditing: false,
          timestamp: new Date(),
          isSaved: false
        }
      ]);
    } catch (error) {
      console.error("Error in addMoreEntries:", error);
      setError("Failed to add new entry. Please try again.");
    }
  };

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100">
        <CardTitle className="font-semibold">Gratitude Journal</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-2 text-sm text-red-600 bg-red-50 rounded">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <AnimatePresence mode="sync">
            {entries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`group flex items-center gap-4 py-3 border-b border-dashed border-gray-200 cursor-pointer relative hover:bg-white hover:bg-opacity-60 transition-all duration-300 ${
                  entry.isSaved ? 'bg-gray-50' : ''
                } ${isLoading ? 'opacity-50' : ''}`}
                whileHover={{ scale: 1.002 }}
                transition={{ duration: 0.2 }}
                layout
                onClick={(e) => handleLineClick(index, e)}
              >
                <span className="text-sm text-gray-400 w-6 font-mono font-bold">
                  {String(index + 1).padStart(2, '0')}
                </span>

                {activeEntry?.index === index ? (
                  <motion.div
                    className="flex-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    layout
                  >
                    <Input
                      autoFocus
                      value={activeEntry.content}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onBlur={handleBlur}
                      className="flex-1 border-none shadow-none bg-transparent focus:ring-0 focus:outline-none font-medium text-gray-700 placeholder:text-gray-400"
                      placeholder="I am grateful for..."
                      disabled={isLoading}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    className="flex items-center justify-between w-full cursor-text"
                    layout
                  >
                    <div className="flex-1">
                      <span className="text-gray-700 font-medium">
                        {entry.content || " "}
                      </span>
                    </div>
                    {entry.isSaved && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEntry.mutate(entry.id);
                        }}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full mt-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-none font-medium"
          onClick={addMoreEntries}
          disabled={isLoading}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another Entry
        </Button>
      </CardContent>
    </Card>
  );
}