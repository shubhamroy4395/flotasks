import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Headphones, Play, Pause, RotateCcw, X, Volume2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StudyWithMeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TimerMode = 'focus' | 'break';

export function StudyWithMe({ open, onOpenChange }: StudyWithMeProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<TimerMode>('focus');
  const [volume, setVolume] = useState(50);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'default'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  
  const { theme } = useTheme();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio 
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/music/ghibli.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = volume / 100;
    }

    // Request notification permission when component mounts
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      requestNotificationPermission();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Update audio volume when volume state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

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
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [open]);

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
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    setIsRunning(false);
    
    // Show notification based on current mode
    if (mode === 'focus') {
      showNotification("Focus session complete! Time for a break.", "Take a 5-minute break to recharge.");
      setMode('break');
      setTimeLeft(5 * 60); // 5 minutes break
    } else {
      showNotification("Break is over. Back to study!", "Ready for another focused session?");
      setMode('focus');
      setTimeLeft(25 * 60); // Back to 25 minutes focus
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
    if (audioRef.current) {
      audioRef.current.play().catch(error => {
        console.error("Audio playback failed:", error);
        toast({
          title: "Audio Playback Failed",
          description: "Please interact with the page first to enable audio.",
          variant: "destructive"
        });
      });
    }
    setIsRunning(true);
  };

  const pauseTimer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsRunning(false);
  };

  const resetTimer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsRunning(false);
    setMode('focus');
    setTimeLeft(25 * 60);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    const totalSeconds = mode === 'focus' ? 25 * 60 : 5 * 60;
    return ((totalSeconds - timeLeft) / totalSeconds) * 100;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-md p-6", 
        theme === 'retro' && "border-2 border-solid border-[#DFDFDF] border-r-[#808080] border-b-[#808080]"
      )}>
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            {mode === 'focus' ? 'Focus Session' : 'Break Time'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'focus' 
              ? 'Stay focused for 25 minutes with calming music' 
              : 'Take a 5-minute break to refresh your mind'}
          </DialogDescription>
        </DialogHeader>

        <Card className={cn(
          "p-6 flex flex-col items-center justify-center space-y-4 mt-4",
          theme === 'retro' && "border-2 border-solid border-[#DFDFDF] border-r-[#808080] border-b-[#808080]"
        )}>
          {/* Mode indicator */}
          <div className="w-full flex justify-between items-center mb-2">
            <span className={cn(
              "text-sm font-medium",
              mode === 'focus' ? "text-blue-500" : "text-emerald-500"
            )}>
              {mode === 'focus' ? 'FOCUS MODE' : 'BREAK MODE'}
            </span>
            <span className="text-sm text-muted-foreground">
              {getProgressPercentage().toFixed(0)}% Complete
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-1000",
                mode === 'focus' ? "bg-blue-500" : "bg-emerald-500"
              )} 
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          
          {/* Timer */}
          <div className="text-6xl font-mono font-bold my-4 tracking-tight">
            {formatTime(timeLeft)}
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            {!isRunning ? (
              <Button onClick={startTimer} variant="default" size="icon" className="h-10 w-10">
                <Play className="h-5 w-5" />
              </Button>
            ) : (
              <Button onClick={pauseTimer} variant="default" size="icon" className="h-10 w-10">
                <Pause className="h-5 w-5" />
              </Button>
            )}
            <Button onClick={resetTimer} variant="outline" size="icon" className="h-10 w-10">
              <RotateCcw className="h-5 w-5" />
            </Button>
            <DialogClose asChild>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
          
          {/* Volume control */}
          <div className="w-full flex items-center space-x-2 mt-4">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) => setVolume(value[0])}
              className="flex-1"
            />
            <span className="w-10 text-right text-xs text-muted-foreground">
              {volume}%
            </span>
          </div>
        </Card>
        
        {notificationPermission !== 'granted' && (
          <div className="mt-4 text-sm text-muted-foreground">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={requestNotificationPermission}
              className="w-full"
            >
              Enable Notifications
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}