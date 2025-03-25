# Amplitude Implementation in Flo Tasks

This document details the actual implementation of Amplitude analytics in the Flo Tasks application. It provides real-world code examples and usage patterns from our codebase.

## Core Implementation

### Initialize Amplitude (`client/src/lib/amplitude.ts`)

```typescript
import * as amplitude from '@amplitude/analytics-browser';

// Initialize Amplitude with project key
amplitude.init('ad21a3a1e9ba786379ac4ae8a6fdb010', {
  defaultTracking: {
    sessions: true,
    pageViews: true,
    formInteractions: true,
    fileDownloads: true,
  }
});
```

### Event Catalogue

All our tracking events are categorized in the `Events` object to maintain consistency:

```typescript
export const Events = {
  // Task related events - with specific category tracking
  TaskToday: {
    View: 'TaskToday.View',
    Created: 'TaskToday.Created',
    Completed: 'TaskToday.Completed',
    Edited: 'TaskToday.Edited',
    Deleted: 'TaskToday.Deleted',
    PriorityChanged: 'TaskToday.PriorityChanged',
    TimeSet: 'TaskToday.TimeSet',
    Sorted: 'TaskToday.Sorted'
  },
  TaskOther: {
    View: 'TaskOther.View',
    Created: 'TaskOther.Created',
    Completed: 'TaskOther.Completed',
    Edited: 'TaskOther.Edited',
    Deleted: 'TaskOther.Deleted',
    PriorityChanged: 'TaskOther.PriorityChanged',
    TimeSet: 'TaskOther.TimeSet',
    Sorted: 'TaskOther.Sorted'
  },
  Mood: {
    SectionOpen: 'Mood.SectionOpen',
    Selected: 'Mood.Selected'
  },
  Gratitude: {
    SectionOpen: 'Gratitude.SectionOpen',
    Added: 'Gratitude.Added',
    Deleted: 'Gratitude.Deleted',
    Created: 'Gratitude.Created' // For consistency with Notes
  },
  Notes: {
    SectionOpen: 'Notes.SectionOpen',
    Created: 'Notes.Created',
    Deleted: 'Notes.Deleted'
  },
  Performance: {
    ComponentMount: 'Performance.ComponentMount',
    ApiCall: 'Performance.ApiCall',
    SaveOperation: 'Performance.SaveOperation',
    DeleteOperation: 'Performance.DeleteOperation'
  },
  UI: {
    ModalOpened: 'UI.ModalOpened',
    ModalClosed: 'UI.ModalClosed',
    ThemeChanged: 'UI.ThemeChanged',
    FilterApplied: 'UI.FilterApplied',
    SortChanged: 'UI.SortChanged',
    KeyboardShortcut: 'UI.KeyboardShortcut',
    Login: 'UI.Login',
    Logout: 'UI.Logout',
    Register: 'UI.Register',
    GoogleLogin: 'UI.GoogleLogin',
    AuthError: 'UI.AuthError'
  },
  Reminder: {
    SectionOpen: 'Reminder.SectionOpen',
    Set: 'Reminder.Set',
    Completed: 'Reminder.Completed',
    Deleted: 'Reminder.Deleted'
  }
};
```

### Track Event Function

Our central tracking function that adds common properties to all events:

```typescript
export const trackEvent = (
  eventName: string, 
  eventProperties?: Record<string, any>
) => {
  // Add common properties to all events
  const commonProps = {
    metadata: {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      sessionId: Date.now().toString(),
    },
    timing: {
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      isWeekend: [0, 6].includes(new Date().getDay()),
      hour: new Date().getHours(),
      minute: new Date().getMinutes(),
      timeframe: new Date().getHours() < 12 ? 'morning' : 
                new Date().getHours() < 17 ? 'afternoon' : 'evening'
    }
  };

  amplitude.track(eventName, {
    ...commonProps,
    ...eventProperties
  });
};
```

## Performance Monitoring

### Timer Functions (`client/src/lib/performance.ts`)

Our application uses custom timers to track performance:

```typescript
// Map to store the start time of each tracked operation
const operationTimers = new Map<string, number>();

// Store performance metrics for analysis
interface PerformanceMetric {
  operationName: string;
  duration: number;
  timestamp: number;
}

const recentMetrics: PerformanceMetric[] = [];
const MAX_METRICS = 100; // Keep the most recent metrics

export function startTimer(operationName: string): void {
  operationTimers.set(operationName, performance.now());
}

export function endTimer(operationName: string, eventName?: string): number {
  const startTime = operationTimers.get(operationName);
  if (startTime === undefined) {
    // Don't warn in production
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`No timer started for operation: ${operationName}`);
    }
    return 0;
  }

  const endTime = performance.now();
  const duration = endTime - startTime;
  
  // Store metric for analysis
  recentMetrics.push({
    operationName,
    duration,
    timestamp: Date.now()
  });
  
  // Keep only the most recent metrics
  if (recentMetrics.length > MAX_METRICS) {
    recentMetrics.shift();
  }
  
  // Log to console for debugging (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Performance] ${operationName}: ${duration.toFixed(2)}ms`);
  }
  
  // Track in analytics if event name is provided and duration > 50ms
  // Only track meaningful performance metrics to avoid noise
  if (eventName && duration > 50) {
    trackEvent(eventName, {
      operation: operationName,
      duration_ms: Math.round(duration),
    });
  }
  
  // Remove the timer
  operationTimers.delete(operationName);
  
  return duration;
}
```

### Performance Monitoring Component

A specialized React component for tracking render times:

```typescript
import React, { useEffect } from 'react';
import { startTimer, endTimer } from '@/lib/performance';

interface PerformanceMonitorProps {
  componentName: string;
  children: React.ReactNode;
}

/**
 * A wrapper component that measures the rendering performance of its children
 */
export function PerformanceMonitor({ componentName, children }: PerformanceMonitorProps) {
  const operationName = `render_${componentName}`;
  
  useEffect(() => {
    startTimer(operationName);
    
    return () => {
      endTimer(operationName, `UI.Component.${componentName}`);
    };
  }, [componentName, operationName]);

  return <>{children}</>;
}
```

## Tracking in Hooks

### Keyboard Shortcuts Tracking (`client/src/hooks/use-keyboard-shortcuts.ts`)

Example of tracking keyboard shortcut usage:

```typescript
import { useEffect } from 'react';
import { trackEvent } from '@/lib/amplitude';

// ...

export function useKeyboardShortcuts(handlers: ShortcutHandlers, options: KeyboardOptions = {}) {
  const { enabled = true, trackingPrefix = '' } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const startTime = performance.now();

      // Add new item: Ctrl/Cmd + N
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handlers.addNewItem?.();
        trackKeyboardShortcut('new_item', startTime);
      }

      // ...other shortcuts...
    };

    const trackKeyboardShortcut = (action: string, startTime: number) => {
      const endTime = performance.now();
      trackEvent('Keyboard.Shortcut.Used', {
        action: `${trackingPrefix}${action}`,
        component: trackingPrefix || 'global',
        responseTime: endTime - startTime
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handlers, trackingPrefix]);
}
```

### AutoSave Tracking (`client/src/hooks/use-auto-save.ts`)

Tracking content changes with auto-save:

```typescript
import { useCallback, useRef } from 'react';
import debounce from 'lodash/debounce';
import { trackEvent } from '@/lib/amplitude';

interface AutoSaveOptions {
  onSave: (content: string, metadata?: Record<string, any>) => Promise<void>;
  trackingEvent?: string;
  debounceMs?: number;
}

export function useAutoSave({ onSave, trackingEvent, debounceMs = 1000 }: AutoSaveOptions) {
  const savingRef = useRef(false);
  const lastSavedContentRef = useRef("");

  const saveContent = useCallback(async (content: string, metadata?: Record<string, any>) => {
    if (!content.trim() || savingRef.current) return;

    savingRef.current = true;
    try {
      await onSave(content.trim(), metadata);

      // Only track if content has changed
      if (content.trim() !== lastSavedContentRef.current && trackingEvent) {
        trackEvent(trackingEvent, {
          contentLength: content.length,
          wordCount: content.trim().split(/\s+/).length,
          hasMetadata: !!metadata,
          ...metadata
        });
      }

      lastSavedContentRef.current = content.trim();
    } finally {
      savingRef.current = false;
    }
  }, [onSave, trackingEvent]);

  // ...rest of the hook...
}
```

## Common Tracking Properties

Every event in our application includes these common properties automatically:

```typescript
{
  metadata: {
    timestamp: string,       // ISO timestamp
    userAgent: string,       // Browser user-agent
    screenWidth: number,     // Viewport width
    screenHeight: number,    // Viewport height
    timezone: string,        // User's timezone
    sessionId: string        // Generated session ID
  },
  timing: {
    timeOfDay: number,       // Hour of day (0-23)
    dayOfWeek: number,       // Day of week (0-6)
    isWeekend: boolean,      // Whether it's a weekend
    hour: number,            // Current hour
    minute: number,          // Current minute
    timeframe: string        // 'morning', 'afternoon', or 'evening'
  }
}
```

## Analysis Patterns

Here are some common analysis patterns we use with our Amplitude data:

1. Task Completion Rate:
   ```
   WHERE eventType = 'TaskToday.Completed'
   GROUP BY timeframe
   ```

2. Feature Usage by Time of Day:
   ```
   GROUP BY timing.timeframe
   ```

3. Performance by Component:
   ```
   WHERE eventType LIKE 'UI.Component.%'
   GROUP BY operation
   AVERAGE(duration_ms)
   ```

4. User Journey:
   ```
   FUNNEL(
     TaskToday.View,
     TaskToday.Created,
     TaskToday.Completed
   )
   ```

## Testing and Debugging

To debug tracking in the browser console, you can look for:

1. `[Performance]` prefixed logs that show component render and operation times
2. `[TASK_STORE]` and similar logs that show state operations
3. `[TASK_DELETE]` logs that specifically track deletion operations

During development, all tracking events are logged to the console but not sent to Amplitude unless explicitly enabled.