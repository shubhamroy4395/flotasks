import React, { useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  Sun, 
  Moon, 
  Cloud, 
  Snowflake, 
  Palette
} from "lucide-react";
import { motion } from "framer-motion";
import anime from "animejs";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function EnhancedThemeToggle() {
  const { theme, setTheme } = useTheme();
  const animationRef = useRef<HTMLDivElement>(null);
  const springAnimationRef = useRef<HTMLDivElement>(null);
  const winterAnimationRef = useRef<HTMLDivElement>(null);
  
  // Handle spring animation with anime.js
  useEffect(() => {
    if (theme === 'spring' && springAnimationRef.current) {
      // Create clouds from div elements inside the container
      const cloudContainer = springAnimationRef.current;
      cloudContainer.innerHTML = ''; // Clear previous clouds
      
      // Create 5 cloud elements
      for (let i = 0; i < 5; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'absolute opacity-70 bg-white rounded-full';
        cloud.style.width = `${40 + Math.random() * 40}px`;
        cloud.style.height = `${20 + Math.random() * 20}px`;
        cloud.style.top = `${Math.random() * 100}%`;
        cloud.style.left = `-100px`;
        cloud.style.zIndex = '50';
        cloudContainer.appendChild(cloud);
      }
      
      // Animate clouds with anime.js
      anime({
        targets: cloudContainer.children,
        translateX: window.innerWidth + 200,
        delay: anime.stagger(1000),
        duration: 15000,
        loop: true,
        easing: 'linear',
        autoplay: true
      });
    }
    
    // Cleanup animation on component unmount or theme change
    return () => {
      if (springAnimationRef.current) {
        anime.remove(springAnimationRef.current.children);
      }
    };
  }, [theme]);
  
  // Handle winter animation with anime.js
  useEffect(() => {
    if (theme === 'winter' && winterAnimationRef.current) {
      // Create snowflakes from div elements inside the container
      const snowContainer = winterAnimationRef.current;
      snowContainer.innerHTML = ''; // Clear previous snowflakes
      
      // Create 20 snowflake elements
      for (let i = 0; i < 20; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'absolute bg-white rounded-full';
        snowflake.style.width = `${2 + Math.random() * 3}px`;
        snowflake.style.height = snowflake.style.width;
        snowflake.style.opacity = `${0.6 + Math.random() * 0.4}`;
        snowflake.style.top = `-10px`;
        snowflake.style.left = `${Math.random() * 100}%`;
        snowflake.style.zIndex = '50';
        snowContainer.appendChild(snowflake);
      }
      
      // Animate snowflakes with anime.js
      anime({
        targets: snowContainer.children,
        translateY: window.innerHeight + 20,
        translateX: anime.stagger([-15, 15]),
        duration: function() { return 5000 + anime.random(3000, 8000); },
        delay: anime.stagger(300),
        loop: true,
        easing: 'easeInOutSine',
        autoplay: true
      });
    }
    
    // Cleanup animation on component unmount or theme change
    return () => {
      if (winterAnimationRef.current) {
        anime.remove(winterAnimationRef.current.children);
      }
    };
  }, [theme]);

  // Handle theme icon animation
  useEffect(() => {
    if (animationRef.current) {
      anime({
        targets: animationRef.current,
        scale: [0.9, 1.1, 1],
        rotate: [0, 15, 0],
        duration: 600,
        easing: 'easeInOutQuad'
      });
    }
  }, [theme]);

  const getThemeIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon className="h-5 w-5" />;
      case 'spring':
        return <Cloud className="h-5 w-5" />;
      case 'winter':
        return <Snowflake className="h-5 w-5" />;
      default:
        return <Sun className="h-5 w-5" />;
    }
  };

  return (
    <>
      {/* Animation containers for spring and winter */}
      <div 
        ref={springAnimationRef}
        className={`fixed inset-0 pointer-events-none ${theme === 'spring' ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`} 
        aria-hidden="true"
      />
      
      <div 
        ref={winterAnimationRef}
        className={`fixed inset-0 pointer-events-none ${theme === 'winter' ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`} 
        aria-hidden="true"
      />
      
      {/* Theme dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="icon" 
            className="relative bg-background border border-input hover:bg-accent hover:text-accent-foreground"
          >
            <div ref={animationRef} className="flex items-center justify-center">
              {getThemeIcon()}
            </div>
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={() => setTheme('default')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Sun className="h-4 w-4" />
            <span>Default</span>
            {theme === 'default' && (
              <motion.span 
                className="ml-auto h-4 w-4 rounded-full bg-blue-500"
                layoutId="activeTheme"
              />
            )}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setTheme('dark')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Moon className="h-4 w-4" />
            <span>Dark</span>
            {theme === 'dark' && (
              <motion.span 
                className="ml-auto h-4 w-4 rounded-full bg-blue-500"
                layoutId="activeTheme"
              />
            )}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setTheme('spring')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Cloud className="h-4 w-4" />
            <span>Spring</span>
            {theme === 'spring' && (
              <motion.span 
                className="ml-auto h-4 w-4 rounded-full bg-blue-500"
                layoutId="activeTheme"
              />
            )}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setTheme('winter')}
            className="flex items-center gap-2 cursor-pointer" 
          >
            <Snowflake className="h-4 w-4" />
            <span>Winter</span>
            {theme === 'winter' && (
              <motion.span 
                className="ml-auto h-4 w-4 rounded-full bg-blue-500"
                layoutId="activeTheme"
              />
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}