import { useState, useRef, useCallback } from 'react';
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
  const processingRef = useRef(false);

  // Create mutation for saving entries
  const createEntry = useMutation({
    mutationFn: async (content: string) => {
      setIsLoading(true);
      try {
        const response = await apiRequest("POST", queryKey[0], { content });
        // Get the actual entry data from the response
        const data = await response.json();
        console.log("Successfully saved entry:", data);
        return data;
      } catch (error) {
        console.error("Error creating entry:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    onMutate: async (content) => {
      // Prevent duplicate saves
      if (processingRef.current) return { previousEntries: [] };
      processingRef.current = true;
      
      // Get the active entry index
      const activeIdx = activeEntry?.index ?? -1;
      if (activeIdx === -1) {
        console.warn("No active entry found for optimistic update");
        processingRef.current = false;
        return { previousEntries: [] };
      }
      
      // Generate a temporary ID for this new entry
      const tempId = -Math.abs(Date.now() + Math.floor(Math.random() * 1000));
      
      // Only update local state, leave cache alone until we have the real data
      setEntries(prev => {
        const updatedEntries = [...prev];
        if (activeIdx >= 0 && activeIdx < updatedEntries.length) {
          // Mark the entry as being saved
          updatedEntries[activeIdx] = { 
            ...updatedEntries[activeIdx], 
            content,
            id: tempId,
            isSaved: false // Will be true after server confirms
          };
        }
        return updatedEntries;
      });
      
      return { tempId, activeIdx };
    },
    onSuccess: (data, _, context) => {
      if (!context) return;
      
      const { tempId, activeIdx } = context;
      
      // Update the entry with the actual data from the server
      setEntries(prev => {
        // First create a copy of the current entries
        const updated = [...prev];
        
        // Find the entry with the tempId
        const idx = updated.findIndex(entry => entry.id === tempId);
        
        if (idx >= 0) {
          // Update the temporary entry with real data
          updated[idx] = {
            id: data.id,
            content: data.content,
            isEditing: false,
            timestamp: new Date(data.timestamp),
            isSaved: true
          };
        } else if (activeIdx >= 0 && activeIdx < updated.length) {
          // Fallback: update by index if tempId not found
          updated[activeIdx] = {
            id: data.id,
            content: data.content,
            isEditing: false,
            timestamp: new Date(data.timestamp),
            isSaved: true
          };
        }
        
        // Make sure we don't have any other entries with the same content (duplicates)
        const deduplicated = updated.filter((entry, i) => {
          if (entry.id === data.id) return true; // Keep the updated entry
          
          // Check if this is a duplicate (same content, recently created)
          const isDuplicate = entry.content === data.content && 
            (Math.abs(new Date(entry.timestamp).getTime() - new Date(data.timestamp).getTime()) < 5000);
          
          return !isDuplicate;
        });
        
        // Add empty line if needed
        const hasEmptyLine = deduplicated.some(e => !e.content.trim());
        if (!hasEmptyLine) {
          deduplicated.push({
            id: -(Date.now()), // Negative ID for unsaved entries
            content: "",
            isEditing: false,
            timestamp: new Date(),
            isSaved: false
          });
        }
        
        return deduplicated;
      });
      
      // Update lastSavedContent
      lastSavedContentRef.current = data.content;
      processingRef.current = false;
    },
    onError: (_, __, context) => {
      if (!context) return;
      
      const { tempId } = context;
      
      // Revert the entry back to unsaved state
      setEntries(prev => {
        return prev.map(entry => {
          if (entry.id === tempId) {
            return {
              ...entry,
              isSaved: false,
              id: -(Date.now()) // Generate a new negative ID
            };
          }
          return entry;
        });
      });
      
      setError("Failed to save entry. Please try again.");
      processingRef.current = false;
    },
    onSettled: () => {
      // For safety, ensure the processing flag is reset
      processingRef.current = false;
      
      // We don't invalidate the query here to avoid fetching data that might cause duplication
      // Instead we rely on our local state management
    }
  });

  // Delete mutation
  const deleteEntry = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `${queryKey[0]}/${id}`);
    },
    onMutate: async (deletedId) => {
      // Prevent duplicate deletes
      if (processingRef.current) return { previousEntries: [] };
      processingRef.current = true;
      
      // Delete optimistically from local state
      setEntries(prev => prev.filter(entry => entry.id !== deletedId));
      
      return { deletedId };
    },
    onSettled: () => {
      processingRef.current = false;
    },
    onError: () => {
      setError("Failed to delete entry. Please try again.");
      processingRef.current = false;
    }
  });

  // Debounced save to limit API calls
  const debouncedSave = useRef(
    debounce(async (content: string) => {
      if (!content.trim() || processingRef.current) return;
      
      try {
        await createEntry.mutateAsync(content);
      } catch (error) {
        console.error("Error in debouncedSave:", error);
        setError("Failed to save. Please try again.");
      }
    }, 500)
  ).current;

  // Initialize entries from source data
  const initializeEntries = useCallback((savedEntries: any[]) => {
    try {
      // Sanitize input
      const entries = Array.isArray(savedEntries) ? savedEntries : [];
      
      // Deduplicate entries by content before working with them
      const uniqueEntries = new Map();
      entries.forEach(entry => {
        // If multiple entries with same content, use the most recent one
        const existing = uniqueEntries.get(entry.content);
        if (!existing || new Date(entry.timestamp) > new Date(existing.timestamp)) {
          uniqueEntries.set(entry.content, entry);
        }
      });
      
      // Convert to array and sort by timestamp (newest first)
      const deduplicatedEntries = Array.from(uniqueEntries.values())
        .sort((a, b) => {
          const dateA = new Date(a.timestamp || 0);
          const dateB = new Date(b.timestamp || 0);
          return dateB.getTime() - dateA.getTime();
        });
      
      // Create our line items
      const savedLines = deduplicatedEntries.map(entry => ({
        id: entry.id,
        content: entry.content,
        isEditing: false,
        timestamp: new Date(entry.timestamp || Date.now()),
        isSaved: true
      }));

      // Add empty lines
      const emptyLinesCount = Math.max(defaultLines - savedLines.length, 1);
      const emptyLines = Array(emptyLinesCount).fill(null).map((_, i) => ({
        id: -(Date.now() + i), // Negative IDs for unsaved items
        content: "",
        isEditing: false,
        timestamp: new Date(),
        isSaved: false
      }));

      // Set the entries
      setEntries([...savedLines, ...emptyLines]);
      console.log(`Initialized ${savedLines.length} saved entries and ${emptyLines.length} empty lines`);
    } catch (error) {
      console.error("Error initializing entries:", error);
      setError("Failed to initialize entries. Please refresh the page.");
    }
  }, [defaultLines]);

  // Handle clicking on a line to edit
  const handleLineClick = useCallback((index: number, e: React.MouseEvent) => {
    try {
      e.stopPropagation();
      
      // Validate index
      if (index < 0 || index >= entries.length) {
        console.warn(`Attempted to click invalid line index: ${index}, entries length: ${entries.length}`);
        return;
      }
      
      const entry = entries[index];
      
      // Set as active entry
      setActiveEntry({
        index,
        content: entry.content || "",
        isDirty: false
      });
      
      // Store current content for comparison
      lastSavedContentRef.current = entry.content || "";
      setError(null);
      
      console.log(`Activated line ${index} for editing`);
    } catch (error) {
      console.error("Error in handleLineClick:", error);
      setError("Failed to activate line. Please try again.");
    }
  }, [entries]);

  // Handle input change within the active entry
  const handleInputChange = useCallback((value: string) => {
    if (!activeEntry) return;

    try {
      // Update the entry in our local list
      setEntries(prev => 
        prev.map((entry, i) => 
          i === activeEntry.index 
            ? { ...entry, content: value }
            : entry
        )
      );

      // Update the active entry state
      setActiveEntry(prev => ({ ...prev!, content: value, isDirty: true }));
    } catch (error) {
      console.error("Error in handleInputChange:", error);
      setError("Failed to update entry. Please try again.");
    }
  }, [activeEntry]);

  // Handle blur event (leaving the input)
  const handleBlur = useCallback(() => {
    if (!activeEntry) return;

    try {
      // Save if content has changed and is not empty
      if (activeEntry.isDirty && activeEntry.content.trim()) {
        // Content changed and not empty, save it
        debouncedSave(activeEntry.content);
      }
      
      // Clear the active entry
      setActiveEntry(null);
      console.log("Handling blur - entries now:", entries.length);
    } catch (error) {
      console.error("Error in handleBlur:", error);
      setError("Failed to save entry. Please try again.");
    }
  }, [activeEntry, debouncedSave, entries.length]);

  // Add a new blank entry
  const addMoreEntries = useCallback(() => {
    try {
      setEntries(prev => {
        const newId = -(Date.now() + Math.floor(Math.random() * 1000));
        const newEntries = [
          ...prev,
          {
            id: newId,
            content: "",
            isEditing: false,
            timestamp: new Date(),
            isSaved: false
          }
        ];
        return newEntries;
      });
      
      console.log(`Added new entry - entries now: ${entries.length + 1}`);
    } catch (error) {
      console.error("Error in addMoreEntries:", error);
      setError("Failed to add new entry. Please try again.");
    }
  }, [entries.length]);

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