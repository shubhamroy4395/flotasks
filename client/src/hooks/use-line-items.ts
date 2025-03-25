import { useState, useRef, useCallback, useEffect } from 'react';
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { trackEvent } from '@/lib/amplitude';
import debounce from 'lodash/debounce';

interface LineItem {
  id: number;
  content: string;
  isEditing: boolean;
  timestamp: Date;
  isSaved: boolean;
}

interface UseLineItemsOptions {
  queryKey: string[];
  eventPrefix: string;
  defaultLines?: number;
}

export function useLineItems({ queryKey, eventPrefix, defaultLines = 3 }: UseLineItemsOptions) {
  const [entries, setEntries] = useState<LineItem[]>([]);
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

  // Create mutation with optimistic updates
  const createEntry = useMutation({
    mutationFn: async (content: string) => {
      setIsLoading(true);
      const startTime = performance.now();
      try {
        const response = await apiRequest("POST", queryKey[0], { content });
        const endTime = performance.now();

        trackEvent(`${eventPrefix}.SaveOperation`, {
          durationMs: endTime - startTime,
          contentLength: content.length
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
        await queryClient.cancelQueries({ queryKey });
        const previousEntries = queryClient.getQueryData(queryKey);

        const optimisticEntry = {
          id: Date.now(),
          content,
          timestamp: new Date().toISOString()
        };

        // Update local state immediately
        setEntries(prev => {
          const activeIdx = activeEntry?.index ?? -1;
          return prev.map((entry, idx) => 
            idx === activeIdx ? { ...entry, content, isSaved: true } : entry
          );
        });

        // Update cache optimistically
        queryClient.setQueryData(queryKey, (old: any[] = []) => [...old, optimisticEntry]);

        return { previousEntries };
      } catch (error) {
        console.error("Error in mutation setup:", error);
        return { previousEntries: [] };
      }
    },
    onError: (err, variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(queryKey, context.previousEntries);
      }
      setError("Failed to save entry. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // Delete mutation with optimistic updates
  const deleteEntry = useMutation({
    mutationFn: async (id: number) => {
      const startTime = performance.now();
      await apiRequest("DELETE", `${queryKey[0]}/${id}`);
      const endTime = performance.now();

      trackEvent(`${eventPrefix}.DeleteOperation`, {
        durationMs: endTime - startTime
      });
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey });
      const previousEntries = queryClient.getQueryData(queryKey);

      setEntries(prev => prev.filter(entry => entry.id !== deletedId));
      queryClient.setQueryData(queryKey, (old: any[] = []) => 
        old.filter(entry => entry.id !== deletedId)
      );

      return { previousEntries };
    },
    onError: (err, variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(queryKey, context.previousEntries);
      }
      setError("Failed to delete entry. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
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

        trackEvent(`${eventPrefix}.SaveOperation`, {
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
    }, 500)
  ).current;

  const initializeEntries = useCallback((savedEntries: any[]) => {
    try {
      // Make sure savedEntries is an array before mapping
      const entries = Array.isArray(savedEntries) ? savedEntries : [];
      
      const savedLines = entries.map(entry => ({
        id: entry.id,
        content: entry.content,
        isEditing: false,
        timestamp: new Date(entry.timestamp || Date.now()),
        isSaved: true
      }));

      // Always ensure we have exactly defaultLines empty lines for input
      const emptyLines = Array(Math.max(defaultLines - savedLines.length, 1)).fill(null).map((_, i) => ({
        id: Date.now() + i,
        content: "",
        isEditing: false,
        timestamp: new Date(),
        isSaved: false
      }));

      // Combine saved and empty lines
      setEntries([...savedLines, ...emptyLines]);
      
      // Log for debugging
      console.log(`Initialized ${savedLines.length} saved entries and ${emptyLines.length} empty lines`);
    } catch (error) {
      console.error("Error initializing entries:", error);
      setError("Failed to initialize entries. Please refresh the page.");
    }
  }, [defaultLines]);

  const handleLineClick = useCallback((index: number, e: React.MouseEvent) => {
    try {
      e.stopPropagation();
      
      // Guard against invalid index
      if (index < 0 || index >= entries.length) {
        console.warn(`Attempted to click invalid line index: ${index}, entries length: ${entries.length}`);
        return;
      }
      
      const entry = entries[index];

      // Only activate empty lines or non-saved lines
      if (entry.isSaved) {
        console.log(`Line ${index} is already saved, not activating for edit`);
        return;
      }

      // Set this line as the active one
      setActiveEntry({
        index,
        content: entry.content || "",
        isDirty: false
      });
      
      lastSavedContentRef.current = entry.content || "";
      setError(null);
      
      console.log(`Activated line ${index} for editing`);
    } catch (error) {
      console.error("Error in handleLineClick:", error);
      setError("Failed to activate line. Please try again.");
    }
  }, [entries]);

  const handleInputChange = useCallback((value: string) => {
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
  }, [activeEntry, debouncedSave]);

  const handleBlur = useCallback(() => {
    if (!activeEntry) return;

    try {
      if (activeEntry.isDirty && activeEntry.content.trim()) {
        debouncedSave(activeEntry.content);

        // Find next empty line
        const nextEmptyIndex = entries.findIndex(
          (entry, idx) => idx > activeEntry.index && !entry.content.trim() && !entry.isSaved
        );

        if (nextEmptyIndex !== -1) {
          // Create a synthetic event object with the minimum properties needed
          const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent;
          handleLineClick(nextEmptyIndex, syntheticEvent);
          return;
        }
      }

      setActiveEntry(null);
    } catch (error) {
      console.error("Error in handleBlur:", error);
      setError("Failed to save entry. Please try again.");
    }
  }, [activeEntry, entries, handleLineClick, debouncedSave]);

  const addMoreEntries = useCallback(() => {
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
  }, []);

  return {
    entries,
    activeEntry,
    error,
    isLoading,
    initializeEntries,
    handleLineClick,
    handleInputChange,
    handleBlur,
    addMoreEntries,
    deleteEntry
  };
}