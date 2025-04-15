// Add this declaration at the top of the file, before imports
declare global {
  interface Window {
    closeButtonClicked?: boolean;
    onYouTubeIframeAPIReady?: () => void;
  }
}

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Focus, Play, Pause, RotateCcw, X, Bell, SkipForward, Settings, Music, ChevronDown, Zap, Clock, VolumeX, Volume2
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

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

// Define lofi songs collection
interface LofiSong {
  id: string;
  title: string;
  embedUrl: string;
  thumbnailUrl: string;
}

const LOFI_SONGS: LofiSong[] = [
  {
    id: "1",
    title: "Traveler Vibes",
    embedUrl: "https://www.youtube.com/embed/mXpLHdYhMKA",
    thumbnailUrl: "https://i.ytimg.com/vi/mXpLHdYhMKA/hqdefault.jpg"
  },
  {
    id: "2",
    title: "Retro Vibes",
    embedUrl: "https://www.youtube.com/embed/GW3B30KQczs",
    thumbnailUrl: "https://i.ytimg.com/vi/GW3B30KQczs/hqdefault.jpg"
  },
  {
    id: "3", 
    title: "Fireplace Vibes",
    embedUrl: "https://www.youtube.com/embed/3sL0omwElxw",
    thumbnailUrl: "https://i.ytimg.com/vi/3sL0omwElxw/hqdefault.jpg"
  },
  {
    id: "4",
    title: "Study With Me Vibes",
    embedUrl: "https://www.youtube.com/embed/zf1lD0TAHGk",
    thumbnailUrl: "https://i.ytimg.com/vi/zf1lD0TAHGk/hqdefault.jpg"
  },
  {
    id: "5",
    title: "Radio Vibes",
    embedUrl: "https://www.youtube.com/embed/Na0w3Mz46GA",
    thumbnailUrl: "https://i.ytimg.com/vi/Na0w3Mz46GA/hqdefault.jpg"
  }
];

// Define YouTube Player interface for TypeScript
interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
  getPlayerState: () => number;
}

// Add this custom CircularProgress component before the SimpleFocusMode component
const CircularProgress = ({ value, strokeWidth = 8, size = 192, progressColor = "var(--primary)", trackColor = "var(--muted)" }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = value * circumference / 100;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90 w-full h-full"
        viewBox="0 0 100 100"
      >
        <circle
          className="transition-all duration-300"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
          r={radius}
          cx="50"
          cy="50"
        />
        <circle
          className="transition-all duration-300"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          fill="none"
          r={radius}
          cx="50"
          cy="50"
        />
      </svg>
    </div>
  );
};

// Add a logger utility before the component
const logEvent = (component: string, action: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${component}] ${action}`, details || '');
  
  // In a production app, you could send these logs to a service
  // logService.send({ component, action, details, timestamp });
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
  
  // Added timer view option
  const [timerView, setTimerView] = useState<'circle' | 'pie'>('circle');
  
  // Music player state
  const [selectedSong, setSelectedSong] = useState<LofiSong | null>(null);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const youtubePlayerRef = useRef<HTMLIFrameElement>(null);
  const playerInstanceRef = useRef<YouTubePlayer | null>(null);
  
  // Focus mode aesthetics
  const [isDeepFocus, setIsDeepFocus] = useState(false);
  
  const { theme } = useTheme();
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize YouTube API
  useEffect(() => {
    // Create a script element to load the YouTube IFrame Player API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Define callback for when YouTube API is ready
    const oldYTReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (oldYTReady) oldYTReady();
      setIsPlayerReady(true);
    };

    return () => {
      window.onYouTubeIframeAPIReady = oldYTReady;
    };
  }, []);

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
      logEvent('Timer', 'Started', { mode, timeLeft });
      
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            // Timer has ended
            clearInterval(intervalRef.current!);
            logEvent('Timer', 'Completed', { mode, session: currentSession });
            handleTimerEnd();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      logEvent('Timer', 'Paused', { mode, timeLeft });
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

  // Handle volume changes using the YouTube API
  useEffect(() => {
    if (playerInstanceRef.current) {
      if (isMuted) {
        playerInstanceRef.current.mute();
      } else {
        playerInstanceRef.current.unMute();
        playerInstanceRef.current.setVolume(volume);
      }
    }
  }, [isMuted, volume]);

  // Update YouTube player reference when ready
  useEffect(() => {
    if (isPlayerReady && youtubePlayerRef.current) {
      const player = new (window as any).YT.Player(youtubePlayerRef.current, {
        events: {
          onReady: onPlayerReady,
          onStateChange: (event: any) => {
            // Handle player state changes if needed
          }
        }
      });
      playerInstanceRef.current = player;
    }
  }, [isPlayerReady, selectedSong]);

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
    
    // Trigger deep focus effect when starting a focus session
    if (mode === 'focus') {
      setIsDeepFocus(true);
      setTimeout(() => {
        setIsDeepFocus(false);
      }, 1200);
    }
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

  // Modified to properly handle closing
  const handleOpenChange = (open: boolean) => {
    logEvent('Dialog', 'Open state change', { requestedState: open });
    // Only allow closing with the explicit button
    if (open === false) {
      // If this is triggered by an outside click or escape key, prevent it
      if (!window.closeButtonClicked) {
        logEvent('Dialog', 'Prevented accidental close');
        return; // Block the close operation
      }
      window.closeButtonClicked = false; // Reset the flag
    }
    onOpenChange(open);
  };

  // Handle close button click
  const handleClose = () => {
    logEvent('Dialog', 'Close button clicked');
    window.closeButtonClicked = true; // Set a flag that this is an intentional close
    onOpenChange(false);
  };

  // Select a lofi song
  const selectLofiSong = (song: LofiSong) => {
    logEvent('Music', 'Song selected', { songId: song.id, title: song.title });
    setSelectedSong(song);
  };

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    logEvent('Music', 'Volume changed', { previousVolume: volume, newVolume });
    setVolume(newVolume);
    if (playerInstanceRef.current) {
      try {
        playerInstanceRef.current.setVolume(newVolume);
        if (isMuted) {
          playerInstanceRef.current.unMute();
          setIsMuted(false);
        }
      } catch (error) {
        logEvent('Music', 'Error setting volume', { error: error.message });
        console.error("Error setting volume:", error);
      }
    }
  };
  
  // Toggle mute
  const toggleMute = () => {
    logEvent('Music', 'Mute toggled', { currentState: isMuted, willBe: !isMuted });
    if (playerInstanceRef.current) {
      try {
        if (isMuted) {
          playerInstanceRef.current.unMute();
          playerInstanceRef.current.setVolume(volume);
        } else {
          playerInstanceRef.current.mute();
        }
        setIsMuted(!isMuted);
      } catch (error) {
        logEvent('Music', 'Error toggling mute', { error: error.message });
        console.error("Error toggling mute:", error);
      }
    }
  };

  // Handle when YouTube iframe is ready
  const onPlayerReady = (event: any) => {
    try {
      console.log("YouTube player ready!");
      const player = event.target;
      playerInstanceRef.current = player;
      
      // Set initial volume and mute state
      player.setVolume(volume);
      if (isMuted) {
        player.mute();
      } else {
        player.unMute();
      }
      
      // Auto-play when ready
      player.playVideo();
    } catch (error) {
      console.error("Error initializing YouTube player:", error);
    }
  };

  // Prepare YouTube iframe when a song is selected
  const getYouTubeEmbedUrl = (song: LofiSong) => {
    // Add enablejsapi=1 to allow JavaScript API control
    return `${song.embedUrl}?enablejsapi=1&autoplay=1&controls=1`;
  };

  // Add pie chart components for the timer with improved aesthetics
  const PieChartTimer = ({ value, size = 144, focusColor = "var(--primary)", breakColor = "var(--green-600)" }) => {
    const strokeWidth = 8;
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const dashoffset = circumference - (value / 100) * circumference;
    const mode = value > 0 ? 'focus' : 'break'; // Get mode from parent component
    
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Simple clean background */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="var(--card)"
            stroke="var(--border)"
            strokeWidth="0.5"
          />
          
          {/* Simple progress arc */}
          <path
            d={`
              M 50 50
              L 50 ${50 - radius}
              A ${radius} ${radius} 0 ${value > 50 ? 1 : 0} 1 ${
                50 + radius * Math.sin(value / 100 * 2 * Math.PI)
              } ${
                50 - radius * Math.cos(value / 100 * 2 * Math.PI)
              }
              Z
            `}
            fill={value > 0 ? "var(--primary)" : "var(--green-600)"}
            opacity={0.7}
          />
          
          {/* Simple hour markers */}
          {[0, 3, 6, 9].map((hour) => {
            const angle = hour * 30 * (Math.PI / 180);
            const x = 50 + (radius - 2) * Math.sin(angle);
            const y = 50 - (radius - 2) * Math.cos(angle);
            return (
              <circle
                key={hour}
                cx={x}
                cy={y}
                r={1.5}
                fill="var(--foreground)"
                opacity={0.8}
              />
            );
          })}
          
          {/* Center circle */}
          <circle
            cx="50"
            cy="50"
            r={radius - 30}
            fill="var(--background)"
            stroke="var(--border)"
            strokeWidth="0.5"
          />
        </svg>
      </div>
    );
  };

  // Add toggle for timer view
  const toggleTimerView = () => {
    logEvent('Timer', 'View toggled', { previousView: timerView, newView: timerView === 'circle' ? 'pie' : 'circle' });
    setTimerView(timerView === 'circle' ? 'pie' : 'circle');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        
        {/* Deep focus effect overlay */}
        {isDeepFocus && (
          <div className="fixed inset-0 z-[51] pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-purple-600/30 animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Zap className="h-20 w-20 text-yellow-400 animate-ping opacity-70" />
            </div>
          </div>
        )}
        
        <DialogContent 
          className={cn(
            "sm:max-w-md p-6 overflow-auto max-h-[90vh]",
            isRunning && mode === 'focus' && "border-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]"
          )}
          onInteractOutside={(e) => {
            // Prevent closing on outside clicks
            e.preventDefault();
            logEvent('Dialog', 'Outside click prevented');
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing with Escape key
            e.preventDefault();
            logEvent('Dialog', 'Escape key prevented');
          }}
          closeButtonProps={{ className: 'hidden' }}
        >
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Focus className={cn(
                "h-5 w-5",
                isRunning && mode === 'focus' && "text-primary animate-pulse"
              )} />
              <span className={cn(
                "text-xl font-semibold",
                isRunning && mode === 'focus' && "text-primary"
              )}>
                {isRunning && mode === 'focus' ? "LASER FOCUS" : "Focus Mode"}
              </span>
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
                </SelectContent>
              </Select>
            </div>
            
            <Tabs defaultValue="timer" onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="timer">Timer</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="timer">
                <Card className={cn(
                  "p-6 mb-4",
                  isRunning && mode === 'focus' && "bg-primary/5"
                )}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={cn(
                      "text-sm font-medium",
                      isRunning && mode === 'focus' && "font-bold tracking-wide"
                    )} style={{ color: getModeColor() }}>
                      {mode === 'focus' ? (isRunning ? 'DEEP FOCUS' : 'Focus Session') : 'Break Time'}
                    </span>
                    
                    {/* Music Selection Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          <Music className="h-4 w-4" />
                          <span className="text-xs">Music</span>
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {LOFI_SONGS.map((song) => (
                          <DropdownMenuItem 
                            key={song.id}
                            onClick={() => selectLofiSong(song)}
                            className={cn(
                              "flex items-center gap-2 cursor-pointer",
                              selectedSong?.id === song.id && "bg-primary/10"
                            )}
                          >
                            <img 
                              src={song.thumbnailUrl} 
                              alt={song.title} 
                              className="w-6 h-6 object-cover rounded"
                            />
                            <span className="text-xs">{song.title}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Session roadmap */}
                  <div className="w-full flex items-center gap-1 mb-6">
                    {Array.from({ length: focusStrategy.totalSessions }).map((_, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        <span className="text-xs mb-1">{idx + 1}</span>
                        <div 
                          className={cn(
                            "h-2 rounded w-full",
                            idx + 1 === currentSession && mode === 'focus' && isRunning
                              ? "bg-primary animate-pulse"
                              : idx + 1 === currentSession && mode === 'focus'
                                ? "bg-primary"
                                : idx + 1 < currentSession
                                  ? "bg-primary/80"
                                  : "bg-primary/20"
                          )}
                        />
                      </div>
                    ))}
                  </div>
                  
                  {/* Timer display with toggle between circle and pie view */}
                  <div className="flex flex-col items-center justify-center mb-4">
                    <div className="relative w-36 h-36 mb-1">
                      {timerView === 'circle' ? (
                        <>
                          {/* Focus/Break Timer Circle */}
                          <CircularProgress
                            value={getProgressPercentage()}
                            strokeWidth={6}
                            size={144}
                            progressColor={mode === 'focus' ? "var(--primary)" : "var(--green-600)"}
                            trackColor="var(--muted)"
                          />
                          
                          {/* Session markers around the outer edge - Improved */}
                          <div className="absolute inset-0">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                              {Array.from({ length: focusStrategy.totalSessions * 2 }).map((_, idx) => {
                                const isFocus = idx % 2 === 0;
                                const sessionNumber = Math.floor(idx / 2) + 1;
                                const currentIdx = currentSession * 2 - (mode === 'focus' ? 1 : 0) - 1;
                                const angle = (idx * (360 / (focusStrategy.totalSessions * 2))) * (Math.PI / 180);
                                const radius = 47;
                                const x = 50 + radius * Math.cos(angle - Math.PI / 2);
                                const y = 50 + radius * Math.sin(angle - Math.PI / 2);
                                const isActive = idx <= currentIdx;
                                
                                // Show the session number for focus periods
                                return isFocus ? (
                                  <g key={idx}>
                                    <circle
                                      cx={x}
                                      cy={y}
                                      r={2.5}
                                      fill={isActive ? "var(--primary)" : "var(--muted)"}
                                      opacity={isActive ? 1 : 0.5}
                                    />
                                    {focusStrategy.totalSessions <= 8 && (
                                      <text
                                        x={x}
                                        y={y}
                                        fontSize="4"
                                        fill="var(--foreground)"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        opacity={isActive ? 0.9 : 0.4}
                                      >
                                        {sessionNumber}
                                      </text>
                                    )}
                                  </g>
                                ) : (
                                  <circle
                                    key={idx}
                                    cx={x}
                                    cy={y}
                                    r={1.5}
                                    fill={isActive ? "var(--green-600)" : "var(--muted)"}
                                    opacity={isActive ? 0.8 : 0.3}
                                  />
                                );
                              })}
                            </svg>
                          </div>
                        </>
                      ) : (
                        <PieChartTimer value={getProgressPercentage()} />
                      )}
                      
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={cn(
                          "text-4xl font-semibold transition-all duration-300",
                          isRunning && mode === 'focus' && "text-primary tracking-tighter"
                        )}>
                          {formatTime(timeLeft)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Timer view toggle */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={toggleTimerView} 
                      className="h-6 text-xs opacity-70 hover:opacity-100"
                    >
                      {timerView === 'circle' ? 'Switch to Pie View' : 'Switch to Circle View'}
                    </Button>
                  </div>
                  
                  {/* Control buttons */}
                  <div className="flex justify-center gap-4">
                    <Button
                      variant={isRunning ? "secondary" : "default"}
                      size="icon"
                      onClick={isRunning ? pauseTimer : startTimer}
                      className={isRunning && mode === 'focus' ? "ring-1 ring-primary" : ""}
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
                
                {/* YouTube Player - Now visible */}
                {selectedSong && (
                  <div className="mt-4 space-y-3">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      <span>Currently Playing:</span>
                      <span className="text-primary">{selectedSong.title}</span>
                    </div>
                    
                    {/* Visible YouTube Player */}
                    <div className="rounded-md overflow-hidden border border-border">
                      <iframe
                        ref={youtubePlayerRef}
                        src={getYouTubeEmbedUrl(selectedSong)}
                        className="w-full aspect-video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMute}
                        className="h-8 w-8"
                      >
                        {isMuted ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Slider
                        value={[volume]}
                        max={100}
                        step={1}
                        className="w-32"
                        onValueChange={(values) => handleVolumeChange(values[0])}
                        disabled={isMuted}
                      />
                      <span className="text-xs text-muted-foreground">
                        {isMuted ? "Muted" : `${volume}%`}
                      </span>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              {/* Settings Tab */}
              <TabsContent value="settings">
                <Card className="p-6 mb-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium mb-2">Adjust Focus Strategy</h3>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Focus Duration</span>
                        <span className="text-sm">{focusStrategy.focusMinutes} min</span>
                      </div>
                      <Slider
                        value={[focusStrategy.focusMinutes]}
                        min={5}
                        max={60}
                        step={5}
                        onValueChange={(values) => {
                          setFocusStrategy({
                            ...focusStrategy,
                            focusMinutes: values[0],
                            totalSessions: Math.floor((focusStrategy.totalHours * 60) / (values[0] + focusStrategy.breakMinutes))
                          });
                          if (mode === 'focus') {
                            setTimeLeft(values[0] * 60);
                          }
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Break Duration</span>
                        <span className="text-sm">{focusStrategy.breakMinutes} min</span>
                      </div>
                      <Slider
                        value={[focusStrategy.breakMinutes]}
                        min={1}
                        max={20}
                        step={1}
                        onValueChange={(values) => {
                          setFocusStrategy({
                            ...focusStrategy,
                            breakMinutes: values[0],
                            totalSessions: Math.floor((focusStrategy.totalHours * 60) / (focusStrategy.focusMinutes + values[0]))
                          });
                          if (mode === 'break') {
                            setTimeLeft(values[0] * 60);
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="text-sm font-medium mb-2">Notifications</h3>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        Status: {notificationPermission === 'granted' 
                          ? 'Enabled ✓' 
                          : notificationPermission === 'denied' 
                              ? 'Blocked ✗' 
                              : 'Not set'}
                      </span>
                      
                      {notificationPermission !== 'granted' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={requestNotificationPermission}
                        >
                          Enable
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <DialogFooter className="flex items-center justify-between mt-4 pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground">
              {selectedSong ? selectedSong.title : 'No music selected'}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClose} 
              className="ml-2"
            >
              <X className="h-3 w-3 mr-1" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}