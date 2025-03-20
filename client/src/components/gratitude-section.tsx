import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { GratitudeEntry } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

export function GratitudeSection() {
  const [isAdding, setIsAdding] = useState(false);
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
      setIsAdding(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.trim()) return;
    createEntry.mutate(newEntry);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gratitude</CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {!isAdding ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-4"
            >
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsAdding(true)}
              >
                Add Gratitude Entry
              </Button>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onSubmit={handleSubmit}
              className="flex gap-2 mb-4"
            >
              <Input
                autoFocus
                placeholder="What are you grateful for today?"
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                className="flex-1 border-none shadow-none bg-transparent focus:ring-0"
              />
              <Button type="submit" variant="ghost" className="text-green-600 hover:bg-green-50">
                Save
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="text-gray-500 hover:bg-gray-50"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </Button>
            </motion.form>
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
                className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                transition={{ delay: index * 0.1 }}
              >
                {entry.content}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}