import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Bell, Trash2 } from "lucide-react";
import { format, addMinutes, addHours } from "date-fns";

const TIME_OPTIONS = [
  { label: "5 minutes", value: 5, unit: "minutes" },
  { label: "15 minutes", value: 15, unit: "minutes" },
  { label: "30 minutes", value: 30, unit: "minutes" },
  { label: "1 hour", value: 1, unit: "hours" },
  { label: "2 hours", value: 2, unit: "hours" },
  { label: "4 hours", value: 4, unit: "hours" }
];

export function ReminderSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [newReminder, setNewReminder] = useState("");
  const [selectedTime, setSelectedTime] = useState<typeof TIME_OPTIONS[0] | null>(null);
  const [reminders, setReminders] = useState<{ id: number; content: string; time: Date }[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.trim() || !selectedTime) return;

    const dueTime = selectedTime.unit === "minutes" 
      ? addMinutes(new Date(), selectedTime.value)
      : addHours(new Date(), selectedTime.value);

    setReminders(prev => [...prev, {
      id: Date.now(),
      content: newReminder,
      time: dueTime
    }]);
    setNewReminder("");
    setSelectedTime(null);
    setIsOpen(false);
  };

  const deleteReminder = (id: number) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  return (
    <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100">
        <CardTitle className="font-semibold">Reminders</CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence>
          {isOpen && (
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
                  <select
                    value={selectedTime?.label || ""}
                    onChange={(e) => {
                      const option = TIME_OPTIONS.find(opt => opt.label === e.target.value);
                      setSelectedTime(option || null);
                    }}
                    className="w-full rounded-md border px-3 py-2 text-sm bg-transparent"
                  >
                    <option value="">Select time</option>
                    {TIME_OPTIONS.map(option => (
                      <option key={option.label} value={option.label}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Button 
                    type="submit" 
                    className="w-full font-medium"
                    disabled={!selectedTime}
                  >
                    Set Reminder
                  </Button>
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
                className="p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100 transition-colors group"
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-gray-700 font-medium">{reminder.content}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Bell className="h-4 w-4" />
                      <span>Due {format(reminder.time, 'h:mm a')}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => deleteReminder(reminder.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
      <CardFooter className="pt-2 pb-4">
        {!isOpen && (
          <Button
            variant="outline"
            size="lg"
            className="w-full bg-gradient-to-r from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100 border-none font-medium"
            onClick={() => setIsOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Reminder
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}