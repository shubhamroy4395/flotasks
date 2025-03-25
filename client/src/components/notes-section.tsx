import { useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useQuery } from "@tanstack/react-query";
import { FileText, PenLine, Plus, Trash2 } from "lucide-react";
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
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-indigo-500" />
          <CardTitle className="font-semibold">Quick Notes</CardTitle>
        </div>
        <div className="hidden sm:block text-xs text-gray-500">
          {entries.filter(e => e.isSaved).length} Notes Captured
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        {error && (
          <div className="mb-4 p-2 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-3 mt-2">
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className="group relative"
              >
                <div 
                  className={`rounded-lg p-3 border cursor-pointer
                    ${entry.isSaved ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:border-gray-300'}
                    ${isLoading ? 'opacity-60' : ''} 
                    ${activeEntry?.index === index ? 'shadow-md' : 'hover:shadow-sm'}`}
                  onClick={(e) => handleLineClick(index, e)}
                >
                  {activeEntry?.index === index ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-gray-500">
                          {entry.isSaved ? 'Editing note' : 'New note'}
                        </div>
                      </div>
                      
                      <Input
                        autoFocus
                        value={activeEntry.content}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onBlur={handleBlur}
                        className="border border-gray-200 bg-white font-medium text-gray-700 placeholder:text-gray-400 rounded-md"
                        placeholder="Write a quick note..."
                        disabled={isLoading}
                      />
                      
                      {activeEntry.isDirty && activeEntry.content.trim().length > 0 && (
                        <div className="flex items-center mt-1 text-xs text-indigo-600">
                          <PenLine className="h-3 w-3 mr-1" />
                          Saving automatically when you click away
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {entry.isSaved ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-indigo-500" />
                              <span className="text-xs text-gray-500">
                                {format(new Date(entry.timestamp), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-white hover:bg-opacity-60 h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteEntry.mutate(entry.id);
                              }}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <p className="text-gray-700 font-medium text-sm">
                            {entry.content}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-16 text-gray-400 flex-col gap-1">
                          <FileText className="h-4 w-4 mb-1" />
                          <span className="text-center text-sm italic">Click to add a note...</span>
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
          className="w-full mt-6 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 border border-indigo-200 text-indigo-600 font-medium rounded-lg"
          onClick={addMoreEntries}
          disabled={isLoading}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Note
        </Button>
      </CardContent>
    </Card>
  );
}