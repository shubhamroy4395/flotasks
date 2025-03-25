import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useQuery } from "@tanstack/react-query";
import type { GratitudeEntry } from "@shared/schema";
import { Heart, Plus, Trash2, Sun, Star, PenLine, Calendar, Bookmark } from "lucide-react";
import { trackEvent } from "@/lib/amplitude";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import { EmojiPicker } from "./ui/emoji-picker";
import { apiRequest } from "@/lib/queryClient";

// Simple entry interface for local state
interface Entry {
  id: number;
  content: string;
  timestamp: Date;
  isEditing?: boolean;
}

export function GratitudeSection() {
  const startTimeRef = useRef(performance.now());
  const { isAuthenticated } = useAuth();
  const firstEmptyInputRef = useRef<HTMLDivElement | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string>("❤️");
  
  // Local state
  const [entries, setEntries] = useState<Entry[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  // API endpoint based on auth status
  const apiEndpoint = isAuthenticated ? "/api/gratitude" : "/api/public/gratitude";

  // Fetch entries
  const { data: fetchedEntries = [], refetch } = useQuery<GratitudeEntry[]>({
    queryKey: [apiEndpoint],
    staleTime: 30000,
    retry: 3
  });

  // Initialize entries when data changes
  useEffect(() => {
    if (fetchedEntries.length > 0) {
      // Create our local entries from fetched data
      const savedEntries = fetchedEntries.map(entry => ({
        id: entry.id,
        content: entry.content,
        timestamp: new Date(entry.timestamp)
      }));
      
      // Make sure we have at least one empty entry for input
      const emptyEntry = {
        id: -(Date.now()),
        content: "",
        timestamp: new Date()
      };
      
      setEntries([...savedEntries, emptyEntry]);
    } else {
      // If no entries, create empty ones
      const emptyEntries = Array(3).fill(null).map((_, i) => ({
        id: -(Date.now() + i),
        content: "",
        timestamp: new Date()
      }));
      
      setEntries(emptyEntries);
    }
  }, [fetchedEntries]);

  // Save entry to server
  const saveEntry = useCallback(async (content: string): Promise<void> => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", apiEndpoint, { content });
      const savedEntry = await response.json();
      
      // Add the new entry to our list
      setEntries(current => {
        // Create new array with the saved entry
        const updated = current.map(entry => ({
          ...entry,
          isEditing: false
        }));
        
        // Replace the edited entry with saved one if editing
        if (editingIndex !== null) {
          updated[editingIndex] = {
            id: savedEntry.id,
            content: savedEntry.content,
            timestamp: new Date(savedEntry.timestamp),
            isEditing: false
          };
        }
        
        // Make sure we still have an empty entry
        const hasEmpty = updated.some(entry => !entry.content);
        if (!hasEmpty) {
          updated.push({
            id: -(Date.now()),
            content: "",
            timestamp: new Date(),
            isEditing: false
          });
        }
        
        return updated;
      });
      
      // Clear editing state
      setEditingIndex(null);
      setInputValue("");
      
      // Refetch to ensure we have latest data
      refetch();
    } catch (error) {
      console.error("Error saving gratitude entry:", error);
      setError("Failed to save. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint, editingIndex, refetch]);

  // Delete entry
  const deleteEntry = useCallback(async (id: number) => {
    if (id < 0) {
      // Simply remove from local state if not saved
      setEntries(current => current.filter(e => e.id !== id));
      return;
    }
    
    setIsLoading(true);
    try {
      await apiRequest("DELETE", `${apiEndpoint}/${id}`);
      setEntries(current => current.filter(e => e.id !== id));
      refetch();
    } catch (error) {
      console.error("Error deleting entry:", error);
      setError("Failed to delete. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint, refetch]);

  // Handle clicking on an entry
  const handleEntryClick = useCallback((index: number) => {
    // Update local state to show this entry is being edited
    setEntries(current => {
      return current.map((entry, i) => ({
        ...entry,
        isEditing: i === index
      }));
    });
    
    // Set editing index and input value
    setEditingIndex(index);
    setInputValue(entries[index]?.content || "");
  }, [entries]);

  // Handle input changes
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  // Handle blur event (save when clicking away)
  const handleBlur = useCallback(() => {
    if (editingIndex !== null && inputValue.trim()) {
      // Save immediately without waiting for API response
      const entryToSave = inputValue;
      
      // Update local state optimistically
      setEntries(current => {
        const updated = [...current];
        if (updated[editingIndex]) {
          updated[editingIndex] = {
            ...updated[editingIndex],
            content: entryToSave,
            isEditing: false
          };
        }
        return updated;
      });
      
      // Trigger actual save in the background
      saveEntry(entryToSave);
    }
    
    // Clear editing state
    setEditingIndex(null);
    setInputValue("");
    
    // Remove editing flag from entries
    setEntries(current => 
      current.map(entry => ({
        ...entry,
        isEditing: false
      }))
    );
  }, [editingIndex, inputValue, saveEntry]);

  // Add new empty entry
  const addNewEntry = useCallback(() => {
    const newEntry = {
      id: -(Date.now()),
      content: "",
      timestamp: new Date(),
      isEditing: false
    };
    
    // Add to entries list
    setEntries(current => [...current, newEntry]);
    
    // Focus the new entry (after a brief delay to allow rendering)
    setTimeout(() => {
      const newIndex = entries.length;
      handleEntryClick(newIndex);
    }, 50);
  }, [entries.length, handleEntryClick]);

  // Track component performance
  useEffect(() => {
    const loadTime = performance.now() - startTimeRef.current;
    trackEvent("component_mount", {
      component: 'GratitudeSection',
      loadTimeMs: loadTime,
      savedEntriesCount: fetchedEntries.length,
      isAuthenticated
    });
  }, [fetchedEntries.length, isAuthenticated]);

  // Get a random prompt for inspiration
  const getRandomPrompt = () => {
    const prompts = [
      "I am grateful for a person who...",
      "Something beautiful I saw today...",
      "A small joy that made me smile today...",
      "A challenge that taught me something...",
      "Something I'm looking forward to...",
      "A small act of kindness I witnessed...",
      "Something that made me laugh today...",
      "A comfort I often take for granted...",
      "Someone who helped me recently...",
      "A skill or ability I'm thankful to have..."
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  };

  // Card styling helpers
  const getCardColorClass = (index: number) => {
    const colors = [
      'from-rose-50 to-amber-50 border-l-rose-300',
      'from-emerald-50 to-teal-50 border-l-emerald-300',
      'from-blue-50 to-indigo-50 border-l-blue-300',
      'from-violet-50 to-purple-50 border-l-violet-300',
      'from-amber-50 to-yellow-50 border-l-amber-300'
    ];
    return colors[index % colors.length];
  };

  const getIconForEntry = (index: number) => {
    const icons = [
      <Heart key="heart" className="h-4 w-4 text-rose-500" />,
      <Star key="star" className="h-4 w-4 text-amber-500" />,
      <Sun key="sun" className="h-4 w-4 text-yellow-500" />,
      <Bookmark key="bookmark" className="h-4 w-4 text-blue-500" />,
      <Calendar key="calendar" className="h-4 w-4 text-emerald-500" />
    ];
    return icons[index % icons.length];
  };

  // Count saved entries
  const savedEntriesCount = entries.filter(e => e.content && e.id > 0).length;

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gradient-to-r from-amber-50 to-rose-50">
        <div className="flex items-center space-x-2">
          <Heart className="h-5 w-5 text-rose-500" />
          <CardTitle className="font-semibold">Gratitude Journal</CardTitle>
        </div>
        <div className="hidden sm:block px-3 py-1 bg-white bg-opacity-70 rounded-full text-xs text-gray-600 font-medium">
          {savedEntriesCount} Moments of Gratitude
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {error && (
          <div className="mb-4 p-2 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-md border border-gray-100">
            "Gratitude turns what we have into enough." — Melody Beattie
          </div>

          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className={`group relative ${entry.content ? 'mb-4' : 'mb-3'}`}
              >
                {entry.content && entry.id > 0 && (
                  <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm z-10">
                    {getIconForEntry(index)}
                  </div>
                )}
                
                <div 
                  className={`rounded-lg p-4 border-l-4 shadow-sm cursor-pointer 
                    ${entry.content && entry.id > 0
                      ? `bg-gradient-to-r ${getCardColorClass(index)} hover:shadow-md` 
                      : 'bg-white border-l-gray-200 hover:border-l-gray-400'}
                    ${isLoading ? 'opacity-60' : ''} 
                    ${editingIndex === index ? 'shadow-md' : ''}`}
                  onClick={() => handleEntryClick(index)}
                >
                  {editingIndex === index ? (
                    <div
                      className="flex flex-col gap-2"
                      ref={!entry.content ? firstEmptyInputRef : null}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          {entry.id > 0 ? 'Editing gratitude entry' : 'New gratitude entry'}
                        </div>
                        <div className="flex items-center space-x-1">
                          <EmojiPicker onSelect={setSelectedEmoji} selected={selectedEmoji} />
                        </div>
                      </div>
                      
                      <Input
                        autoFocus
                        value={inputValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onBlur={handleBlur}
                        className="border border-gray-200 bg-white bg-opacity-70 font-medium text-gray-800 placeholder:text-gray-400 rounded-md"
                        placeholder={getRandomPrompt()}
                        disabled={isLoading}
                      />
                      
                      <div className="flex items-center mt-1 text-xs text-amber-600">
                        <PenLine className="h-3 w-3 mr-1" />
                        Saving automatically when you click away
                      </div>
                    </div>
                  ) : (
                    <div>
                      {entry.content ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-700">{selectedEmoji}</span>
                              <span className="ml-2 text-xs text-gray-500">
                                {format(new Date(entry.timestamp), 'MMMM d, h:mm a')}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-white hover:bg-opacity-60 h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteEntry(entry.id);
                              }}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-gray-800 font-medium">{entry.content}</p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-16 text-gray-400">
                          <span className="text-center italic">Click to add a gratitude reflection...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full mt-6 bg-gradient-to-r from-rose-50 to-amber-50 hover:from-rose-100 hover:to-amber-100 border border-rose-200 text-rose-600 font-medium rounded-lg"
          onClick={addNewEntry}
          disabled={isLoading}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another Gratitude
        </Button>
      </CardContent>
    </Card>
  );
}