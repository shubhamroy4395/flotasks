import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "./card";

// Import the CardHeader and CardContent from the card component
import { CardHeader, CardContent } from "./card";

export interface ResizableCardProps {
  minWidth?: number;
  minHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  onResize?: (width: number, height: number) => void;
  storageKey?: string;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export function ResizableCard({
  children,
  minWidth = 300,
  minHeight = 100,
  defaultWidth = 400,
  defaultHeight = 400,
  onResize,
  storageKey,
  className = "",
  ...props
}: ResizableCardProps) {
  // Try to get the saved dimensions from localStorage if storageKey is provided
  const getSavedDimensions = () => {
    if (storageKey && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`flo-resizable-${storageKey}`);
        if (saved) {
          const { width, height } = JSON.parse(saved);
          return { width, height };
        }
      } catch (e) {
        console.error("Failed to parse saved dimensions:", e);
      }
    }
    return { width: defaultWidth, height: defaultHeight };
  };

  const [dimensions, setDimensions] = useState(getSavedDimensions);
  const cardRef = useRef<HTMLDivElement>(null);
  const resizing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startDimensions = useRef({ width: 0, height: 0 });

  // Save dimensions to localStorage when they change
  // Using a ref to track previous dimensions to prevent infinite loops
  const previousDimensions = useRef(dimensions);
  
  useEffect(() => {
    // Only update if dimensions actually changed
    if (previousDimensions.current.width !== dimensions.width || 
        previousDimensions.current.height !== dimensions.height) {
      
      previousDimensions.current = dimensions;
      
      if (storageKey && typeof window !== "undefined") {
        localStorage.setItem(
          `flo-resizable-${storageKey}`,
          JSON.stringify(dimensions)
        );
      }
      
      if (onResize) {
        onResize(dimensions.width, dimensions.height);
      }
    }
  }, [dimensions, storageKey, onResize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startDimensions.current = { ...dimensions };

    // Add event listeners for mouse movement and mouse up
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizing.current) return;

    const dx = e.clientX - startPos.current.x;
    
    // Only adjust width, not height, to prevent layout issues
    // Also add a maximum width limit to prevent overlapping
    const containerWidth = cardRef.current?.parentElement?.clientWidth || 800;
    const maxWidth = Math.min(containerWidth - 10, 800); // 10px buffer, absolute max of 800px
    
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startDimensions.current.width + dx));
    // Keep the current height - only adjust height via explicit handle
    const newHeight = startDimensions.current.height;

    setDimensions({ width: newWidth, height: newHeight });
  };

  const handleMouseUp = () => {
    resizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Cleanup event listeners on component unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <Card
      ref={cardRef}
      className={`relative overflow-visible ${className}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
      }}
      {...props}
    >
      {children}

      {/* Resize handle - bottom right corner */}
      <motion.div
        className="absolute bottom-0 right-0 w-4 h-4 bg-primary/20 hover:bg-primary/40 rounded-bl-sm cursor-nwse-resize z-30 flex items-center justify-center"
        whileHover={{ scale: 1.2, opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        onMouseDown={handleMouseDown}
        initial={{ opacity: 0.5 }}
        style={{
          touchAction: "none",
        }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 1L1 9M5 1L1 5M9 5L5 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </Card>
  );
}

// Export the components from Card so they can be used with ResizableCard
export { CardHeader, CardContent };