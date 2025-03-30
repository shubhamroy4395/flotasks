import { useState, useEffect, useRef } from "react";
import { Task } from "@shared/schema";
import { TaskList } from "./task-list";
import { ResizableCard } from "./ui/resizable-card";

interface ResizableTaskListProps {
  title: string;
  tasks: Task[];
  onSave: (task: { content: string; priority: number; difficulty: string; category: string }) => void;
  onDelete?: (id: number) => void;
  onUpdate?: (id: number, updates: Partial<Task>) => void;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

export function ResizableTaskList({
  title,
  tasks,
  onSave,
  onDelete,
  onUpdate,
  defaultWidth = 500,
  defaultHeight = 400,
  minWidth = 300,
  minHeight = 200
}: ResizableTaskListProps) {
  // Create a unique storage key based on the title to remember dimensions
  const storageKey = `task-list-${title.toLowerCase().replace(/\s+/g, '-')}`;
  
  // Get initial dimensions from localStorage or use defaults
  const getInitialDimensions = () => {
    if (typeof window === 'undefined') return { width: defaultWidth, height: defaultHeight };
    
    try {
      const saved = localStorage.getItem(`flo-resizable-${storageKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          width: parsed.width || defaultWidth,
          height: parsed.height || defaultHeight
        };
      }
    } catch (e) {
      console.error("Error reading saved dimensions:", e);
    }
    
    return { width: defaultWidth, height: defaultHeight };
  };
  
  const [dimensions, setDimensions] = useState(getInitialDimensions);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Ensure dimensions don't exceed container width on mount and resize
  useEffect(() => {
    const updateMaxWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        if (dimensions.width > containerWidth) {
          setDimensions(prev => ({ ...prev, width: containerWidth - 10 }));
        }
      }
    };
    
    // Initial check
    updateMaxWidth();
    
    // Add resize listener
    window.addEventListener('resize', updateMaxWidth);
    return () => window.removeEventListener('resize', updateMaxWidth);
  }, []);
  
  const handleResize = (width: number, height: number) => {
    setDimensions({ width, height });
  };

  return (
    <div ref={containerRef} className="w-full">
      <ResizableCard
        defaultWidth={dimensions.width}
        defaultHeight={dimensions.height}
        minWidth={minWidth}
        minHeight={minHeight}
        onResize={handleResize}
        storageKey={storageKey}
        className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-t-4 border-t-primary transform-gpu card-enhanced"
      >
        <TaskList
          title={title}
          tasks={tasks}
          onSave={onSave}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      </ResizableCard>
    </div>
  );
}