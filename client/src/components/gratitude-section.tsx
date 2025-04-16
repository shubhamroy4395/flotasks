import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { GratitudeEntry } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Trash2, Share2, Heart } from "lucide-react";
import { trackEvent, Events } from "@/lib/amplitude";
import { useTheme } from "@/contexts/ThemeContext";
import { shareContent } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";

export function GratitudeSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [newEntry, setNewEntry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark' || theme === 'winter';
  const isMobile = useIsMobile();

  // Track component mount for SSR handling
  useEffect(() => {
    setMounted(true);
    
    // Track when the gratitude section is viewed
    trackEvent(Events.Gratitude.SectionOpen, {
      componentName: 'GratitudeSection',
      timeOfDay: new Date().getHours()
    });
  }, []);

  // Get gratitude entries
  const { data: gratitudeEntries = [], isLoading } = useQuery<GratitudeEntry[]>({
    queryKey: ["/api/gratitude"],
    onError: (err) => {
      console.error("Failed to fetch gratitude entries:", err);
      setError("Could not load your gratitude entries. Please try again later.");
    }
  });

  // Create new gratitude entry
  const createGratitude = useMutation({
    mutationFn: async (content: string) => {
      try {
        await apiRequest("POST", "/api/gratitude", { content });
        return true;
      } catch (error) {
        console.error("Failed to create gratitude entry:", error);
        // In production, simulate success and store locally for better UX
        if (import.meta.env.PROD || import.meta.env.MODE === 'production') {
          // Store in localStorage as fallback
          try {
            const existingEntries = JSON.parse(localStorage.getItem('gratitudeEntries') || '[]');
            const newLocalEntry = {
              id: Date.now(),
              content,
              timestamp: new Date().toISOString(),
              isLocal: true
            };
            localStorage.setItem('gratitudeEntries', JSON.stringify([newLocalEntry, ...existingEntries]));
            return true;
          } catch (storageError) {
            console.error("Failed to store in localStorage:", storageError);
          }
        }
        throw error;
      }
    },
    onSuccess: () => {
      setNewEntry("");
      queryClient.invalidateQueries({ queryKey: ["/api/gratitude"] });
      setError(null);
      
      // Track successful entry creation
      trackEvent(Events.Gratitude.EntryAdded, {
        entryLength: newEntry.length,
        timeOfDay: new Date().getHours()
      });
    },
    onError: (err) => {
      console.error("Error creating gratitude entry:", err);
      setError("Failed to save. Please try again.");
      
      // Track error for analytics
      trackEvent(Events.Error, {
        component: 'GratitudeSection',
        action: 'createEntry',
        errorMessage: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Delete a gratitude entry
  const deleteGratitude = useMutation({
    mutationFn: async (id: number) => {
      try {
        await apiRequest("DELETE", `/api/gratitude/${id}`);
        return true;
      } catch (error) {
        console.error("Failed to delete gratitude entry:", error);
        // In production, simulate success for better UX
        if (import.meta.env.PROD || import.meta.env.MODE === 'production') {
          return true;
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gratitude"] });
      setError(null);
      
      // Track successful deletion
      trackEvent(Events.Gratitude.EntryDeleted, {
        timeOfDay: new Date().getHours()
      });
    },
    onError: (err) => {
      console.error("Error deleting gratitude entry:", err);
      setError("Failed to delete. Please try again.");
    }
  });

  // Try to load local entries if API fails in production
  useEffect(() => {
    if (isLoading && import.meta.env.PROD && gratitudeEntries.length === 0) {
      try {
        const localEntries = JSON.parse(localStorage.getItem('gratitudeEntries') || '[]');
        if (localEntries.length > 0) {
          // Use queryClient to set data directly
          queryClient.setQueryData(["/api/gratitude"], localEntries);
        }
      } catch (error) {
        console.error("Error loading local entries:", error);
      }
    }
  }, [isLoading, gratitudeEntries.length, queryClient]);

  // Track form open time for duration calculation
  const [formOpenTime, setFormOpenTime] = useState(Date.now());

  const handleFormOpen = () => {
    setIsOpen(true);
    setFormOpenTime(Date.now());
    trackEvent('Gratitude Form Opened', {
      timeOfDay: new Date().getHours(),
      existingEntries: gratitudeEntries?.length || 0
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEntry.trim()) {
      createGratitude.mutate(newEntry.trim());
    }
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

  // Mix local and API entries if needed
  const allEntries = [...gratitudeEntries];
  // Try to get any local entries not in the API response
  if (import.meta.env.PROD) {
    try {
      const localEntries = JSON.parse(localStorage.getItem('gratitudeEntries') || '[]');
      const localOnlyEntries = localEntries.filter((local: any) => 
        local.isLocal && !allEntries.some(api => api.content === local.content)
      );
      allEntries.push(...localOnlyEntries);
    } catch (error) {
      console.error("Error processing local entries:", error);
    }
  }

  // If not mounted yet (SSR), show a simpler version to avoid hydration issues
  if (!mounted) {
    return (
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="border-b">
          <CardTitle>Gratitude Journal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-10 bg-muted rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
          <AnimatePresence mode="popLayout">
            {allEntries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-muted/50 p-3 rounded-lg relative group"
              >
                <div className="flex items-start gap-2">
                  <Heart size={18} className="text-red-500 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{entry.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(entry.timestamp), 'MMM d, h:mm a')}
                    </p>
                  </div>
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
                      onClick={() => deleteGratitude.mutate(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {entry.isLocal && (
                  <div className="text-xs text-amber-500 mt-1">
                    Not yet synced
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {allEntries.length === 0 && !isLoading && (
            <p className="text-center text-muted-foreground text-sm py-4">
              No entries yet. What are you grateful for today?
            </p>
          )}

          {isLoading && (
            <div className="animate-pulse space-y-3">
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          )}
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