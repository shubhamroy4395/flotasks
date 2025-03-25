import { useState, useCallback } from 'react';
import React from 'react';
import { apiRequest } from '@/lib/queryClient';
import { trackEvent } from '@/lib/amplitude';

// Simple interface for line items
interface LineItem {
  id: number;
  content: string;
  timestamp: Date;
  isSaved: boolean;
  isEditing: boolean;
}

// Interface for hook options
interface UseLineItemsOptions {
  queryKey: string[];
  eventPrefix: string;
  defaultLines?: number;
}

// Super-simplified hook for line items
export function useLineItems({ queryKey, eventPrefix, defaultLines = 3 }: UseLineItemsOptions) {
  // Basic state
  const [items, setItems] = useState<LineItem[]>([]);
  const [editingState, setEditingState] = useState<{index: number, content: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize items from server data
  const initializeItems = useCallback((serverItems: any[]) => {
    try {
      // Make sure we have an array
      const validItems = Array.isArray(serverItems) ? serverItems : [];
      
      // Filter out duplicates by content (keep most recent)
      const uniqueMap = new Map();
      validItems.forEach(item => {
        if (!item || !item.content) return;
        
        const existingItem = uniqueMap.get(item.content);
        if (!existingItem || new Date(item.timestamp) > new Date(existingItem.timestamp)) {
          uniqueMap.set(item.content, item);
        }
      });
      
      // Convert to array and sort by date (newest first)
      const sortedItems = Array.from(uniqueMap.values())
        .filter(item => item && item.content?.trim())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Convert to our internal format
      const savedItems = sortedItems.map(item => ({
        id: item.id,
        content: item.content,
        timestamp: new Date(item.timestamp),
        isSaved: true,
        isEditing: false
      }));
      
      // Add empty lines as needed
      const emptyCount = Math.max(defaultLines - savedItems.length, 1);
      const emptyItems = Array(emptyCount).fill(null).map((_, i) => ({
        id: -(Date.now() + i),
        content: '',
        timestamp: new Date(),
        isSaved: false,
        isEditing: false
      }));
      
      // Set state with combined items
      setItems([...savedItems, ...emptyItems]);
      console.log(`Initialized ${savedItems.length} saved items and ${emptyCount} empty lines`);
    } catch (error) {
      console.error('Error initializing items:', error);
      setError('Failed to load items. Please refresh the page.');
    }
  }, [defaultLines]);
  
  // Save item to server
  const saveItem = useCallback(async (content: string): Promise<any> => {
    if (!content.trim()) return null;
    
    setIsLoading(true);
    try {
      // Send to server
      const response = await apiRequest('POST', queryKey[0], { content });
      const result = await response.json();
      console.log('Item saved successfully:', result);
      return result;
    } catch (error) {
      console.error('Error saving item:', error);
      setError('Failed to save. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [queryKey]);
  
  // Delete item from server
  const removeItem = useCallback(async (id: number) => {
    if (id < 0) {
      // Just remove from local state if not saved
      setItems(current => current.filter(item => item.id !== id));
      return;
    }
    
    setIsLoading(true);
    try {
      await apiRequest('DELETE', `${queryKey[0]}/${id}`);
      setItems(current => current.filter(item => item.id !== id));
      console.log(`Item ${id} deleted successfully`);
    } catch (error) {
      console.error('Error deleting item:', error);
      setError('Failed to delete. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [queryKey]);
  
  // Handle clicking on a line
  const handleLineClick = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Validate index
    if (index < 0 || index >= items.length) {
      console.warn(`Invalid line index: ${index}, total items: ${items.length}`);
      return;
    }
    
    // Set editing state
    const item = items[index];
    
    // Update editing flags
    setItems(current => 
      current.map((item, idx) => ({
        ...item,
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
  
  // Handle input changes
  const handleInputChange = useCallback((value: string) => {
    if (!editingState) return;
    
    // Update editing state
    setEditingState({
      ...editingState,
      content: value
    });
    
    // Update item content
    setItems(current => 
      current.map((item, idx) => 
        idx === editingState.index ? { ...item, content: value } : item
      )
    );
  }, [editingState]);
  
  // Handle blur (save when user clicks away)
  const handleBlur = useCallback(async () => {
    if (!editingState) return;
    
    const { index, content } = editingState;
    const item = items[index];
    
    // Reset editing state
    setEditingState(null);
    setItems(current => current.map(item => ({ ...item, isEditing: false })));
    
    // Don't save if empty
    if (!content.trim()) {
      // If this was a saved item and now empty, delete it
      if (item.isSaved) {
        await removeItem(item.id);
      }
      return;
    }
    
    // Don't save if not changed
    if (content === item.content && item.isSaved) {
      return;
    }
    
    // Save to server
    const savedItem = await saveItem(content);
    if (savedItem) {
      // Update item with server data
      setItems(current => {
        // Create a new array with the updated item
        const updated = [...current];
        updated[index] = {
          id: savedItem.id,
          content: savedItem.content,
          timestamp: new Date(savedItem.timestamp),
          isSaved: true,
          isEditing: false
        };
        
        // Remove duplicates
        const result = updated.filter((item, idx) => {
          if (idx === index) return true; // Keep the updated item
          if (!item.content.trim()) return true; // Keep empty items for input
          // Remove duplicates with the same content
          return item.content !== savedItem.content;
        });
        
        // Make sure we have at least one empty item for new input
        const hasEmptyItem = result.some(item => !item.content.trim());
        if (!hasEmptyItem) {
          result.push({
            id: -(Date.now()),
            content: '',
            timestamp: new Date(),
            isSaved: false,
            isEditing: false
          });
        }
        
        return result;
      });
    }
    
    console.log("Finished editing, items count:", items.length);
  }, [editingState, items, saveItem, removeItem]);
  
  // Add a new empty item
  const addNewItem = useCallback(() => {
    const newId = -(Date.now());
    const newItem = {
      id: newId,
      content: '',
      timestamp: new Date(),
      isSaved: false,
      isEditing: false
    };
    
    setItems(current => [...current, newItem]);
    
    // Focus the new item
    setTimeout(() => {
      const newIndex = items.length;
      const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent;
      handleLineClick(newIndex, syntheticEvent);
    }, 50);
    
    console.log("Added new empty item");
  }, [items.length, handleLineClick]);
  
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