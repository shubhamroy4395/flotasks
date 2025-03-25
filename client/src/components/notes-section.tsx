import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bookmark, 
  CheckCircle2, 
  FileText, 
  Lightbulb, 
  PenLine, 
  Plus, 
  Tag, 
  Trash2 
} from "lucide-react";
import type { Note } from "@shared/schema";
import { trackEvent } from "@/lib/amplitude";
import { format } from "date-fns";
import { useLineItems } from "@/hooks/use-line-items";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export function NotesSection() {
  const startTimeRef = useRef(performance.now());
  const { isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const categories = [
    { id: "all", name: "All Notes", icon: <FileText className="h-3.5 w-3.5" /> },
    { id: "idea", name: "Ideas", icon: <Lightbulb className="h-3.5 w-3.5" /> },
    { id: "task", name: "Tasks", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    { id: "bookmark", name: "Bookmarks", icon: <Bookmark className="h-3.5 w-3.5" /> }
  ];

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

  // Get category tag from content (simple parsing)
  const getCategoryFromContent = (content: string): string => {
    const categoryMatches = content.match(/#(\w+)/);
    return categoryMatches ? categoryMatches[1].toLowerCase() : "other";
  };

  // Clean content by removing category tags
  const cleanContent = (content: string): string => {
    return content.replace(/#\w+/g, "").trim();
  };

  // Filter entries by category if needed
  const filteredEntries = selectedCategory === "all"
    ? entries
    : entries.filter(entry => 
        entry.content && 
        getCategoryFromContent(entry.content) === selectedCategory
      );

  // Get a placeholder based on selected category
  const getPlaceholderForCategory = (): string => {
    switch(selectedCategory) {
      case "idea":
        return "Write down your idea... add #idea tag";
      case "task":
        return "Note a task to remember... add #task tag";
      case "bookmark":
        return "Save a link or reference... add #bookmark tag";
      default:
        return "Write a quick note... use #tag to categorize";
    }
  };

  // Get style for note based on its category
  const getNoteStyles = (category: string) => {
    const styles = {
      idea: {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-700",
        badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
        icon: <Lightbulb className="h-4 w-4 text-yellow-500" />
      },
      task: {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-700",
        badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      },
      bookmark: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        badge: "bg-blue-100 text-blue-700 border-blue-200",
        icon: <Bookmark className="h-4 w-4 text-blue-500" />
      },
      other: {
        bg: "bg-gray-50",
        border: "border-gray-200",
        text: "text-gray-700",
        badge: "bg-gray-100 text-gray-700 border-gray-200",
        icon: <FileText className="h-4 w-4 text-gray-500" />
      }
    };
    
    return styles[category as keyof typeof styles] || styles.other;
  };

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
      
      <div className="pt-3 px-6 flex items-center space-x-2 overflow-x-auto scrollbar-none pb-2">
        {categories.map(category => (
          <Badge
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            className={`cursor-pointer ${
              selectedCategory === category.id 
                ? "bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border-indigo-200" 
                : "hover:bg-gray-100 border-gray-200"
            } rounded-full px-3 py-1 border flex items-center`}
            onClick={() => setSelectedCategory(category.id)}
          >
            <span className="mr-1.5">{category.icon}</span>
            {category.name}
          </Badge>
        ))}
      </div>
      
      <CardContent className="pt-4">
        {error && (
          <div className="mb-4 p-2 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-3 mt-2">
          <AnimatePresence mode="sync">
            {filteredEntries.map((entry, index) => {
              const category = entry.content ? getCategoryFromContent(entry.content) : "other";
              const styles = getNoteStyles(category);
              
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="group relative"
                  layout
                >
                  <div 
                    className={`rounded-lg p-3 border cursor-pointer transition-all duration-300 
                      ${entry.isSaved ? `${styles.bg} ${styles.border}` : 'bg-white border-gray-200 hover:border-gray-300'}
                      ${isLoading ? 'opacity-60' : ''} 
                      ${activeEntry?.index === index ? 'shadow-md' : 'hover:shadow-sm'}`}
                    onClick={(e) => handleLineClick(entries.indexOf(entry), e)}
                  >
                    {activeEntry?.index === entries.indexOf(entry) ? (
                      <motion.div
                        className="flex flex-col gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        layout
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-medium text-gray-500">
                            {entry.isSaved ? 'Editing note' : 'New note'}
                          </div>
                          {selectedCategory !== "all" && (
                            <Badge variant="outline" className={`text-xs px-2 ${styles.badge}`}>
                              #{selectedCategory}
                            </Badge>
                          )}
                        </div>
                        
                        <Input
                          autoFocus
                          value={activeEntry.content}
                          onChange={(e) => handleInputChange(e.target.value)}
                          onBlur={handleBlur}
                          className="border border-gray-200 bg-white font-medium text-gray-700 placeholder:text-gray-400 rounded-md"
                          placeholder={getPlaceholderForCategory()}
                          disabled={isLoading}
                        />
                        
                        {activeEntry.isDirty && activeEntry.content.trim().length > 0 && (
                          <div className="flex items-center mt-1 text-xs text-indigo-600">
                            <PenLine className="h-3 w-3 mr-1" />
                            Saving automatically when you click away
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div layout>
                        {entry.isSaved ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {styles.icon}
                                <Badge variant="outline" className={`text-xs px-2 ${styles.badge}`}>
                                  #{category}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {format(new Date(entry.timestamp), 'MMM d, h:mm a')}
                                </span>
                              </div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
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
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Delete note</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <p className={`${styles.text} font-medium text-sm`}>
                              {cleanContent(entry.content)}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-16 text-gray-400 flex-col gap-1">
                            <Tag className="h-4 w-4 mb-1" />
                            <span className="text-center text-sm italic">Click to add a note...</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {filteredEntries.length === 0 && selectedCategory !== "all" && (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <FileText className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notes in this category</p>
              <Button 
                variant="link" 
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className="mt-2 text-indigo-500"
              >
                Show all notes
              </Button>
            </div>
          )}
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