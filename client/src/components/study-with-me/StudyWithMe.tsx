import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Focus, Play, Pause, RotateCcw, X, Volume2, Monitor, Music, Bell, 
  Clock, SkipForward, CloudLightning, CloudRain, Flame, Radio, Settings
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface StudyWithMeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TimerMode = 'focus' | 'break';
type BackgroundType = 'none' | 'ambient';
type SoundType = 'ghibli' | 'rain' | 'thunder' | 'fire' | 'none';
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
  const [volume, setVolume] = useState(50);
  const [background, setBackground] = useState<BackgroundType>('ambient');
  const [soundType, setSoundType] = useState<SoundType>('ghibli');
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio 
  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadAudio(soundType);
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

  // Update audio when sound type changes
  useEffect(() => {
    if (audioRef.current) {
      const wasPlaying = !audioRef.current.paused;
      audioRef.current.pause();
      loadAudio(soundType);
      if (wasPlaying) {
        audioRef.current?.play().catch(error => {
          console.error("Audio playback failed:", error);
        });
      }
    }
  }, [soundType]);

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

  const loadAudio = (type: SoundType) => {
    if (typeof window === 'undefined') return;
    
    let audioPath = '';
    switch (type) {
      case 'ghibli':
        audioPath = '/music/ghibli.mp3';
        break;
      case 'rain':
        audioPath = '/music/rain.mp3';
        break;
      case 'thunder':
        audioPath = '/music/thunder.mp3';
        break;
      case 'fire':
        audioPath = '/music/fire.mp3';
        break;
      case 'none':
        audioPath = '';
        break;
      default:
        audioPath = '/music/ghibli.mp3';
    }
    
    if (audioPath) {
      audioRef.current = new Audio(audioPath);
      audioRef.current.loop = true;
      audioRef.current.volume = volume / 100;
    } else {
      audioRef.current = null;
    }
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
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
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
    if (audioRef.current && soundType !== 'none') {
      // Get a user gesture to enable audio
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Audio playback failed:", error);
          toast({
            title: "Click Play Button Again",
            description: "Browser requires a click to play audio. Click play button once more.",
            duration: 5000
          });
        });
      }
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
    
    if (audioRef.current && !audioRef.current.paused) {
      // Keep playing audio if it was already playing
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
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
        "sm:max-w-xl p-0 overflow-hidden border-0", 
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
              
              {/* Moving particles for visual interest */}
              {isRunning && (
                <div className="particle-container">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "particle absolute rounded-full",
                        mode === 'focus' ? "bg-primary/20" : "bg-green-500/20"
                      )}
                      style={{
                        width: `${Math.random() * 10 + 5}px`,
                        height: `${Math.random() * 10 + 5}px`,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDuration: `${Math.random() * 20 + 10}s`,
                        animationDelay: `${Math.random() * 10}s`
                      }}
                    ></div>
                  ))}
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
                ? `Focus for ${focusStrategy.focusMinutes} minutes with ambient sounds` 
                : `Take a ${focusStrategy.breakMinutes}-minute break to recharge`}
            </DialogDescription>
          </DialogHeader>

          {/* Main content tabs */}
          <Tabs defaultValue="timer" className="mt-2" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="timer">Timer</TabsTrigger>
              <TabsTrigger value="sounds">Sounds</TabsTrigger>
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
                        FOCUS SESSION
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4" />
                        BREAK TIME
                      </>
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {getProgressPercentage().toFixed(0)}% Complete
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-1000" 
                    style={{ 
                      width: `${getProgressPercentage()}%`,
                      backgroundColor: getModeColor(),
                      boxShadow: isRunning ? `0 0 8px ${getModeColor()}` : 'none'
                    }}
                  />
                </div>
                
                {/* Timer */}
                <div className={cn(
                  "text-7xl font-mono font-bold my-6 tracking-tight transition-all text-card-foreground",
                  isRunning && "animate-pulse-very-slow"
                )}>
                  {formatTime(timeLeft)}
                </div>
                
                {/* Controls */}
                <div className="flex items-center justify-center gap-3">
                  {!isRunning ? (
                    <Button 
                      onClick={startTimer} 
                      variant="default" 
                      size="icon" 
                      className={cn(
                        "h-12 w-12 rounded-full shadow-lg",
                        theme !== 'retro' && "bg-gradient-to-br",
                        mode === 'focus' ? "from-blue-400 to-blue-600" : "from-green-400 to-green-600",
                        theme === 'retro' && "bg-[#D4D0C8]"
                      )}
                    >
                      <Play className="h-6 w-6" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={pauseTimer} 
                      variant="default" 
                      size="icon" 
                      className={cn(
                        "h-12 w-12 rounded-full shadow-lg",
                        theme !== 'retro' && "bg-gradient-to-br",
                        mode === 'focus' ? "from-blue-400 to-blue-600" : "from-green-400 to-green-600",
                        theme === 'retro' && "bg-[#D4D0C8]"
                      )}
                    >
                      <Pause className="h-6 w-6" />
                    </Button>
                  )}
                  <Button onClick={resetTimer} variant="outline" size="icon" className="h-10 w-10 rounded-full">
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                  <Button onClick={skipToNextSession} variant="outline" size="icon" className="h-10 w-10 rounded-full">
                    <SkipForward className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Session stats */}
                {isRunning && (
                  <div className="w-full mt-4 p-3 text-sm text-center rounded-md bg-primary/10">
                    <p>{mode === 'focus' 
                      ? 'Focus deeply and avoid distractions' 
                      : 'Move around, stretch, and rest your eyes'}</p>
                  </div>
                )}
                
                {/* Background toggle */}
                <div className="w-full pt-4 flex justify-between items-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={toggleBackground}
                    className={cn(
                      "text-xs",
                      background === 'ambient' && "text-primary"
                    )}
                  >
                    <Monitor className="h-3 w-3 mr-1" />
                    {background === 'ambient' ? 'Hide Background' : 'Show Background'}
                  </Button>
                  
                  {notificationPermission !== 'granted' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={requestNotificationPermission}
                      className="text-xs"
                    >
                      <Bell className="h-3 w-3 mr-1" />
                      Enable Notifications
                    </Button>
                  )}
                </div>
              </Card>
            </TabsContent>
            
            {/* Sounds Tab */}
            <TabsContent value="sounds" className="mt-0">
              <Card className={cn(
                "p-6",
                background === 'ambient' ? "bg-card/80 backdrop-blur-sm" : "bg-card",
                "text-card-foreground",
                theme === 'retro' && "border-2 border-solid border-[#DFDFDF] border-r-[#808080] border-b-[#808080]"
              )}>
                <h3 className="text-lg font-medium mb-4">Ambient Sounds</h3>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <Button 
                    variant={soundType === 'ghibli' ? "default" : "outline"} 
                    className="flex items-center justify-center gap-2 py-6"
                    onClick={() => setSoundType('ghibli')}
                  >
                    <Music className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-medium">Ghibli</div>
                      <div className="text-xs text-muted-foreground">Calm piano music</div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant={soundType === 'rain' ? "default" : "outline"} 
                    className="flex items-center justify-center gap-2 py-6"
                    onClick={() => setSoundType('rain')}
                  >
                    <CloudRain className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-medium">Rain</div>
                      <div className="text-xs text-muted-foreground">Gentle rainfall</div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant={soundType === 'thunder' ? "default" : "outline"} 
                    className="flex items-center justify-center gap-2 py-6"
                    onClick={() => setSoundType('thunder')}
                  >
                    <CloudLightning className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-medium">Thunder</div>
                      <div className="text-xs text-muted-foreground">Distant storm</div>
                    </div>
                  </Button>
                  
                  <Button 
                    variant={soundType === 'fire' ? "default" : "outline"} 
                    className="flex items-center justify-center gap-2 py-6"
                    onClick={() => setSoundType('fire')}
                  >
                    <Flame className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-medium">Fireplace</div>
                      <div className="text-xs text-muted-foreground">Crackling logs</div>
                    </div>
                  </Button>
                </div>
                
                {/* Volume control */}
                <div className="flex items-center space-x-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Slider
                    value={[volume]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => setVolume(value[0])}
                    className="flex-1"
                  />
                  <span className="w-10 text-right text-xs text-muted-foreground shrink-0">
                    {volume}%
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setSoundType('none')}
                >
                  No Sound
                </Button>
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
                    <h3 className="text-lg font-medium mb-2">Focus Duration</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      How long do you want to focus today?
                    </p>
                    
                    <Select 
                      value={focusHours.toString()} 
                      onValueChange={(value) => setFocusHours(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select hours" />
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
                  
                  <div className="pt-2 border-t border-border">
                    <h3 className="text-lg font-medium mb-2">Your Focus Plan</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Focus sessions:</span>
                        <span className="font-medium">{focusStrategy.totalSessions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Session length:</span>
                        <span className="font-medium">{focusStrategy.focusMinutes} minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Break length:</span>
                        <span className="font-medium">{focusStrategy.breakMinutes} minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total time:</span>
                        <span className="font-medium">{focusStrategy.totalHours} hours</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Dialog footer */}
          <DialogFooter className="flex items-center justify-between mt-4 pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground">
              {soundType !== 'none' ? `Playing: ${soundType}` : 'Sound off'}
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="sm">
                <X className="h-4 w-4 mr-1" />
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}