import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary progress-bar-root",
      className
    )}
    {...props}
    aria-valuenow={value || 0}
  >
    <div className="w-full h-full overflow-hidden rounded-full progress-bar-container">
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-primary transition-all progress-bar-indicator"
        style={{ 
          transform: `translateX(-${100 - (value || 0)}%)`,
          width: `${value || 0}%`,
        }}
        data-value={value || 0}
      />
    </div>
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
