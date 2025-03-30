import { useState } from "react";
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
  const [dimensions, setDimensions] = useState({ width: defaultWidth, height: defaultHeight });
  
  const handleResize = (width: number, height: number) => {
    setDimensions({ width, height });
  };
  
  // Create a unique storage key based on the title to remember dimensions
  const storageKey = `task-list-${title.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <ResizableCard
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
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
  );
}