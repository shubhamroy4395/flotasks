import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./button";
import { Card } from "./card";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const EMOJI_OPTIONS = [
  { emoji: "😊", label: "Happy" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😤", label: "Frustrated" },
  { emoji: "😴", label: "Tired" },
  { emoji: "🥳", label: "Excited" },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  selected?: string;
}

export function EmojiPicker({ onSelect, selected }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-10 w-10 p-0"
        >
          {selected || "😊"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <Card className="grid grid-cols-3 gap-2 p-2">
          {EMOJI_OPTIONS.map(({ emoji, label }) => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-accent"
              onClick={() => {
                onSelect(emoji);
                setIsOpen(false);
              }}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </motion.button>
          ))}
        </Card>
      </PopoverContent>
    </Popover>
  );
}
