import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { GratitudeEntry } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2 } from "lucide-react";
import { Events } from "@/lib/amplitude";
import { useAutoSave } from "@/hooks/use-auto-save";

export function GratitudeSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [newEntry, setNewEntry] = useState("");
  const queryClient = useQueryClient();

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
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/gratitude/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gratitude"] });
    },
  });

  const { handleChange, handleBlur } = useAutoSave({
    onSave: async (content) => {
      await createEntry.mutateAsync(content);
    },
    trackingEvent: Events.Gratitude.Added,
    debounceMs: 800
  });

  const handleInputChange = (value: string) => {
    setNewEntry(value);
    handleChange(value, {
      existingEntries: entries?.length || 0
    });
  };

  const handleFormOpen = () => {
    setIsOpen(true);
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
              <Card className="p-4 mb-4">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="I am grateful for..."
                    value={newEntry}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onBlur={() => {
                      handleBlur(newEntry, {
                        existingEntries: entries?.length || 0
                      });
                      if (!newEntry.trim()) {
                        setIsOpen(false);
                      }
                    }}
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