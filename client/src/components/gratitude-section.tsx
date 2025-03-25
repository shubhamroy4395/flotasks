import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useQuery } from "@tanstack/react-query";
import type { GratitudeEntry } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
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
  } = useLineItems({
    queryKey: [queryEndpoint],
    eventPrefix: "Gratitude",
    defaultLines: 3
  });

  // Initialize entries
  useEffect(() => {
    initializeEntries(savedEntries);
  }, [savedEntries, initializeEntries]);

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
    if (entries.length > 0 && !isLoading) {
      // Find the first empty, non-saved entry index
      const firstEmptyIndex = entries.findIndex(entry => !entry.content && !entry.isSaved);
      
      if (firstEmptyIndex !== -1 && firstEmptyInputRef.current) {
        // Focus on the first empty input with a slight delay for better UX
        setTimeout(() => {
          const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent;
          handleLineClick(firstEmptyIndex, syntheticEvent);
        }, 100);
      }
    }
  }, [entries, isLoading, handleLineClick]);

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

  const getCardColorClass = (index: number) => {
    const colors = [
      'from-rose-50 to-amber-50 border-l-rose-300',
      'from-emerald-50 to-teal-50 border-l-emerald-300',
      'from-blue-50 to-indigo-50 border-l-blue-300',
      'from-violet-50 to-purple-50 border-l-violet-300',
      'from-amber-50 to-yellow-50 border-l-amber-300'
    ];
    
    // Get color based on entry index, cycling through the options
    return colors[index % colors.length];
  };

  const getIconForEntry = (index: number) => {
    const icons = [
      <Heart className="h-4 w-4 text-rose-500" />,
      <Star className="h-4 w-4 text-amber-500" />,
      <Sun className="h-4 w-4 text-yellow-500" />,
      <Bookmark className="h-4 w-4 text-blue-500" />,
      <Calendar className="h-4 w-4 text-emerald-500" />
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
          {entries.filter(e => e.isSaved).length} Moments of Gratitude
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

          <AnimatePresence mode="sync">
            {entries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className={`group relative ${entry.isSaved ? 'mb-5' : 'mb-2'}`}
                layout
              >
                {entry.isSaved && (
                  <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm z-10">
                    {getIconForEntry(index)}
                  </div>
                )}
                
                <div 
                  className={`rounded-lg p-4 border-l-4 shadow-sm cursor-pointer transition-all duration-300 
                    ${entry.isSaved 
                      ? `bg-gradient-to-r ${getCardColorClass(index)} hover:shadow-md` 
                      : 'bg-white border-l-gray-200 hover:border-l-gray-400'}
                    ${isLoading ? 'opacity-60' : ''} 
                    ${activeEntry?.index === index ? 'shadow-md' : ''}`}
                  onClick={(e) => handleLineClick(index, e)}
                >
                  {activeEntry?.index === index ? (
                    <motion.div
                      className="flex flex-col gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      ref={!entry.isSaved && !entry.content ? firstEmptyInputRef : null}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          {entry.isSaved ? 'Editing gratitude entry' : 'New gratitude entry'}
                        </div>
                        <div className="flex items-center space-x-1">
                          <EmojiPicker onSelect={setSelectedEmoji} selected={selectedEmoji} />
                        </div>
                      </div>
                      
                      <Input
                        autoFocus
                        value={activeEntry.content}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onBlur={handleBlur}
                        className="border border-gray-200 bg-white bg-opacity-70 font-medium text-gray-800 placeholder:text-gray-400 rounded-md"
                        placeholder={getRandomPrompt()}
                        disabled={isLoading}
                      />
                      
                      {activeEntry.isDirty && activeEntry.content.trim().length > 0 && (
                        <div className="flex items-center mt-1 text-xs text-amber-600">
                          <PenLine className="h-3 w-3 mr-1" />
                          Saving automatically when you click away
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div layout>
                      {entry.isSaved ? (
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
                                deleteEntry.mutate(entry.id);
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
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full mt-6 bg-gradient-to-r from-rose-50 to-amber-50 hover:from-rose-100 hover:to-amber-100 border border-rose-200 text-rose-600 font-medium rounded-lg"
          onClick={addMoreEntries}
          disabled={isLoading}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another Gratitude
        </Button>
      </CardContent>
    </Card>
  );
}