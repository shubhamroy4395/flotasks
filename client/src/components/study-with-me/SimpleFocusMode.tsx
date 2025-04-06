import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Focus, Play, Pause, RotateCcw, X, Bell, SkipForward, Settings, Music, ChevronDown, Zap
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
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

  // Handle close button click only, prevent outside clicks from closing
  const handleOpenChange = (open: boolean) => {
    // Only allow closing through the explicit close button
    if (!open) {
      // Do nothing - don't allow automatic closing
      return;
    }
    onOpenChange(open);
  };

  // This function will be called when the user deliberately clicks the close button
  const handleClose = () => {
    onOpenChange(false);
  };

  // Select a lofi song
  const selectLofiSong = (song: LofiSong) => {
    setSelectedSong(song);
  };

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (playerInstanceRef.current && !isMuted) {
      playerInstanceRef.current.setVolume(newVolume);
    }
  };
  
  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Handle when YouTube iframe is ready
  const onPlayerReady = (event: any) => {
    playerInstanceRef.current = event.target;
    // Initialize volume
    event.target.setVolume(volume);
    if (isMuted) {
      event.target.mute();
    }
  };

  // Prepare YouTube iframe when a song is selected
  const getYouTubeEmbedUrl = (song: LofiSong) => {
    const videoId = song.embedUrl.split('/').pop();
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&controls=1&loop=1&playlist=${videoId}&modestbranding=1&rel=0`;
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
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing with Escape key
            e.preventDefault();
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
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
            
            {/* Single close button in the header */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
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
                  
                  {/* Vibes dropdown menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-1 h-7">
                        <Music className="h-3.5 w-3.5" />
                        <span className="text-xs">{selectedSong ? 'Change Vibes' : 'Add Vibes'}</span>
                        <ChevronDown className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      {LOFI_SONGS.map(song => (
                        <DropdownMenuItem 
                          key={song.id}
                          onClick={() => selectLofiSong(song)}
                          className={cn(
                            "flex items-center gap-2 cursor-pointer py-2",
                            selectedSong?.id === song.id && "bg-primary/10"
                          )}
                        >
                          <img 
                            src={song.thumbnailUrl} 
                            alt={song.title}
                            className="w-8 h-8 object-cover rounded-sm"
                          />
                          <span className="text-sm truncate">{song.title}</span>
                          {selectedSong?.id === song.id && (
                            <span className="ml-auto w-2 h-2 rounded-full bg-primary"></span>
                          )}
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
                
                {/* Timer display */}
                <div className={cn(
                  "text-5xl font-semibold my-4 text-center transition-all duration-300",
                  isRunning && mode === 'focus' && "text-6xl text-primary tracking-tighter drop-shadow-glow"
                )}>
                  {formatTime(timeLeft)}
                </div>
                
                {/* Progress bar */}
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-4">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      mode === 'focus' ? (isRunning ? "bg-primary shadow-glow" : "bg-primary") : "bg-green-500",
                      isRunning && "animate-pulse-subtle"
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
                
                {/* YouTube video player embedded directly in timer tab */}
                {selectedSong && (
                  <div className="mt-4 pt-4 border-t border-dashed">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className="animate-pulse h-2 w-2 bg-primary rounded-full"></div>
                        <span className="text-sm font-medium">Now Playing: {selectedSong.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={toggleMute}
                        >
                          {isMuted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setSelectedSong(null)}
                        >
                          Stop
                        </Button>
                      </div>
                    </div>
                    
                    {/* Enlarged YouTube player with iframe API */}
                    <div className="rounded-md overflow-hidden aspect-video h-48 mb-3">
                      <iframe 
                        id="youtube-player"
                        width="100%" 
                        height="100%" 
                        src={getYouTubeEmbedUrl(selectedSong)}
                        title={selectedSong.title}
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                        onLoad={() => {
                          if (window.YT && isPlayerReady) {
                            new window.YT.Player("youtube-player", {
                              events: {
                                onReady: onPlayerReady,
                              },
                            });
                          }
                        }}
                      ></iframe>
                    </div>
                    
                    {/* Volume control */}
                    <div className="space-y-2 mb-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Volume</span>
                        <span className="text-sm">{volume}%</span>
                      </div>
                      <Slider
                        value={[volume]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(values) => handleVolumeChange(values[0])}
                        disabled={isMuted}
                        className={isMuted ? "opacity-50" : ""}
                      />
                    </div>
                  </div>
                )}
              </Card>
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
        </DialogContent>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}