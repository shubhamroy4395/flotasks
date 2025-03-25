import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useQuery } from "@tanstack/react-query";
import type { GratitudeEntry } from "@shared/schema";
import { Heart, Plus, Trash2, Sun, Star, PenLine, Calendar, Bookmark } from "lucide-react";
import { trackEvent } from "@/lib/amplitude";
import { useLineItems } from "@/hooks/use-line-items";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";
import { EmojiPicker } from "./ui/emoji-picker";

export function GratitudeSection() {
  const startTimeRef = useRef(performance.now());
  const { isAuthenticated } = useAuth();
  const firstEmptyInputRef = useRef<HTMLDivElement | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string>("❤️");

  // Authenticated query
  const { data: authEntries = [] } = useQuery<GratitudeEntry[]>({
    queryKey: ["/api/gratitude"],
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    enabled: isAuthenticated
  });

  // Public query
  const { data: publicEntries = [] } = useQuery<GratitudeEntry[]>({
    queryKey: ["/api/public/gratitude"],
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    enabled: !isAuthenticated
  });

  // Use the appropriate data source based on authentication status
  const savedEntries = isAuthenticated ? authEntries : publicEntries;

  // Choose the appropriate endpoint for line items
  const queryEndpoint = isAuthenticated ? "/api/gratitude" : "/api/public/gratitude";

  const {
    items,
    editingState,
    error,
    isLoading,
    initializeItems,
    handleLineClick,
    handleInputChange,
    handleBlur,
    addNewItem,
    removeItem
  } = useLineItems({
    queryKey: [queryEndpoint],
    eventPrefix: "Gratitude",
    defaultLines: 3
  });

  // Initialize entries when data changes
  useEffect(() => {
    initializeItems(savedEntries);
  }, [savedEntries, initializeItems]);

  // Track component performance
  useEffect(() => {
    const loadTime = performance.now() - startTimeRef.current;
    trackEvent("component_mount", {
      component: 'GratitudeSection',
      loadTimeMs: loadTime,
      savedEntriesCount: savedEntries.length,
      isAuthenticated
    });
  }, [savedEntries.length, isAuthenticated]);
  
  // Find the first empty line after mount to assist users
  useEffect(() => {
    if (items.length > 0 && !isLoading) {
      // Find the first empty input field
      const firstEmptyIndex = items.findIndex(item => !item.content);
      
      if (firstEmptyIndex !== -1 && firstEmptyInputRef.current) {
        // Focus on it with a slight delay
        setTimeout(() => {
          const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent;
          handleLineClick(firstEmptyIndex, syntheticEvent);
        }, 100);
      }
    }
  }, [items, isLoading, handleLineClick]);

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

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gradient-to-r from-amber-50 to-rose-50">
        <div className="flex items-center space-x-2">
          <Heart className="h-5 w-5 text-rose-500" />
          <CardTitle className="font-semibold">Gratitude Journal</CardTitle>
        </div>
        <div className="hidden sm:block px-3 py-1 bg-white bg-opacity-70 rounded-full text-xs text-gray-600 font-medium">
          {items.filter(item => item.isSaved).length} Moments of Gratitude
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
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`group relative ${item.isSaved ? 'mb-4' : 'mb-3'}`}
              >
                {item.isSaved && (
                  <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm z-10">
                    {getIconForEntry(index)}
                  </div>
                )}
                
                <div 
                  className={`rounded-lg p-4 border-l-4 shadow-sm cursor-pointer 
                    ${item.isSaved 
                      ? `bg-gradient-to-r ${getCardColorClass(index)} hover:shadow-md` 
                      : 'bg-white border-l-gray-200 hover:border-l-gray-400'}
                    ${isLoading ? 'opacity-60' : ''} 
                    ${item.isEditing ? 'shadow-md' : ''}`}
                  onClick={(e) => handleLineClick(index, e)}
                >
                  {item.isEditing ? (
                    <div
                      className="flex flex-col gap-2"
                      ref={!item.isSaved && !item.content ? firstEmptyInputRef : null}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          {item.isSaved ? 'Editing gratitude entry' : 'New gratitude entry'}
                        </div>
                        <div className="flex items-center space-x-1">
                          <EmojiPicker onSelect={setSelectedEmoji} selected={selectedEmoji} />
                        </div>
                      </div>
                      
                      <Input
                        autoFocus
                        value={editingState?.content || item.content}
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
                      {item.isSaved ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-700">{selectedEmoji}</span>
                              <span className="ml-2 text-xs text-gray-500">
                                {format(new Date(item.timestamp), 'MMMM d, h:mm a')}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-white hover:bg-opacity-60 h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeItem(item.id);
                              }}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-gray-800 font-medium">{item.content}</p>
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
          onClick={addNewItem}
          disabled={isLoading}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another Gratitude
        </Button>
      </CardContent>
    </Card>
  );
}