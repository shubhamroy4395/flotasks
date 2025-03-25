import { useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import type { Note } from "@shared/schema";
import { trackEvent } from "@/lib/amplitude";
import { format } from "date-fns";
import { useLineItems } from "@/hooks/use-line-items";
import { useAuth } from "@/contexts/auth-context";

export function NotesSection() {
  const startTimeRef = useRef(performance.now());
  const { isAuthenticated } = useAuth();

  // Authenticated query
  const { data: authNotes = [] } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    enabled: isAuthenticated
  });

  // Public query
  const { data: publicNotes = [] } = useQuery<Note[]>({
    queryKey: ["/api/public/notes"],
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    enabled: !isAuthenticated
  });

  // Use the appropriate data source based on authentication status
  const savedNotes = isAuthenticated ? authNotes : publicNotes;

  // Choose the appropriate endpoint for line items
  const queryEndpoint = isAuthenticated ? "/api/notes" : "/api/public/notes";

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
    eventPrefix: "Notes",
    defaultLines: 3
  });

  // Initialize entries
  useEffect(() => {
    initializeEntries(savedNotes);
  }, [savedNotes, initializeEntries]);

  // Track component performance
  useEffect(() => {
    const loadTime = performance.now() - startTimeRef.current;
    trackEvent("component_mount", {
      component: 'NotesSection',
      loadTimeMs: loadTime,
      savedNotesCount: savedNotes.length,
      isAuthenticated
    });
  }, [savedNotes.length, isAuthenticated]);

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100">
        <CardTitle className="font-semibold">Quick Notes</CardTitle>
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
                  entry.isSaved ? 'bg-green-50/40' : ''
                } ${isLoading ? 'opacity-50' : ''} ${activeEntry?.index === index ? 'bg-green-50/60' : ''}`}
                whileHover={{ scale: 1.002 }}
                transition={{ duration: 0.2 }}
                layout
                onClick={(e) => handleLineClick(index, e)}
              >
                {/* Entry number and status indicator */}
                <div className="flex items-center w-6">
                  {entry.isSaved ? (
                    <span className="text-sm text-green-600 w-6 font-mono font-bold">
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
                  >
                    <Input
                      autoFocus
                      value={activeEntry.content}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onBlur={handleBlur}
                      className="flex-1 border-none shadow-none bg-transparent focus:ring-0 focus:outline-none font-medium text-gray-700 placeholder:text-gray-400"
                      placeholder="Write a quick note..."
                      disabled={isLoading}
                    />
                    {/* Show hint during editing */}
                    {activeEntry.isDirty && activeEntry.content.trim().length > 0 && (
                      <div className="text-xs text-green-600 mt-1 ml-1">
                        Will be saved automatically when you click away
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    className="flex items-center justify-between w-full cursor-text"
                    layout
                  >
                    <div className="flex-1">
                      {entry.isSaved && (
                        <div className="flex items-center mb-1">
                          <span className="text-xs text-green-600 mr-2 bg-green-100 rounded-full px-2 py-0.5">
                            Saved
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(entry.timestamp), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      )}
                      <span className={`${entry.isSaved ? 'text-gray-700' : 'text-gray-500'} font-medium`}>
                        {entry.content || (
                          <span className="text-gray-400 italic">Click to add a note...</span>
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
          Add Another Note
        </Button>
      </CardContent>
    </Card>
  );
}