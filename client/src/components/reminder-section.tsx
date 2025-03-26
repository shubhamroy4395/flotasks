import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Bell, Trash2 } from "lucide-react";
import { format, addMinutes, addHours, isAfter } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { trackEvent, Events } from "@/lib/amplitude";

const TIME_OPTIONS = [
  { label: "5 minutes", value: 5, unit: "minutes" },
  { label: "15 minutes", value: 15, unit: "minutes" },
  { label: "30 minutes", value: 30, unit: "minutes" },
  { label: "1 hour", value: 1, unit: "hours" },
  { label: "2 hours", value: 2, unit: "hours" },
  { label: "4 hours", value: 4, unit: "hours" }
];

// Create notification sound
const createNotificationSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

export function ReminderSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [newReminder, setNewReminder] = useState("");
  const [selectedTime, setSelectedTime] = useState<typeof TIME_OPTIONS[0] | null>(null);
  const [reminders, setReminders] = useState<{ id: number; content: string; time: Date }[]>([]);
  const { toast } = useToast();
  const checkInterval = useRef<NodeJS.Timeout>();
  const formOpenTime = useRef(Date.now());

  // Track section open
  useEffect(() => {
    trackEvent(Events.REMINDER_SECTION_OPEN, {
      componentName: 'ReminderSection',
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      activeReminders: reminders.length
    });
  }, []);

  // Check for due reminders
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      setReminders(prev => {
        const updatedReminders = prev.filter(reminder => {
          if (isAfter(now, reminder.time)) {
            // Play notification sound
            try {
              createNotificationSound();
            } catch (error) {
              console.error('Failed to play notification sound:', error);
            }

            // Show toast notification
            toast({
              title: "Reminder!",
              description: reminder.content,
              duration: 5000,
            });

            // Track reminder completion
            trackEvent(Events.REMINDER_COMPLETED, {
              content: reminder.content,
              scheduledTime: reminder.time.toISOString(),
              actualCompletionTime: now.toISOString(),
              timeOfDay: now.getHours(),
              dayOfWeek: now.getDay()
            });

            // Remove this reminder
            return false;
          }
          return true;
        });

        return updatedReminders;
      });
    };

    // Check every 30 seconds
    checkInterval.current = setInterval(checkReminders, 30000);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [toast]);

  const handleFormOpen = () => {
    setIsOpen(true);
    formOpenTime.current = Date.now();
    trackEvent(Events.UI_MODAL_OPENED, {
      modalType: 'reminder-form',
      timeOfDay: new Date().getHours(),
      existingReminders: reminders.length
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.trim() || !selectedTime) return;

    const dueTime = selectedTime.unit === "minutes" 
      ? addMinutes(new Date(), selectedTime.value)
      : addHours(new Date(), selectedTime.value);

    const newId = Date.now();
    setReminders(prev => [...prev, {
      id: newId,
      content: newReminder,
      time: dueTime
    }]);

    // Track reminder creation
    trackEvent(Events.REMINDER_SET, {
      content: newReminder,
      timeValue: selectedTime.value,
      timeUnit: selectedTime.unit,
      dueTime: dueTime.toISOString(),
      formOpenDuration: Date.now() - formOpenTime.current,
      reminderCount: reminders.length + 1,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    });

    setNewReminder("");
    setSelectedTime(null);
    setIsOpen(false);

    // Show confirmation toast
    toast({
      title: "Reminder set!",
      description: `Will remind you at ${format(dueTime, 'h:mm a')}`,
      duration: 3000,
    });
  };

  const deleteReminder = (id: number) => {
    const reminderToDelete = reminders.find(r => r.id === id);
    setReminders(prev => prev.filter(r => r.id !== id));

    // Track reminder deletion
    if (reminderToDelete) {
      trackEvent(Events.REMINDER_DELETED, {
        content: reminderToDelete.content,
        timeUntilDue: reminderToDelete.time.getTime() - Date.now(),
        remainingReminders: reminders.length - 1,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay()
      });
    }
  };

  return (
    <Card className="bg-white shadow-card hover:shadow-bold transition-all duration-300">
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
              <Card className="p-4 mb-4 shadow-sm hover:shadow-md transition-all duration-300">
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
            onClick={handleFormOpen}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Reminder
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}