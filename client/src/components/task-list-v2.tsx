import React, { useState, useRef } from 'react';
import { Task } from '@shared/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskInput } from '@/components/ui/task-input';
import { Badge } from '@/components/ui/badge';
import { Trash, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/amplitude';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useTaskStore } from '@/stores/taskStore';

interface TaskListProps {
  title: string;
  category: 'today' | 'other';
}

interface TaskItemProps {
  task: Task;
  index: number;
  category: 'today' | 'other';
  parentTitle: string;
}

// Task item component extracted for better readability and maintainability
const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  index, 
  category,
  parentTitle 
}) => {
  const { deleteTask, toggleComplete } = useTaskStore();

  const handleCheckboxChange = () => {
    toggleComplete(task.id, category);
  };

  const handleDelete = () => {
    // Enhanced logging to track deletion flow
    console.log('[TASK_DELETE] Delete button clicked for:', 
      { title: parentTitle, taskId: task.id, taskIdType: typeof task.id, content: task.content });
    deleteTask(task.id, category);
  };

  const handleTogglePriority = () => {
    // This will be implemented later with the store
    console.log("Toggle priority for task:", task.id);
  };

  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg mb-2 group ${
        task.completed ? 'bg-gray-100 opacity-60' : 'bg-white'
      } hover:shadow-sm transition-all`}
      data-index={index}
    >
      <div className="flex items-center gap-3 flex-1">
        <Checkbox 
          checked={task.completed} 
          onCheckedChange={handleCheckboxChange}
          className="h-5 w-5"
        />
        <div className={`flex-1 ${task.completed ? 'line-through text-gray-500' : ''}`}>
          {task.content}
        </div>
      </div>
      
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {task.priority > 0 ? (
          <Badge variant="destructive" className="h-5 px-1.5">
            Priority
          </Badge>
        ) : null}
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={handleTogglePriority}
        >
          {task.priority === 1 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 text-destructive" 
          onClick={handleDelete}
        >
          <Trash size={16} />
        </Button>
      </div>
    </div>
  );
};

export function TaskListV2({ title, category }: TaskListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  // Get tasks from our store
  const { tasks, addTask, isLoading } = useTaskStore();
  const taskList = tasks[category] || [];

  const handleAddTask = (task: { content: string; priority: number; category: string }) => {
    trackEvent('task_created', { 
      list: title, 
      priority: task.priority,
      content_length: task.content.length
    });
    
    addTask({
      content: task.content,
      priority: task.priority,
      category: category,
      completed: false,
      eta: null,
      timestamp: new Date(),
      userId: null
    });
  };

  // Move focus to the next/previous task
  const focusTask = (direction: 'next' | 'prev') => {
    if (!listRef.current || taskList.length === 0) return;
    
    const taskElements = listRef.current.querySelectorAll<HTMLDivElement>('[data-index]');
    if (taskElements.length === 0) return;
    
    const currentIndex = selectedIndex ?? -1;
    let newIndex;
    
    if (direction === 'next') {
      newIndex = currentIndex < taskElements.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : taskElements.length - 1;
    }
    
    taskElements[newIndex].focus();
    setSelectedIndex(newIndex);
  };

  // Handle keyboard shortcuts
  useKeyboardShortcuts({
    focusNext: () => focusTask('next'),
    focusPrev: () => focusTask('prev'),
    // Additional shortcuts can be added here
  }, { enabled: true, trackingPrefix: title });

  return (
    <Card className="shadow-sm border-gray-100">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">{title}</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-8 p-0"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </Button>
        </div>
        <CardDescription>
          {isLoading ? (
            <span className="text-gray-400">Loading tasks...</span>
          ) : (
            <>{taskList.length} task{taskList.length !== 1 ? 's' : ''}</>
          )}
        </CardDescription>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pb-4">
          <div className="space-y-2" ref={listRef}>
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-md"></div>
                ))}
              </div>
            ) : (
              <>
                {taskList.map((task, index) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    index={index}
                    category={category}
                    parentTitle={title}
                  />
                ))}
                
                <TaskInput onSubmit={handleAddTask} />
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-2 text-gray-500 hover:text-primary"
                  onClick={() => {
                    handleAddTask({ 
                      content: '', 
                      priority: 0, 
                      category: category
                    });
                  }}
                >
                  <Plus size={14} className="mr-1" />
                  Add more
                </Button>
              </>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}