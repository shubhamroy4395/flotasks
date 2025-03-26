import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { GratitudeEntry } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2 } from "lucide-react";
import { trackEvent, Events } from "@/lib/amplitude";

export function GratitudeSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [newEntry, setNewEntry] = useState("");
  const queryClient = useQueryClient();

  // Track section opening
  useEffect(() => {
    trackEvent(Events.GRATITUDE_SECTION_OPEN, {
      componentName: 'GratitudeSection',
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      isWeekend: [0, 6].includes(new Date().getDay())
    });
  }, []);

  const { data: entries } = useQuery<GratitudeEntry[]>({
    queryKey: ["/api/gratitude"],
  });

  const createEntry = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", "/api/gratitude", { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gratitude"] });
      setNewEntry("");
      setIsOpen(false);

      // Track gratitude entry creation
      trackEvent(Events.GRATITUDE_ADDED, {
        contentLength: newEntry.length,
        wordCount: newEntry.split(/\s+/).length,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        isWeekend: [0, 6].includes(new Date().getDay()),
        totalEntries: (entries?.length || 0) + 1,
        formOpenDuration: Date.now() - formOpenTime
      });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/gratitude/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/gratitude"] });

      // Track gratitude entry deletion
      const deletedEntry = entries?.find(entry => entry.id === id);
      trackEvent(Events.GRATITUDE_DELETED, {
        entryAge: deletedEntry ? Date.now() - new Date(deletedEntry.timestamp).getTime() : null,
        remainingEntries: (entries?.length || 1) - 1,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay()
      });
    },
  });

  // Track form open time for duration calculation
  const [formOpenTime, setFormOpenTime] = useState(Date.now());

  const handleFormOpen = () => {
    setIsOpen(true);
    setFormOpenTime(Date.now());
    trackEvent('Gratitude Form Opened', {
      timeOfDay: new Date().getHours(),
      existingEntries: entries?.length || 0
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.trim()) return;
    createEntry.mutate(newEntry);
  };

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100">
        <CardTitle className="font-semibold">Gratitude Journal</CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-4 mb-4 shadow-sm hover:shadow-md transition-all duration-300">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="I am grateful for..."
                      value={newEntry}
                      onChange={(e) => setNewEntry(e.target.value)}
                      className="flex-1 border-none shadow-none bg-transparent focus:ring-0 focus:outline-none"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button type="submit" className="w-full font-medium">Add Entry</Button>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <AnimatePresence>
            {entries?.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 transition-colors group"
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-gray-700 font-medium">{entry.content}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => deleteEntry.mutate(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
      <CardFooter className="pt-2 pb-4">
        {!isOpen && (
          <Button
            variant="outline"
            size="lg"
            className="w-full bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-none font-medium"
            onClick={handleFormOpen}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Gratitude Entry
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}