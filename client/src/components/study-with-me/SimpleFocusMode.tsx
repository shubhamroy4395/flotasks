import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Focus, Play, Pause, RotateCcw, X, Bell, SkipForward, Settings
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StudyWithMeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TimerMode = 'focus' | 'break';
type FocusStrategy = {
  totalHours: number;
  focusMinutes: number;
  breakMinutes: number;
  totalSessions: number;
};

export function StudyWithMe({ open, onOpenChange }: StudyWithMeProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<TimerMode>('focus');
  const [activeTab, setActiveTab] = useState<string>('timer');
  const [focusHours, setFocusHours] = useState<number>(2);
  const [currentSession, setCurrentSession] = useState<number>(1);
  const [focusStrategy, setFocusStrategy] = useState<FocusStrategy>({
    totalHours: 2,
    focusMinutes: 25,
    breakMinutes: 5,
    totalSessions: 4,
  });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'default'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  
  const { theme } = useTheme();
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize component
  useEffect(() => {
    // Request notification permission when component mounts
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      requestNotificationPermission();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Handle timer logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            // Timer has ended
            clearInterval(intervalRef.current!);
            handleTimerEnd();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, mode]);

  // Clean up when component unmounts or modal closes
  useEffect(() => {
    if (!open) {
      resetTimer();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [open]);

  // Update focus strategy when hours change
  useEffect(() => {
    calculateFocusStrategy(focusHours);
  }, [focusHours]);

  const calculateFocusStrategy = (hours: number) => {
    const totalMinutes = hours * 60;
    const focusMinutes = 25;
    const breakMinutes = 5;
    const cycleMinutes = focusMinutes + breakMinutes;
    const totalSessions = Math.floor(totalMinutes / cycleMinutes);
    
    setFocusStrategy({
      totalHours: hours,
      focusMinutes,
      breakMinutes,
      totalSessions,
    });
    
    // Reset the timer to match the strategy
    setTimeLeft(focusMinutes * 60);
  };

  const requestNotificationPermission = async () => {
    if (typeof Notification !== 'undefined') {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission !== 'granted') {
          toast({
            title: "Notification Permission",
            description: "Enabling notifications will alert you when focus and break periods are over.",
            duration: 5000,
          });
        }
      } catch (error) {
        console.error("Error requesting notification permission:", error);
      }
    }
  };

  const handleTimerEnd = () => {
    setIsRunning(false);
    
    // Show notification based on current mode
    if (mode === 'focus') {
      showNotification("Focus session complete! Time for a break.", `Session ${currentSession}/${focusStrategy.totalSessions} completed. Take a ${focusStrategy.breakMinutes}-minute break to recharge.`);
      setMode('break');
      setTimeLeft(focusStrategy.breakMinutes * 60);
    } else {
      const newSession = currentSession + 1;
      if (newSession <= focusStrategy.totalSessions) {
        showNotification("Break is over. Back to focus!", `Starting session ${newSession}/${focusStrategy.totalSessions}`);
        setCurrentSession(newSession);
        setMode('focus');
        setTimeLeft(focusStrategy.focusMinutes * 60);
      } else {
        showNotification("Congratulations!", `You've completed all ${focusStrategy.totalSessions} sessions!`);
        resetTimer();
      }
    }
  };
  
  const showNotification = (title: string, body: string) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body });
    } else {
      // Fallback for when notifications are not available or permission denied
      toast({
        title,
        description: body,
        duration: 10000,
      });
    }
  };

  const startTimer = () => {
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setMode('focus');
    setTimeLeft(focusStrategy.focusMinutes * 60);
    setCurrentSession(1);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const skipToNextSession = () => {
    if (mode === 'focus') {
      // Skip to break
      setMode('break');
      setTimeLeft(focusStrategy.breakMinutes * 60);
    } else {
      // Skip to next focus session
      const newSession = currentSession + 1;
      if (newSession <= focusStrategy.totalSessions) {
        setCurrentSession(newSession);
        setMode('focus');
        setTimeLeft(focusStrategy.focusMinutes * 60);
      } else {
        // Finished all sessions
        toast({
          title: "All Sessions Completed",
          description: "You've completed all focus sessions!",
          duration: 5000,
        });
        resetTimer();
      }
    }
    
    setIsRunning(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    const totalSeconds = mode === 'focus' ? focusStrategy.focusMinutes * 60 : focusStrategy.breakMinutes * 60;
    return ((totalSeconds - timeLeft) / totalSeconds) * 100;
  };

  const getModeColor = (): string => {
    if (theme === 'retro') {
      return mode === 'focus' ? '#0000AA' : '#008000';
    }
    
    if (theme === 'winter') {
      return mode === 'focus' ? '#4a6fa5' : '#4a9e82';
    }
    
    if (theme === 'spring') {
      return mode === 'focus' ? '#7e57c2' : '#66bb6a';
    }
    
    return mode === 'focus' ? 'rgb(59, 130, 246)' : 'rgb(16, 185, 129)';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <Focus className="h-5 w-5" />
          <span className="text-xl font-semibold">Focus Mode</span>
          <Badge variant="outline" className="ml-2">
            Session {currentSession}/{focusStrategy.totalSessions}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          {mode === 'focus'
            ? `Focus for ${focusStrategy.focusMinutes} minutes`
            : `Take a ${focusStrategy.breakMinutes}-minute break`}
        </p>
        
        <div className="mb-4">
          <Select
            value={focusHours.toString()}
            onValueChange={(value) => setFocusHours(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Focus duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 hour</SelectItem>
              <SelectItem value="2">2 hours</SelectItem>
              <SelectItem value="3">3 hours</SelectItem>
              <SelectItem value="4">4 hours</SelectItem>
              <SelectItem value="5">5 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Card className="p-6 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium" style={{ color: getModeColor() }}>
              {mode === 'focus' ? 'Focus Session' : 'Break Time'}
            </span>
          </div>
          
          {/* Session roadmap */}
          <div className="w-full flex items-center gap-1 mb-6">
            {Array.from({ length: focusStrategy.totalSessions }).map((_, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <span className="text-xs mb-1">{idx + 1}</span>
                <div 
                  className={cn(
                    "h-2 rounded w-full",
                    idx + 1 === currentSession && mode === 'focus'
                      ? "bg-primary"
                      : idx + 1 < currentSession
                        ? "bg-primary/80"
                        : "bg-primary/20"
                  )}
                />
              </div>
            ))}
          </div>
          
          {/* Timer display */}
          <div className="text-5xl font-semibold my-4 text-center">
            {formatTime(timeLeft)}
          </div>
          
          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className={cn(
                "h-full rounded-full",
                mode === 'focus' ? "bg-primary" : "bg-green-500"
              )}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          
          {/* Control buttons */}
          <div className="flex justify-center gap-4">
            <Button
              variant={isRunning ? "secondary" : "default"}
              size="icon"
              onClick={isRunning ? pauseTimer : startTimer}
            >
              {isRunning ? <Pause /> : <Play />}
            </Button>
            
            <Button variant="outline" size="icon" onClick={resetTimer}>
              <RotateCcw />
            </Button>
            
            <Button variant="outline" size="icon" onClick={skipToNextSession}>
              <SkipForward />
            </Button>
          </div>
        </Card>
        
        <div className="mt-4 pt-2 border-t flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}