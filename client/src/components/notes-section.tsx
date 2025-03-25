import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useQuery } from "@tanstack/react-query";
import { FileText, PenLine, Plus, Trash2 } from "lucide-react";
import type { Note } from "@shared/schema";
import { trackEvent } from "@/lib/amplitude";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";

// Simple note interface for local state
interface NoteItem {
  id: number;
  content: string;
  timestamp: Date;
  isEditing?: boolean;
}

export function NotesSection() {
  const startTimeRef = useRef(performance.now());
  const { isAuthenticated } = useAuth();
  
  // Local state for notes
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  // API endpoint based on auth status
  const apiEndpoint = isAuthenticated ? "/api/notes" : "/api/public/notes";

  // Fetch notes
  const { data: fetchedNotes = [], refetch } = useQuery<Note[]>({
    queryKey: [apiEndpoint],
    staleTime: 30000,
    retry: 3
  });

  // Initialize notes when data changes
  useEffect(() => {
    if (fetchedNotes.length > 0) {
      // Create our local notes from fetched data
      const savedNotes = fetchedNotes.map(note => ({
        id: note.id,
        content: note.content,
        timestamp: new Date(note.timestamp)
      }));
      
      // Make sure we have at least one empty note for input
      const emptyNote = {
        id: -(Date.now()),
        content: "",
        timestamp: new Date()
      };
      
      setNotes([...savedNotes, emptyNote]);
    } else {
      // If no notes, create empty ones
      const emptyNotes = Array(3).fill(null).map((_, i) => ({
        id: -(Date.now() + i),
        content: "",
        timestamp: new Date()
      }));
      
      setNotes(emptyNotes);
    }
  }, [fetchedNotes]);

  // Save note to server
  const saveNote = useCallback(async (content: string): Promise<void> => {
    if (!content.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", apiEndpoint, { content });
      const savedNote = await response.json();
      
      // Add the new note to our list
      setNotes(current => {
        // Create new array with the saved note
        const updated = current.map(note => ({
          ...note,
          isEditing: false
        }));
        
        // Replace the edited note with saved one if editing
        if (editingIndex !== null) {
          updated[editingIndex] = {
            id: savedNote.id,
            content: savedNote.content,
            timestamp: new Date(savedNote.timestamp),
            isEditing: false
          };
        }
        
        // Make sure we still have an empty note
        const hasEmpty = updated.some(note => !note.content);
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
      console.error("Error saving note:", error);
      setError("Failed to save. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint, editingIndex, refetch]);

  // Delete note
  const deleteNote = useCallback(async (id: number) => {
    if (id < 0) {
      // Simply remove from local state if not saved
      setNotes(current => current.filter(note => note.id !== id));
      return;
    }
    
    setIsLoading(true);
    try {
      await apiRequest("DELETE", `${apiEndpoint}/${id}`);
      setNotes(current => current.filter(note => note.id !== id));
      refetch();
    } catch (error) {
      console.error("Error deleting note:", error);
      setError("Failed to delete. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint, refetch]);

  // Handle clicking on a note
  const handleNoteClick = useCallback((index: number) => {
    // Update local state to show this note is being edited
    setNotes(current => {
      return current.map((note, i) => ({
        ...note,
        isEditing: i === index
      }));
    });
    
    // Set editing index and input value
    setEditingIndex(index);
    setInputValue(notes[index]?.content || "");
  }, [notes]);

  // Handle input changes
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  // Handle blur event (save when clicking away)
  const handleBlur = useCallback(() => {
    if (editingIndex !== null && inputValue.trim()) {
      saveNote(inputValue);
    }
    
    // Clear editing state
    setEditingIndex(null);
    setInputValue("");
    
    // Remove editing flag from notes
    setNotes(current => 
      current.map(note => ({
        ...note,
        isEditing: false
      }))
    );
  }, [editingIndex, inputValue, saveNote]);

  // Add new empty note
  const addNewNote = useCallback(() => {
    const newNote = {
      id: -(Date.now()),
      content: "",
      timestamp: new Date(),
      isEditing: false
    };
    
    // Add to notes list
    setNotes(current => [...current, newNote]);
    
    // Focus the new note (after a brief delay to allow rendering)
    setTimeout(() => {
      const newIndex = notes.length;
      handleNoteClick(newIndex);
    }, 50);
  }, [notes.length, handleNoteClick]);

  // Track component performance
  useEffect(() => {
    const loadTime = performance.now() - startTimeRef.current;
    trackEvent("component_mount", {
      component: 'NotesSection',
      loadTimeMs: loadTime,
      savedNotesCount: fetchedNotes.length,
      isAuthenticated
    });
  }, [fetchedNotes.length, isAuthenticated]);

  // Count saved notes
  const savedNotesCount = notes.filter(note => note.content && note.id > 0).length;

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-indigo-500" />
          <CardTitle className="font-semibold">Quick Notes</CardTitle>
        </div>
        <div className="hidden sm:block text-xs text-gray-500">
          {savedNotesCount} Notes Captured
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
            {notes.map((note, index) => (
              <div
                key={note.id}
                className="group relative"
              >
                <div 
                  className={`rounded-lg p-3 border cursor-pointer
                    ${note.content && note.id > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:border-gray-300'}
                    ${isLoading ? 'opacity-60' : ''} 
                    ${editingIndex === index ? 'shadow-md' : 'hover:shadow-sm'}`}
                  onClick={() => handleNoteClick(index)}
                >
                  {editingIndex === index ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-gray-500">
                          {note.id > 0 ? 'Editing note' : 'New note'}
                        </div>
                      </div>
                      
                      <Input
                        autoFocus
                        value={inputValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onBlur={handleBlur}
                        className="border border-gray-200 bg-white font-medium text-gray-700 placeholder:text-gray-400 rounded-md"
                        placeholder="Write a quick note..."
                        disabled={isLoading}
                      />
                      
                      <div className="flex items-center mt-1 text-xs text-indigo-600">
                        <PenLine className="h-3 w-3 mr-1" />
                        Saving automatically when you click away
                      </div>
                    </div>
                  ) : (
                    <div>
                      {note.content ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-indigo-500" />
                              <span className="text-xs text-gray-500">
                                {format(new Date(note.timestamp), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-white hover:bg-opacity-60 h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNote(note.id);
                              }}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <p className="text-gray-700 font-medium text-sm">
                            {note.content}
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
          onClick={addNewNote}
          disabled={isLoading}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Note
        </Button>
      </CardContent>
    </Card>
  );
}