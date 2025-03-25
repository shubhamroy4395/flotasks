import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { GratitudeEntry } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { Events, trackEvent } from "@/lib/amplitude";

interface EntryLine {
  id: number;
  content: string;
  timestamp: Date;
}

export function GratitudeSection() {
  const [entries, setEntries] = useState<EntryLine[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Query for gratitude entries with caching
  const { data: savedEntries = [] } = useQuery<GratitudeEntry[]>({
    queryKey: ["/api/gratitude"],
    staleTime: 30000,
    gcTime: 5 * 60 * 1000
  });

  // Initialize entries with saved data and empty lines
  useEffect(() => {
    const savedLines = savedEntries.map(entry => ({
      id: entry.id,
      content: entry.content,
      timestamp: new Date(entry.timestamp)
    }));

    const emptyLines = Array(3).fill(null).map((_, i) => ({
      id: Date.now() + i,
      content: "",
      timestamp: new Date()
    }));

    setEntries([...savedLines, ...emptyLines]);
  }, [savedEntries]);


  // Create entry mutation with optimistic updates
  const createEntry = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/gratitude", { content });
      return response;
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ["/api/gratitude"] });
      const previousEntries = queryClient.getQueryData<GratitudeEntry[]>(["/api/gratitude"]);

      const optimisticEntry = {
        id: Date.now(),
        content,
        timestamp: new Date().toISOString()
      };

      queryClient.setQueryData<GratitudeEntry[]>(["/api/gratitude"], old => [
        ...(old || []),
        optimisticEntry
      ]);

      return { previousEntries };
    },
    onError: (err, variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(["/api/gratitude"], context.previousEntries);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gratitude"] });
    }
  });

  // Delete entry mutation with optimistic updates
  const deleteEntry = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/gratitude/${id}`);
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/gratitude"] });
      const previousEntries = queryClient.getQueryData<GratitudeEntry[]>(["/api/gratitude"]);

      setEntries(prev => prev.filter(entry => entry.id !== deletedId));

      queryClient.setQueryData<GratitudeEntry[]>(["/api/gratitude"], old => 
        old?.filter(entry => entry.id !== deletedId) || []
      );

      return { previousEntries };
    },
    onError: (err, variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(["/api/gratitude"], context.previousEntries);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gratitude"] });
    }
  });

  const handleContentChange = (index: number, content: string) => {
    setEntries(prev => 
      prev.map((entry, i) => 
        i === index 
          ? { ...entry, content }
          : entry
      )
    );
  };

  const handleBlur = (index: number) => {
    const entry = entries[index];
    if (entry.content.trim()) {
      createEntry.mutate(entry.content.trim());
    }
    setActiveIndex(null);
  };

  const addMoreEntries = () => {
    setEntries(prev => [
      ...prev,
      ...Array(3).fill(null).map((_, i) => ({
        id: Date.now() + i,
        content: "",
        timestamp: new Date()
      }))
    ]);
  };

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100">
        <CardTitle className="font-semibold">Gratitude Journal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <AnimatePresence mode="sync">
            {entries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-center gap-4 py-3 border-b border-dashed border-gray-200 relative"
                layout
              >
                <span className="text-sm text-gray-400 w-6 font-mono">
                  {String(index + 1).padStart(2, '0')}
                </span>

                {activeIndex === index ? (
                  <Input
                    autoFocus
                    value={entry.content}
                    onChange={(e) => handleContentChange(index, e.target.value)}
                    onBlur={() => handleBlur(index)}
                    className="flex-1 border-none shadow-none bg-transparent focus:ring-0 focus:outline-none"
                    placeholder="I am grateful for..."
                  />
                ) : (
                  <div 
                    className="flex-1 cursor-text py-2"
                    onClick={() => setActiveIndex(index)}
                  >
                    <span className="text-gray-700">
                      {entry.content || "Click to add entry..."}
                    </span>
                  </div>
                )}

                {entry.content && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => deleteEntry.mutate(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4"
          onClick={addMoreEntries}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add More Entries
        </Button>
      </CardContent>
    </Card>
  );
}