import { useState, useCallback } from 'react';
import React from 'react';
import { apiRequest } from '@/lib/queryClient';
import { trackEvent } from '@/lib/amplitude';

// Simple line item structure
type LineItem = {
  id: number; // Positive for saved items, negative for temporary
  content: string;
  timestamp: Date;
  isSaved: boolean;
  isEditing: boolean;
};

// Current editing state
type EditingState = {
  index: number;
  content: string;
} | null;

interface UseLineItemsOptions {
  queryKey: string[];
  eventPrefix: string;
  defaultLines?: number;
}

/**
 * A completely rewritten hook for managing line items (notes, gratitude entries, etc.)
 * with proper edge case handling and simpler logic
 */
export function useLineItems({ queryKey, eventPrefix, defaultLines = 3 }: UseLineItemsOptions) {
  // Core state
  const [items, setItems] = useState<LineItem[]>([]);
  const [editingState, setEditingState] = useState<EditingState>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Initialize the items from saved data
   */
  const initializeItems = useCallback((savedItems: any[]) => {
    try {
      // Ensure we have an array to work with
      const validItems = Array.isArray(savedItems) ? savedItems : [];
      
      // Create a map for deduplication by content
      const uniqueMap = new Map();
      validItems.forEach(item => {
        // Keep the most recent item when there are duplicates
        const existingItem = uniqueMap.get(item.content);
        if (!existingItem || new Date(item.timestamp) > new Date(existingItem.timestamp)) {
          uniqueMap.set(item.content, item);
        }
      });
      
      // Convert map to array and sort newest first
      const uniqueItems = Array.from(uniqueMap.values())
        .filter(item => item.content?.trim()) // Ignore empty items
        .sort((a, b) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
      
      // Create formatted items for our internal state
      const savedLines = uniqueItems.map(item => ({
        id: item.id,
        content: item.content,
        timestamp: new Date(item.timestamp),
        isSaved: true,
        isEditing: false
      }));
      
      // Always add empty input lines
      const emptyCount = Math.max(defaultLines - savedLines.length, 1);
      const emptyLines = Array(emptyCount).fill(null).map((_, i) => ({
        id: -(Date.now() + i), // Use negative IDs for unsaved items
        content: '',
        timestamp: new Date(),
        isSaved: false,
        isEditing: false
      }));
      
      // Set our items state
      setItems([...savedLines, ...emptyLines]);
      console.log(`Initialized ${savedLines.length} saved items and ${emptyCount} empty lines`);
    } catch (error) {
      console.error("Error initializing items:", error);
      setError("Failed to load items. Please refresh the page.");
    }
  }, [defaultLines]);
  
  /**
   * Save an item to the server
   */
  const saveItem = useCallback(async (content: string) => {
    if (!content.trim()) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const startTime = performance.now();
      
      // Send to server
      const response = await apiRequest("POST", queryKey[0], { content });
      const savedItem = await response.json();
      
      // Track for analytics
      const endTime = performance.now();
      trackEvent(`${eventPrefix}.Save`, {
        durationMs: endTime - startTime,
        contentLength: content.length
      });
      
      console.log("Item saved successfully:", savedItem);
      return savedItem;
    } catch (error) {
      console.error("Error saving item:", error);
      setError("Failed to save. Please try again.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [queryKey, eventPrefix]);
  
  /**
   * Delete an item from the server
   */
  const deleteItem = useCallback(async (id: number) => {
    if (id < 0) return true; // Item was never saved
    
    setIsLoading(true);
    setError(null);
    
    try {
      await apiRequest("DELETE", `${queryKey[0]}/${id}`);
      console.log(`Item ${id} deleted successfully`);
      return true;
    } catch (error) {
      console.error("Error deleting item:", error);
      setError("Failed to delete. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [queryKey]);
  
  /**
   * Handle clicking on a line to edit it
   */
  const handleLineClick = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Validate index
    if (index < 0 || index >= items.length) {
      console.warn(`Invalid line index: ${index}, total items: ${items.length}`);
      return;
    }
    
    const item = items[index];
    
    // Update item state to show it's being edited
    setItems(current => 
      current.map((i, idx) => ({
        ...i,
        isEditing: idx === index
      }))
    );
    
    // Set editing state
    setEditingState({
      index, 
      content: item.content
    });
    
    console.log(`Now editing line ${index}`);
  }, [items]);
  
  /**
   * Handle input changes while editing
   */
  const handleInputChange = useCallback((value: string) => {
    if (!editingState) return;
    
    // Update the editing state
    setEditingState({
      ...editingState,
      content: value
    });
    
    // Update the item in the list
    setItems(current => 
      current.map((item, index) => 
        index === editingState.index 
          ? { ...item, content: value }
          : item
      )
    );
  }, [editingState]);
  
  /**
   * Handle when the user finishes editing (blur event)
   */
  const handleBlur = useCallback(async () => {
    if (!editingState) return;
    
    const { index, content } = editingState;
    const currentItem = items[index];
    
    // Reset editing state first to prevent UI jumps
    setEditingState(null);
    
    // Update all items to remove editing flag
    setItems(current => 
      current.map(item => ({
        ...item,
        isEditing: false
      }))
    );
    
    // Check if content changed and if it's not empty
    if (content.trim() && content !== currentItem.content) {
      // Optimistically update this item
      const tempId = -Date.now();
      setItems(current => 
        current.map((item, idx) => 
          idx === index
            ? { 
                ...item, 
                id: tempId, 
                content, 
                timestamp: new Date(),
                isSaved: false 
              }
            : item
        )
      );
      
      // Save to server
      const savedItem = await saveItem(content);
      
      if (savedItem) {
        // Update with real data from server
        setItems(current => {
          // Create a copy of our current items
          const updated = [...current];
          
          // Find and update the item we just saved
          const itemIndex = updated.findIndex(item => 
            item.id === tempId || 
            (item.id === currentItem.id && index === updated.indexOf(item))
          );
          
          if (itemIndex >= 0) {
            updated[itemIndex] = {
              id: savedItem.id,
              content: savedItem.content,
              timestamp: new Date(savedItem.timestamp),
              isSaved: true,
              isEditing: false
            };
          }
          
          // Check for any duplicates and remove them
          const deduplicated = updated.filter((item, idx) => {
            // Keep the item we just saved
            if (idx === itemIndex) return true;
            
            // Remove any items with the same content
            const isDuplicate = item.content === savedItem.content && 
              Math.abs(new Date(item.timestamp).getTime() - new Date(savedItem.timestamp).getTime()) < 5000;
            
            return !isDuplicate;
          });
          
          // Make sure we always have an empty line at the end
          const hasEmptyLine = deduplicated.some(item => !item.content.trim());
          
          if (!hasEmptyLine) {
            deduplicated.push({
              id: -Date.now(),
              content: '',
              timestamp: new Date(),
              isSaved: false,
              isEditing: false
            });
          }
          
          return deduplicated;
        });
      }
    } else if (!content.trim() && currentItem.isSaved) {
      // If user cleared a saved item, delete it
      const deleted = await deleteItem(currentItem.id);
      
      if (deleted) {
        // Remove from our list
        setItems(current => 
          current.filter((_, idx) => idx !== index)
        );
      }
    }
    
    console.log("Finished editing, items count:", items.length);
  }, [editingState, items, saveItem, deleteItem]);
  
  /**
   * Add a new empty entry
   */
  const addNewItem = useCallback(() => {
    const newId = -Date.now();
    
    setItems(current => [
      ...current,
      {
        id: newId,
        content: '',
        timestamp: new Date(),
        isSaved: false,
        isEditing: false
      }
    ]);
    
    // Automatically focus the new item
    setTimeout(() => {
      const newIndex = items.length; // The index of the item we just added
      const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent;
      handleLineClick(newIndex, syntheticEvent);
    }, 50);
    
    console.log("Added new empty item");
  }, [items.length, handleLineClick]);
  
  /**
   * Remove an item
   */
  const removeItem = useCallback(async (id: number) => {
    // Find the item
    const itemIndex = items.findIndex(item => item.id === id);
    if (itemIndex === -1) return;
    
    const item = items[itemIndex];
    
    // If it's saved, delete from server
    if (item.isSaved) {
      const success = await deleteItem(id);
      if (!success) return;
    }
    
    // Remove from our list
    setItems(current => current.filter(item => item.id !== id));
    console.log(`Removed item ${id}`);
  }, [items, deleteItem]);
  
  return {
    items,
    editingState,
    isLoading,
    error,
    initializeItems,
    handleLineClick,
    handleInputChange,
    handleBlur,
    addNewItem,
    removeItem
  };
}