import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { GratitudeEntry } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2 } from "lucide-react";
import { Events, trackEvent } from "@/lib/amplitude";
import debounce from 'lodash/debounce';

interface EntryLine {
  id: number;
  content: string;
  isEditing: boolean;
  timestamp: Date;
}

export function GratitudeSection() {
  const [entries, setEntries] = useState<EntryLine[]>([]);
  const [activeEntry, setActiveEntry] = useState<{
    index: number;
    content: string;
    isDirty: boolean;
  } | null>(null);

  const queryClient = useQueryClient();
  const lastSavedContentRef = useRef<string>("");
  const savingRef = useRef(false);
  const startTimeRef = useRef(performance.now());

  // Query for gratitude entries with caching
  const { data: savedEntries = [] } = useQuery<GratitudeEntry[]>({
    queryKey: ["/api/gratitude"],
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Initialize entries with saved data and empty lines
  useEffect(() => {
    const savedLines = savedEntries.map(entry => ({
      id: entry.id,
      content: entry.content,
      isEditing: false,
      timestamp: new Date(entry.timestamp)
    }));

    const emptyLines = Array(3).fill(null).map((_, i) => ({
      id: savedLines.length + i + 1,
      content: "",
      isEditing: false,
      timestamp: new Date()
    }));

    setEntries([...savedLines, ...emptyLines]);
  }, [savedEntries]);

  // Track initial load performance
  useEffect(() => {
    const loadTime = performance.now() - startTimeRef.current;
    trackEvent(Events.Performance.ComponentMount, {
      component: 'GratitudeSection',
      loadTimeMs: loadTime,
      savedEntriesCount: savedEntries.length
    });
  }, [savedEntries.length]);

  // Create entry mutation with optimistic updates
  const createEntry = useMutation({
    mutationFn: async (content: string) => {
      const startTime = performance.now();
      const response = await apiRequest("POST", "/api/gratitude", { content });
      const endTime = performance.now();

      trackEvent(Events.Performance.ApiCall, {
        endpoint: '/api/gratitude',
        method: 'POST',
        durationMs: endTime - startTime
      });

      return response;
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ["/api/gratitude"] });
      const previousEntries = queryClient.getQueryData<GratitudeEntry[]>(["/api/gratitude"]);

      const optimisticEntry = {
        id: Date.now(),
        content,
        timestamp: new Date().toISOString()
      };

      queryClient.setQueryData<GratitudeEntry[]>(["/api/gratitude"], old => [
        ...(old || []),
        optimisticEntry
      ]);

      return { previousEntries };
    },
    onError: (err, variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(["/api/gratitude"], context.previousEntries);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gratitude"] });
    }
  });

  // Delete entry mutation with optimistic updates
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
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gratitude"] });
    }
  });

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
      } finally {
        savingRef.current = false;
      }
    }, 800)
  ).current;

  const handleLineClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const entry = entries[index];
    setActiveEntry({
      index,
      content: entry.content || "",
      isDirty: false
    });
    lastSavedContentRef.current = entry.content || "";
  };

  const handleInputChange = (value: string) => {
    if (!activeEntry) return;

    // Optimistically update local state
    setEntries(prev => 
      prev.map((entry, i) => 
        i === activeEntry.index 
          ? { ...entry, content: value }
          : entry
      )
    );

    setActiveEntry(prev => ({ ...prev!, content: value, isDirty: true }));

    if (value.trim()) {
      debouncedSave(value);
    }
  };

  const handleBlur = () => {
    if (!activeEntry) return;

    if (activeEntry.isDirty && activeEntry.content.trim()) {
      debouncedSave(activeEntry.content);
    }

    if (!activeEntry.content.trim()) {
      setActiveEntry(null);
    }
  };

  const addMoreEntries = () => {
    setEntries(prev => [
      ...prev,
      ...Array(3).fill(null).map((_, i) => ({
        id: prev.length + i + 1,
        content: "",
        isEditing: false,
        timestamp: new Date()
      }))
    ]);
  };

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100">
        <CardTitle className="font-semibold">Gratitude Journal</CardTitle>
      </CardHeader>
      <CardContent>
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
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    className="flex items-center justify-between w-full cursor-text"
                    layout
                  >
                    <span className="text-gray-700 font-medium">
                      {entry.content || " "}
                    </span>
                    {entry.content && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEntry.mutate(entry.id);
                        }}
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
        >
          <Plus className="mr-2 h-4 w-4" />
          Add More Entries
        </Button>
      </CardContent>
    </Card>
  );
}