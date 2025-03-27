import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Focus } from "lucide-react";
import { StudyWithMe } from "./SimpleFocusMode";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function StudyModeButton() {
  const [studyModalOpen, setStudyModalOpen] = useState(false);
  const { theme } = useTheme();
  
  return (
    <>
      <Button
        className={cn(
          "fixed bottom-4 right-4 rounded-full shadow-lg z-50 flex items-center gap-2",
          theme === 'retro' 
            ? "border-2 border-solid border-[#DFDFDF] border-r-[#808080] border-b-[#808080] bg-[#D4D0C8] hover:bg-[#E0E0E0]" 
            : "bg-primary hover:bg-primary/90"
        )}
        onClick={() => setStudyModalOpen(true)}
      >
        <Focus className="h-5 w-5" />
        <span>Focus Mode</span>
      </Button>
      
      <StudyWithMe 
        open={studyModalOpen} 
        onOpenChange={setStudyModalOpen} 
      />
    </>
  );
}