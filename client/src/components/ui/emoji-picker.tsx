import React, { useState } from 'react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { SmilePlus } from 'lucide-react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  selected?: string;
}

export function EmojiPicker({ onSelect, selected = '❤️' }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const emojis = [
    '❤️', '🙏', '✨', '😊', '🌟', '🌈', '🌞', '🌱',
    '🍀', '🌺', '🌸', '🌼', '🌻', '🦋', '🐝', '🐞',
    '🌎', '🌍', '🌏', '☀️', '🌙', '⭐', '🌠', '🌄',
    '🏞️', '🌊', '🔥', '💯', '💪', '👏', '🙌', '👍'
  ];

  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
        >
          {selected ? (
            <span className="text-lg">{selected}</span>
          ) : (
            <SmilePlus className="h-4 w-4 text-gray-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="grid grid-cols-8 gap-1">
          {emojis.map((emoji, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
              onClick={() => handleEmojiSelect(emoji)}
            >
              <span className="text-lg">{emoji}</span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}