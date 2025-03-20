import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./button";
import { Card } from "./card";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const EMOJI_OPTIONS = [
  { emoji: "😊", label: "Happy", color: "bg-green-50" },
  { emoji: "🥳", label: "Excited", color: "bg-purple-50" },
  { emoji: "😐", label: "Neutral", color: "bg-gray-50" },
  { emoji: "😴", label: "Tired", color: "bg-blue-50" },
  { emoji: "😤", label: "Frustrated", color: "bg-red-50" },
  { emoji: "😢", label: "Sad", color: "bg-indigo-50" },
  { emoji: "😌", label: "Peaceful", color: "bg-yellow-50" }
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  selected?: string;
}

export function EmojiPicker({ onSelect, selected }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedMood = EMOJI_OPTIONS.find(option => option.emoji === selected);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`h-16 w-16 p-0 text-3xl ${selectedMood?.color || ''}`}
        >
          {selected || "😊"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-2">
        <Card className="grid grid-cols-3 gap-2 p-2">
          {EMOJI_OPTIONS.map(({ emoji, label, color }) => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center justify-center p-3 rounded-lg ${color} hover:opacity-80 transition-all`}
              onClick={() => {
                onSelect(emoji);
                setIsOpen(false);
              }}
            >
              <span className="text-2xl mb-1">{emoji}</span>
              <span className="text-xs text-gray-600 font-medium">{label}</span>
            </motion.button>
          ))}
        </Card>
      </PopoverContent>
    </Popover>
  );
}