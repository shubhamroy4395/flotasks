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
      
      // Create 8 cloud elements with varied styles
      for (let i = 0; i < 8; i++) {
        const cloud = document.createElement('div');
        
        // Create more vibrant clouds with varied colors
        const cloudColors = [
          'rgba(255, 255, 255, 0.8)', 
          'rgba(220, 255, 230, 0.75)', 
          'rgba(200, 255, 200, 0.7)'
        ];
        
        cloud.className = 'absolute rounded-full';
        cloud.style.backgroundColor = cloudColors[Math.floor(Math.random() * cloudColors.length)];
        cloud.style.width = `${50 + Math.random() * 60}px`;
        cloud.style.height = `${30 + Math.random() * 30}px`;
        cloud.style.top = `${Math.random() * 100}%`;
        cloud.style.left = `-100px`;
        cloud.style.zIndex = '50';
        cloud.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.5)';
        cloud.style.filter = 'blur(1px)';
        cloudContainer.appendChild(cloud);
      }
      
      // Animate clouds with anime.js - more varied and fluid motion
      anime({
        targets: cloudContainer.children,
        translateX: window.innerWidth + 200,
        translateY: anime.stagger([-20, 20]),
        delay: anime.stagger(800),
        duration: function() { return 12000 + anime.random(3000, 8000); },
        loop: true,
        easing: 'easeInOutQuad',
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
      
      // Create more snowflake elements with varied appearance
      for (let i = 0; i < 30; i++) {
        const snowflake = document.createElement('div');
        
        // Use different colors for a more dramatic winter effect
        const snowColors = [
          'rgba(255, 255, 255, 0.9)', 
          'rgba(210, 235, 255, 0.85)', 
          'rgba(190, 220, 255, 0.9)'
        ];
        
        snowflake.className = 'absolute rounded-full';
        snowflake.style.backgroundColor = snowColors[Math.floor(Math.random() * snowColors.length)];
        snowflake.style.width = `${2 + Math.random() * 4}px`;
        snowflake.style.height = snowflake.style.width;
        snowflake.style.opacity = `${0.7 + Math.random() * 0.3}`;
        snowflake.style.top = `-10px`;
        snowflake.style.left = `${Math.random() * 100}%`;
        snowflake.style.zIndex = '50';
        snowflake.style.boxShadow = '0 0 3px rgba(255, 255, 255, 0.6)';
        snowContainer.appendChild(snowflake);
      }
      
      // Animate snowflakes with anime.js - more varied and realistic falling
      anime({
        targets: snowContainer.children,
        translateY: window.innerHeight + 20,
        translateX: anime.stagger([-25, 25], {from: 'center', grid: 'stagger'}),
        rotate: function() { return anime.random(-360, 360); },
        duration: function() { return 5000 + anime.random(3000, 8000); },
        delay: anime.stagger(200),
        loop: true,
        easing: 'easeInOutQuad',
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