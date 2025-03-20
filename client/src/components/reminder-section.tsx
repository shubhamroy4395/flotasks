import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Bell } from "lucide-react";

export function ReminderSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [newReminder, setNewReminder] = useState("");
  const [reminders, setReminders] = useState<{ id: number; content: string; time: string }[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.trim()) return;
    
    setReminders(prev => [...prev, {
      id: Date.now(),
      content: newReminder,
      time: new Date().toLocaleTimeString()
    }]);
    setNewReminder("");
    setIsOpen(false);
  };

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100">
        <CardTitle className="font-semibold">Reminders</CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence>
          {!isOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center mb-4"
            >
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setIsOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Reminder
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-4 mb-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="I need to..."
                      value={newReminder}
                      onChange={(e) => setNewReminder(e.target.value)}
                      className="flex-1 border-none shadow-none bg-transparent focus:ring-0 focus:outline-none"
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
                  <Button type="submit" className="w-full font-medium">Set Reminder</Button>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <AnimatePresence>
            {reminders.map((reminder, index) => (
              <motion.div
                key={reminder.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100 transition-colors"
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-gray-700 font-medium">{reminder.content}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Bell className="h-4 w-4" />
                    <span>{reminder.time}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
