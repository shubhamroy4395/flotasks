import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Note } from "@shared/schema";
import { trackEvent, Events } from "@/lib/amplitude";

export function NotesSection() {
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const formOpenTime = useRef(Date.now());

  // Track section open
  useEffect(() => {
    trackEvent(Events.NOTES_SECTION_OPEN, {
      componentName: 'NotesSection',
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      isWeekend: [0, 6].includes(new Date().getDay())
    });
  }, []);

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  const createNote = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", "/api/notes", { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({
        title: "Note added!",
        duration: 2000,
      });

      // Track note creation
      trackEvent(Events.NOTE_CREATED, {
        contentLength: newNote.length,
        wordCount: newNote.trim().split(/\s+/).length,
        formDuration: Date.now() - formOpenTime.current,
        existingNotes: notes.length,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        isWeekend: [0, 6].includes(new Date().getDay())
      });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/notes/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });

      // Track note deletion
      const deletedNote = notes.find(note => note.id === id);
      if (deletedNote) {
        trackEvent(Events.NOTE_DELETED, {
          noteAge: Date.now() - new Date(deletedNote.timestamp).getTime(),
          contentLength: deletedNote.content.length,
          remainingNotes: notes.length - 1,
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay()
        });
      }
    },
  });

  const handleFormOpen = () => {
    setIsAdding(true);
    formOpenTime.current = Date.now();
    trackEvent(Events.UI_MODAL_OPENED, {
      modalType: 'note-form',
      timeOfDay: new Date().getHours(),
      existingNotes: notes.length
    });
  };

  const handleFormClose = () => {
    setIsAdding(false);
    trackEvent(Events.UI_MODAL_CLOSED, {
      modalType: 'note-form',
      formDuration: Date.now() - formOpenTime.current,
      hadContent: newNote.length > 0
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    createNote.mutate(newNote.trim(), {
      onSuccess: () => {
        setNewNote("");
        setIsAdding(false);
      },
    });
  };

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100">
        <CardTitle className="font-semibold">Quick Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-4 mb-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Write a quick note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="flex-1 border-none shadow-none bg-transparent focus:ring-0 focus:outline-none"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleFormClose}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full font-medium"
                    disabled={!newNote.trim()}
                  >
                    Add Note
                  </Button>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <AnimatePresence>
            {notes.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors group"
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-gray-700">{note.content}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {format(new Date(note.timestamp), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => deleteNote.mutate(note.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {!isAdding && (
          <Button
            variant="outline"
            size="lg"
            className="w-full mt-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-none font-medium"
            onClick={handleFormOpen}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Note
          </Button>
        )}
      </CardContent>
    </Card>
  );
}