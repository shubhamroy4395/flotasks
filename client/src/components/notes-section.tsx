import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Note } from "@shared/schema";
import { Events, trackEvent } from "@/lib/amplitude";
import debounce from 'lodash/debounce';

interface NoteLine {
  id: number;
  content: string;
  isEditing: boolean;
  timestamp: Date;
}

export function NotesSection() {
  // State management
  const [entries, setEntries] = useState<NoteLine[]>([]);
  const [activeEntry, setActiveEntry] = useState<{
    index: number;
    content: string;
    isDirty: boolean;
  } | null>(null);

  const queryClient = useQueryClient();
  const lastSavedContentRef = useRef<string>("");
  const savingRef = useRef(false);
  const startTimeRef = useRef(performance.now());

  // Query for notes with caching
  const { data: savedNotes = [] } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
    staleTime: 30000,
    cacheTime: 5 * 60 * 1000
  });

  // Initialize entries with saved data and empty lines
  useEffect(() => {
    const savedLines = savedNotes.map(note => ({
      id: note.id,
      content: note.content,
      isEditing: false,
      timestamp: new Date(note.timestamp)
    }));

    const emptyLines = Array(Math.max(3 - savedLines.length, 0)).fill(null).map((_, i) => ({
      id: savedLines.length + i + 1,
      content: "",
      isEditing: false,
      timestamp: new Date()
    }));

    setEntries([...savedLines, ...emptyLines]);
  }, [savedNotes]);

  // Track component performance
  useEffect(() => {
    const loadTime = performance.now() - startTimeRef.current;
    trackEvent(Events.Performance.ComponentMount, {
      component: 'NotesSection',
      loadTimeMs: loadTime,
      savedNotesCount: savedNotes.length
    });
  }, [savedNotes.length]);

  // Create note mutation with optimistic updates
  const createNote = useMutation({
    mutationFn: async (content: string) => {
      const startTime = performance.now();
      const response = await apiRequest("POST", "/api/notes", { content });
      const endTime = performance.now();

      trackEvent(Events.Performance.ApiCall, {
        endpoint: '/api/notes',
        method: 'POST',
        durationMs: endTime - startTime
      });

      return response;
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ["/api/notes"] });
      const previousNotes = queryClient.getQueryData<Note[]>(["/api/notes"]);

      const optimisticNote = {
        id: Date.now(),
        content,
        timestamp: new Date().toISOString()
      };

      queryClient.setQueryData<Note[]>(["/api/notes"], old => [
        ...(old || []),
        optimisticNote
      ]);

      return { previousNotes };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["/api/notes"], context.previousNotes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    }
  });

  // Delete note mutation with optimistic updates
  const deleteNote = useMutation({
    mutationFn: async (id: number) => {
      const startTime = performance.now();
      await apiRequest("DELETE", `/api/notes/${id}`);
      const endTime = performance.now();

      trackEvent(Events.Performance.ApiCall, {
        endpoint: `/api/notes/${id}`,
        method: 'DELETE',
        durationMs: endTime - startTime
      });
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/notes"] });
      const previousNotes = queryClient.getQueryData<Note[]>(["/api/notes"]);

      queryClient.setQueryData<Note[]>(["/api/notes"], old => 
        old?.filter(note => note.id !== deletedId) || []
      );

      return { previousNotes };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(["/api/notes"], context.previousNotes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    }
  });

  // Debounced save with performance tracking
  const debouncedSave = useRef(
    debounce(async (content: string) => {
      if (!content.trim() || savingRef.current) return;
      savingRef.current = true;
      try {
        const startTime = performance.now();
        await createNote.mutateAsync(content);
        const endTime = performance.now();

        trackEvent(Events.Performance.SaveOperation, {
          component: 'NotesSection',
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

      // Move to next empty line if available
      const nextEmptyIndex = entries.findIndex((entry, idx) => idx > activeEntry.index && !entry.content.trim());
      if (nextEmptyIndex !== -1) {
        handleLineClick(nextEmptyIndex, new MouseEvent('click'));
        return;
      }
    }

    setActiveEntry(null);
  };

  const addMoreEntries = () => {
    setEntries(prev => [
      ...prev,
      {
        id: prev.length + 1,
        content: "",
        isEditing: false,
        timestamp: new Date()
      }
    ]);
  };

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100">
        <CardTitle className="font-semibold">Quick Notes</CardTitle>
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
                      placeholder="Write a quick note..."
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
                      {entry.content && (
                        <p className="text-sm text-gray-500 mt-1">
                          {format(new Date(entry.timestamp), 'MMM d, h:mm a')}
                        </p>
                      )}
                    </div>
                    {entry.content && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNote.mutate(entry.id);
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
          Add Another Note
        </Button>
      </CardContent>
    </Card>
  );
}