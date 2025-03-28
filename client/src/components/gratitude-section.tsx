import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { GratitudeEntry } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, Share2 } from "lucide-react";
import { trackEvent, Events } from "@/lib/amplitude";
import { useTheme } from "@/contexts/ThemeContext";
import { shareContent } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

export function GratitudeSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [newEntry, setNewEntry] = useState("");
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark' || theme === 'winter';
  const isMobile = useIsMobile();

  // Track section opening
  useEffect(() => {
    trackEvent(Events.Gratitude.SectionOpen, {
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
      trackEvent(Events.Gratitude.Added, {
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
      trackEvent(Events.Gratitude.Deleted, {
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

  const handleShare = async (content: string) => {
    // Track share attempt
    trackEvent('Gratitude Entry Shared', {
      contentLength: content.length,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      platform: isMobile ? 'mobile' : 'desktop'
    });

    // Share the content
    const success = await shareContent({ 
      title: 'Gratitude Note', 
      text: content
    });

    // Track share completion
    if (success) {
      trackEvent('Gratitude Share Success', {
        contentLength: content.length,
        platform: isMobile ? 'mobile' : 'desktop'
      });
    }
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
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
              <Card className={`p-4 mb-4 shadow-sm hover:shadow-md transition-shadow duration-300 ${
                isDarkTheme ? 'bg-slate-800/50' : ''
              }`}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="I am grateful for..."
                      value={newEntry}
                      onChange={(e) => setNewEntry(e.target.value)}
                      className={`flex-1 border-none shadow-none bg-transparent focus:ring-0 focus:outline-none ${
                        isDarkTheme ? 'text-gray-200 placeholder:text-gray-400' : ''
                      }`}
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
                  <Button 
                    type="submit" 
                    className={`w-full font-medium ${isDarkTheme ? 'bg-slate-700 hover:bg-slate-600' : ''}`}
                  >
                    Add Entry
                  </Button>
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
                className={`p-4 rounded-lg bg-gradient-to-r ${
                  isDarkTheme 
                    ? 'from-blue-900/30 to-purple-900/30 hover:from-blue-900/40 hover:to-purple-900/40' 
                    : 'from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100'
                } transition-colors group`}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <p className={`font-medium ${isDarkTheme ? 'text-gray-200' : 'text-gray-700'}`}>
                    {entry.content}
                  </p>
                  <div className="flex gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                              isDarkTheme 
                                ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-950/30' 
                                : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'
                            }`}
                            onClick={() => handleShare(entry.content)}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Share this gratitude</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                        isDarkTheme 
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-950/30' 
                          : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                      }`}
                      onClick={() => deleteEntry.mutate(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
            className={`w-full border-none font-medium ${
              isDarkTheme
                ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 hover:from-blue-900/40 hover:to-purple-900/40 text-gray-200'
                : 'bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100'
            }`}
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