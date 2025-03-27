import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Focus, Play, Pause, RotateCcw, X, Monitor, Bell, 
  Clock, SkipForward, Settings
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";

interface StudyWithMeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TimerMode = 'focus' | 'break';
type BackgroundType = 'none' | 'ambient';
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
  const [background, setBackground] = useState<BackgroundType>('ambient');
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

  const toggleBackground = () => {
    setBackground(background === 'none' ? 'ambient' : 'none');
  };

  const getBackgroundForTheme = (): string => {
    switch (theme) {
      case 'dark':
        return '/images/ambient/night.svg';
      case 'winter':
        return '/images/ambient/winter.svg';
      case 'spring':
        return '/images/ambient/spring.svg';
      case 'retro':
        return '/images/ambient/retro.svg';
      default:
        return '/images/ambient/forest.svg';
    }
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
      <DialogContent className={cn(
        "sm:max-w-3xl p-0 overflow-hidden border-0", // Made dialog wider
        theme === 'retro' && "border-2 border-solid border-[#DFDFDF] border-r-[#808080] border-b-[#808080]"
      )}>
        {/* Ambient Background */}
        {background === 'ambient' && (
          <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
            <div className={cn(
              "absolute inset-0 bg-no-repeat bg-cover bg-center transition-opacity duration-1000",
              isRunning ? "opacity-100" : "opacity-70"
            )} 
            style={{ backgroundImage: `url(${getBackgroundForTheme()})` }}>
              {/* Animated overlay for relaxing pulse effect - different for focus/break */}
              <div className={cn(
                "absolute inset-0",
                mode === 'focus' 
                  ? "bg-gradient-to-b from-primary/10 to-transparent animate-pulse-slow"
                  : "bg-gradient-to-b from-green-500/10 to-transparent animate-pulse-slower"
              )}></div>
              
              {/* Moving particles for visual interest - using Framer Motion */}
              {isRunning && (
                <div className="particle-container">
                  {Array.from({ length: 20 }).map((_, i) => {
                    // Create more varied and theme-aware particles
                    const size = Math.random() * 10 + 5;
                    const startX = Math.random() * 100;
                    const startY = Math.random() * 100;
                    const endX = startX + (Math.random() * 100 - 50);
                    const endY = startY - Math.random() * 100;
                    const duration = Math.random() * 20 + 15;
                    const delay = Math.random() * 8;
                    
                    // Theme-specific particle colors
                    let particleColor;
                    if (theme === 'retro') {
                      particleColor = mode === 'focus' ? "bg-blue-500/20" : "bg-green-600/20";
                    } else if (theme === 'winter') {
                      particleColor = mode === 'focus' ? "bg-sky-400/20" : "bg-teal-400/20";
                    } else if (theme === 'spring') {
                      particleColor = mode === 'focus' ? "bg-purple-400/20" : "bg-lime-400/20";
                    } else if (theme === 'dark') {
                      particleColor = mode === 'focus' ? "bg-blue-400/20" : "bg-emerald-400/20";
                    } else {
                      particleColor = mode === 'focus' ? "bg-blue-500/20" : "bg-green-500/20";
                    }
                    
                    return (
                      <motion.div
                        key={i}
                        className={cn(
                          "absolute rounded-full",
                          particleColor
                        )}
                        style={{
                          width: size,
                          height: size,
                          left: `${startX}%`,
                          top: `${startY}%`,
                          opacity: 0
                        }}
                        animate={{
                          x: endX - startX,
                          y: endY - startY,
                          opacity: [0, 0.7, 0],
                          scale: [0.7, 1.3, 0.9]
                        }}
                        transition={{
                          duration: duration,
                          delay: delay,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Foreground Content */}
        <div className={cn(
          "relative z-10 p-6 backdrop-blur-sm",
          background === 'ambient' ? "bg-background/70" : "bg-background",
          "text-foreground" // Ensure text color follows the theme
        )}>
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-foreground">
              <Focus className="h-5 w-5" />
              Focus Mode
              {currentSession > 1 && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Session {currentSession}/{focusStrategy.totalSessions}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {mode === 'focus' 
                ? `Focus for ${focusStrategy.focusMinutes} minutes` 
                : `Take a ${focusStrategy.breakMinutes}-minute break to recharge`}
            </DialogDescription>
          </DialogHeader>

          {/* Main content tabs */}
          {/* Focus hours selection on main screen */}
          <div className="flex justify-between items-center mb-4 space-x-4">
            <div className="flex-1">
              <Select 
                value={focusHours.toString()} 
                onValueChange={(value) => setFocusHours(parseInt(value))}
              >
                <SelectTrigger className="w-full">
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleBackground}
              className={cn(
                background === 'ambient' && "text-primary"
              )}
            >
              <Monitor className="h-4 w-4 mr-1" />
              {background === 'ambient' ? 'Hide Visual' : 'Show Visual'}
            </Button>
          </div>
          
          <Tabs defaultValue="timer" className="mt-2" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="timer">Timer</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            {/* Timer Tab */}
            <TabsContent value="timer" className="mt-0">
              <Card className={cn(
                "p-6 flex flex-col items-center justify-center space-y-4",
                background === 'ambient' ? "bg-card/80 backdrop-blur-sm" : "bg-card",
                "text-card-foreground", // Ensure card text uses the correct theme color
                theme === 'retro' && "border-2 border-solid border-[#DFDFDF] border-r-[#808080] border-b-[#808080]"
              )}>
                {/* Mode indicator */}
                <div className="w-full flex justify-between items-center mb-2">
                  <span className="text-sm font-medium flex items-center gap-1" style={{ color: getModeColor() }}>
                    {mode === 'focus' ? (
                      <>
                        <Focus className="h-4 w-4" />
                        Focus Session
                      </>
                    ) : (
                      <>
                        <Bell className="h-4 w-4" />
                        Break Time
                      </>
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {currentSession}/{focusStrategy.totalSessions}
                  </span>
                </div>
                
                {/* Session roadmap - A visual map of all sessions with current highlighted */}
                <div className="w-full flex items-center justify-between gap-1 mb-2">
                  {Array.from({ length: focusStrategy.totalSessions }).map((_, idx) => (
                    <div key={idx} className="flex-1 flex gap-1">
                      {/* Focus period box */}
                      <div 
                        className={cn(
                          "h-2 rounded flex-1",
                          idx + 1 === currentSession && mode === 'focus' 
                            ? "bg-primary animate-pulse" 
                            : idx + 1 < currentSession 
                              ? "bg-primary/80" 
                              : "bg-primary/20"
                        )}
                      ></div>
                      
                      {/* Break period box (don't show after last focus) */}
                      {idx + 1 < focusStrategy.totalSessions && (
                        <div 
                          className={cn(
                            "h-2 rounded w-1/5",
                            idx + 1 === currentSession && mode === 'break' 
                              ? "bg-green-500 animate-pulse" 
                              : idx + 1 < currentSession 
                                ? "bg-green-500/80" 
                                : "bg-green-500/20"
                          )}
                        ></div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Time display with glowing effect when timer is running */}
                <div 
                  className={cn(
                    "text-6xl font-semibold my-4 relative",
                    isRunning && "animate-subtle-pulse"
                  )}
                >
                  {/* Glowing backdrop when timer is running */}
                  {isRunning && (
                    <div 
                      className={cn(
                        "absolute inset-0 -m-8 rounded-full blur-xl opacity-20",
                        mode === 'focus' ? "bg-primary" : "bg-green-500"
                      )}
                      style={{ zIndex: -1 }} 
                    />
                  )}
                  
                  {formatTime(timeLeft)}
                </div>
                
                {/* Progress bar under time display */}
                <div 
                  className="w-full h-2 bg-muted rounded-full overflow-hidden"
                  style={{ 
                    boxShadow: isRunning ? `0 0 10px ${mode === 'focus' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` : 'none' 
                  }}
                >
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000 ease-linear rounded-full",
                      mode === 'focus' ? "bg-primary" : "bg-green-500"
                    )} 
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
                
                {/* Control buttons */}
                <div className="flex space-x-4 mt-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant={isRunning ? "secondary" : "default"} 
                          size="icon" 
                          onClick={isRunning ? pauseTimer : startTimer}
                          className={cn(
                            isRunning && "animate-subtle-pulse shadow-lg",
                            isRunning && mode === 'focus' && "shadow-blue-500/20",
                            isRunning && mode === 'break' && "shadow-green-500/20"
                          )}
                        >
                          {isRunning ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{isRunning ? "Pause" : "Start"} Timer</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={resetTimer}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reset Timer</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={skipToNextSession}>
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Skip to {mode === 'focus' ? 'Break' : 'Next Focus Session'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </Card>
            </TabsContent>
            
            {/* Settings Tab */}
            <TabsContent value="settings" className="mt-0">
              <Card className={cn(
                "p-6",
                background === 'ambient' ? "bg-card/80 backdrop-blur-sm" : "bg-card",
                "text-card-foreground",
                theme === 'retro' && "border-2 border-solid border-[#DFDFDF] border-r-[#808080] border-b-[#808080]"
              )}>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Settings className="h-4 w-4" />
                      Focus Strategy
                    </h4>
                    <div className="grid gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs">Focus Period</span>
                          <span className="text-xs">{focusStrategy.focusMinutes} minutes</span>
                        </div>
                        <Slider 
                          defaultValue={[focusStrategy.focusMinutes]} 
                          min={10} 
                          max={60} 
                          step={5} 
                          className="z-10"
                          onValueChange={(value) => {
                            setFocusStrategy(prev => ({
                              ...prev, 
                              focusMinutes: value[0],
                              totalSessions: Math.floor((prev.totalHours * 60) / (value[0] + prev.breakMinutes))
                            }));
                            if (mode === 'focus' && !isRunning) {
                              setTimeLeft(value[0] * 60);
                            }
                          }}
                        />
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs">Break Length</span>
                          <span className="text-xs">{focusStrategy.breakMinutes} minutes</span>
                        </div>
                        <Slider 
                          defaultValue={[focusStrategy.breakMinutes]} 
                          min={1} 
                          max={20} 
                          step={1} 
                          className="z-10"
                          onValueChange={(value) => {
                            setFocusStrategy(prev => ({
                              ...prev, 
                              breakMinutes: value[0],
                              totalSessions: Math.floor((prev.totalHours * 60) / (prev.focusMinutes + value[0]))
                            }));
                            if (mode === 'break' && !isRunning) {
                              setTimeLeft(value[0] * 60);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                      <Bell className="h-4 w-4" />
                      Notifications
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      Notification status: {notificationPermission === 'granted' ? 
                        'Enabled ✓' : notificationPermission === 'denied' ? 
                        'Blocked ✗' : 'Not set'}
                    </p>
                    {notificationPermission !== 'granted' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={requestNotificationPermission}
                      >
                        Enable Notifications
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Dialog footer */}
          <DialogFooter className="flex items-center justify-between mt-4 pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground flex items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="mr-2"
              >
                <X className="h-4 w-4 mr-1" />
                Close Focus Mode
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}