import { useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useQuery } from "@tanstack/react-query";
import type { GratitudeEntry } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { trackEvent } from "@/lib/amplitude";
import { useLineItems } from "@/hooks/use-line-items";
import { useAuth } from "@/contexts/auth-context";

export function GratitudeSection() {
  const startTimeRef = useRef(performance.now());
  const { isAuthenticated } = useAuth();
  const firstEmptyInputRef = useRef<HTMLDivElement | null>(null);

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
                  entry.isSaved ? 'bg-blue-50/40' : ''
                } ${isLoading ? 'opacity-50' : ''} ${activeEntry?.index === index ? 'bg-blue-50/60' : ''}`}
                whileHover={{ scale: 1.002 }}
                transition={{ duration: 0.2 }}
                layout
                onClick={(e) => handleLineClick(index, e)}
              >
                {/* Entry number and status indicator */}
                <div className="flex items-center w-6">
                  {entry.isSaved ? (
                    <span className="text-sm text-blue-500 w-6 font-mono font-bold">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400 w-6 font-mono font-bold">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  )}
                </div>

                {activeEntry?.index === index ? (
                  <motion.div
                    className="flex-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    layout
                    ref={!entry.isSaved && !entry.content ? firstEmptyInputRef : null}
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
                    {/* Show hint during editing */}
                    {activeEntry.isDirty && activeEntry.content.trim().length > 0 && (
                      <div className="text-xs text-blue-500 mt-1 ml-1">
                        Will be saved automatically when you click away
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    className="flex items-center justify-between w-full cursor-text"
                    layout
                  >
                    <div className="flex-1 flex items-center">
                      {entry.isSaved && (
                        <span className="text-xs text-blue-500 mr-2 bg-blue-100 rounded-full px-2 py-0.5">
                          Saved
                        </span>
                      )}
                      <span className={`${entry.isSaved ? 'text-gray-700' : 'text-gray-500'} font-medium`}>
                        {entry.content || (
                          <span className="text-gray-400 italic">Click to add a gratitude note...</span>
                        )}
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