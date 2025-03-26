import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "./input";
import { Button } from "./button";
import { Card } from "./card";
import { Plus, X } from "lucide-react";

interface TaskInputProps {
  onSubmit: (task: { content: string; priority: number; category: string }) => void;
}

export function TaskInput({ onSubmit }: TaskInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState(0);
  const [category, setCategory] = useState("todo");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    onSubmit({ content, priority, category });
    setContent("");
    setPriority(0);
    setCategory("todo");
    setIsOpen(false);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <AnimatePresence>
        {!isOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center"
          >
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setIsOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Task
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="What needs to be done?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="flex-1"
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
                
                <div className="flex gap-2">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="rounded-md border px-3 py-2 text-sm"
                  >
                    <option value={0}>No Priority</option>
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                  </select>
                  
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="todo">To-Do</option>
                    <option value="goal">Goal</option>
                    <option value="reminder">Reminder</option>
                    <option value="chore">Chore</option>
                    <option value="custom">Custom</option>
                  </select>
                  
                  <Button type="submit">Add Task</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
