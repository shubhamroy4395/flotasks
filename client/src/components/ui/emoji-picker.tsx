import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "./button";
import { Card } from "./card";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { useTheme } from "@/contexts/ThemeContext";

// Default emoji options if not provided
const DEFAULT_EMOJI_OPTIONS = [
  { emoji: "😊", label: "Happy", color: "bg-green-50", darkColor: "bg-green-900/30" },
  { emoji: "🥳", label: "Excited", color: "bg-purple-50", darkColor: "bg-purple-900/30" },
  { emoji: "😐", label: "Neutral", color: "bg-gray-50", darkColor: "bg-gray-800/40" },
  { emoji: "😴", label: "Tired", color: "bg-blue-50", darkColor: "bg-blue-900/30" },
  { emoji: "😤", label: "Frustrated", color: "bg-red-50", darkColor: "bg-red-900/30" },
  { emoji: "😢", label: "Sad", color: "bg-indigo-50", darkColor: "bg-indigo-900/30" },
  { emoji: "😌", label: "Peaceful", color: "bg-yellow-50", darkColor: "bg-yellow-900/30" },
  { emoji: "😰", label: "Anxious", color: "bg-orange-50", darkColor: "bg-orange-900/30" },
  { emoji: "🤗", label: "Grateful", color: "bg-teal-50", darkColor: "bg-teal-900/30" },
  { emoji: "🤔", label: "Thoughtful", color: "bg-blue-50", darkColor: "bg-cyan-900/30" }
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  selected?: string;
  moods?: string[];
}

export function EmojiPicker({ onSelect, selected, moods }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark' || theme === 'winter';
  
  // Ensure component is mounted before rendering popover to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Filter emoji options based on provided moods, if any
  const emojiOptions = moods 
    ? DEFAULT_EMOJI_OPTIONS.filter(option => moods.includes(option.emoji))
    : DEFAULT_EMOJI_OPTIONS;
  
  const selectedMood = emojiOptions.find(option => option.emoji === selected);

  // Enhanced click handler with error handling
  const handleEmojiSelect = (emoji: string) => {
    try {
      // Close popover first to avoid any race conditions
      setIsOpen(false);
      
      // Wrap in setTimeout to ensure UI updates before callback
      setTimeout(() => {
        onSelect(emoji);
        
        // Log success for debugging in production
        if (import.meta.env.PROD) {
          console.log(`Emoji selected: ${emoji}`);
          
          // Add analytics tracking if available
          if (window.amplitude) {
            window.amplitude.track('Emoji_Selected', {
              emoji,
              timestamp: new Date().toISOString()
            });
          }
        }
      }, 0);
    } catch (error) {
      console.error('Error selecting emoji:', error);
      // Fallback - attempt direct selection without UI updates
      onSelect(emoji);
    }
  };

  // Early return if not mounted to avoid hydration issues
  if (!mounted) {
    return (
      <Button
        variant="outline"
        className="h-16 w-16 p-0 text-3xl"
      >
        {selected || "😊"}
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`h-16 w-16 p-0 text-3xl ${isDarkTheme ? (selectedMood?.darkColor || '') : (selectedMood?.color || '')}`}
          onClick={() => setIsOpen(true)} // Explicit click handler for better mobile support
          aria-label="Select mood"
        >
          {selected || "😊"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-2 z-50">
        <Card className="grid grid-cols-3 gap-2 p-2">
          {emojiOptions.map(({ emoji, label, color, darkColor }) => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center justify-center p-3 rounded-lg ${isDarkTheme ? darkColor : color} hover:opacity-80 transition-all focus:ring-2 focus:ring-primary`}
              onClick={() => handleEmojiSelect(emoji)}
              aria-label={`Select ${label} mood`}
              type="button" // Explicit button type
            >
              <span className="text-2xl mb-1">{emoji}</span>
              <span className={`text-xs ${isDarkTheme ? 'text-gray-200' : 'text-gray-600'} font-medium`}>{label}</span>
            </motion.button>
          ))}
        </Card>
      </PopoverContent>
    </Popover>
  );
}