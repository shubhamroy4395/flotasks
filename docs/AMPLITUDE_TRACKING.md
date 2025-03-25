# Amplitude Analytics Implementation Documentation

## Overview

This document provides a comprehensive guide to how Amplitude Analytics is implemented in the Flo Tasks application. Amplitude is used to track user interactions and application performance metrics to help improve the user experience and identify areas for optimization.

## Setup and Initialization

The Amplitude integration is initialized in the `client/src/lib/amplitude.ts` file. This is the core module that provides tracking capabilities to the rest of the application.

```typescript
// Imported from @amplitude/analytics-browser
import { init, track } from '@amplitude/analytics-browser';

// Initialize Amplitude with your API key
export function initializeAmplitude() {
  // Only initialize in production or if specifically enabled in development
  if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_ANALYTICS) {
    init(import.meta.env.VITE_AMPLITUDE_API_KEY, {
      // Optional configuration parameters
      logLevel: import.meta.env.DEV ? 'Debug' : 'Error',
      defaultTracking: {
        sessions: true,
        pageViews: true,
        formInteractions: true,
        fileDownloads: true
      }
    });
    
    console.log('Amplitude initialized successfully');
  }
}
```

## Event Catalogue

All tracking events are centralized in the `Events` object within `client/src/lib/amplitude.ts`. This ensures consistency in event naming across the application and provides a single source of truth for all analytics events.

```typescript
export const Events = {
  // Authentication events
  Auth: {
    LOGIN: 'Auth.Login',
    REGISTER: 'Auth.Register',
    LOGOUT: 'Auth.Logout',
    GOOGLE_LOGIN: 'Auth.GoogleLogin',
  },
  
  // Task management events
  Task: {
    CREATE: 'Task.Create',
    COMPLETE: 'Task.Complete',
    DELETE: 'Task.Delete',
    UPDATE: 'Task.Update',
    PRIORITIZE: 'Task.Prioritize',
  },
  
  // Mood tracking events
  Mood: {
    SELECT: 'Mood.Select',
    UPDATE: 'Mood.Update',
  },
  
  // Gratitude journal events
  Gratitude: {
    ADD: 'Gratitude.Add',
    DELETE: 'Gratitude.Delete',
  },
  
  // Notes events
  Notes: {
    CREATE: 'Notes.Create',
    DELETE: 'Notes.Delete',
  },
  
  // Page and navigation events
  Page: {
    VIEW: 'Page.View',
    HOME_LOAD: 'Page.HomeLoad',
  },
  
  // Performance metrics
  Performance: {
    COMPONENT_RENDER: 'Performance.ComponentRender',
  },
  
  // API requests
  API: {
    SUCCESS: 'API.Success',
    ERROR: 'API.Error',
    FETCH_TASKS: 'API.FetchTasks',
    FETCH_MOOD: 'API.FetchMood',
    FETCH_GRATITUDE: 'API.FetchGratitude',
    FETCH_NOTES: 'API.FetchNotes',
  },
  
  // UI interactions
  UI: {
    TOGGLE_THEME: 'UI.ToggleTheme',
    SIDEBAR_TOGGLE: 'UI.SidebarToggle',
    MODAL_OPEN: 'UI.ModalOpen',
    MODAL_CLOSE: 'UI.ModalClose',
  }
};
```

## Tracking Function

The main tracking function is `trackEvent` which is also defined in `client/src/lib/amplitude.ts`:

```typescript
export const trackEvent = (
  eventName: string, 
  eventProperties?: Record<string, any>,
  callback?: () => void
) => {
  // Only track if in production or if analytics is explicitly enabled
  if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_ANALYTICS) {
    try {
      track(eventName, eventProperties);
      console.debug(`[Analytics] Tracked event: ${eventName}`, eventProperties);
      
      if (callback) {
        callback();
      }
    } catch (error) {
      console.error(`[Analytics] Error tracking event ${eventName}:`, error);
    }
  } else {
    // In development, just log the event without sending to Amplitude
    console.debug(`[Analytics-Dev] Event: ${eventName}`, eventProperties);
    
    if (callback) {
      callback();
    }
  }
};
```

## Performance Tracking Integration

Performance metrics are tracked using the `performance.ts` module which integrates with Amplitude.

```typescript
// client/src/lib/performance.ts
import { trackEvent } from './amplitude';

interface PerformanceMetric {
  operationName: string;
  duration: number;
  timestamp: number;
}

const metrics: PerformanceMetric[] = [];
const timers: Record<string, number> = {};

export function startTimer(operationName: string): void {
  timers[operationName] = performance.now();
}

export function endTimer(operationName: string, eventName?: string): number {
  const startTime = timers[operationName];
  if (!startTime) {
    console.warn(`No timer found for operation: ${operationName}`);
    return 0;
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  // Store the metric for later analysis
  metrics.push({
    operationName,
    duration,
    timestamp: Date.now()
  });
  
  // Log the performance metric
  console.log(`[Performance] ${operationName}: ${duration.toFixed(2)}ms`);
  
  // Optionally track the performance metric in Amplitude
  if (eventName) {
    trackEvent(eventName, {
      duration,
      operation: operationName
    });
  }
  
  delete timers[operationName];
  return duration;
}

// Function wrapper to time any operation
export function withTiming<T extends (...args: any[]) => any>(
  fn: T, 
  operationName: string, 
  eventName?: string
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    startTimer(operationName);
    const result = fn(...args);
    
    // Handle both synchronous and asynchronous functions
    if (result instanceof Promise) {
      return result.finally(() => {
        endTimer(operationName, eventName);
      }) as ReturnType<T>;
    } else {
      endTimer(operationName, eventName);
      return result;
    }
  };
}
```

## React Component Performance Monitoring

A specialized component called `PerformanceMonitor` is used to track render performance of React components:

```typescript
// client/src/components/performance-monitor.tsx
import React, { useEffect } from 'react';
import { startTimer, endTimer } from '@/lib/performance';
import { Events } from '@/lib/amplitude';

interface PerformanceMonitorProps {
  componentName: string;
  children: React.ReactNode;
}

export function PerformanceMonitor({ componentName, children }: PerformanceMonitorProps) {
  useEffect(() => {
    const timerKey = `render_${componentName}`;
    startTimer(timerKey);
    
    return () => {
      endTimer(timerKey, Events.Performance.COMPONENT_RENDER);
    };
  }, [componentName]);
  
  return <>{children}</>;
}
```

## How Events Are Used in Different Components

### Authentication Tracking

In the `client/src/contexts/auth-context.tsx` file, authentication events are tracked:

```typescript
import { Events, trackEvent } from '@/lib/amplitude';

// Inside login function
const handleLogin = async (credentials) => {
  try {
    const response = await apiRequest('POST', '/api/auth/login', credentials);
    
    // Track successful login
    trackEvent(Events.Auth.LOGIN, {
      method: 'email',
      success: true
    });
    
    return response;
  } catch (error) {
    // Track failed login
    trackEvent(Events.Auth.LOGIN, {
      method: 'email',
      success: false,
      error: error.message
    });
    
    throw error;
  }
};
```

### Task Management Tracking

In the task store (`client/src/stores/taskStore.ts`), task-related events are tracked:

```typescript
import { Events, trackEvent } from '@/lib/amplitude';

// Inside addTask function
const addTask = async (task) => {
  try {
    // Create task implementation...
    
    // Track successful task creation
    trackEvent(Events.Task.CREATE, {
      category: task.category,
      priority: task.priority,
      hasDeadline: !!task.eta
    });
    
    return newTask;
  } catch (error) {
    // Error handling...
  }
};

// Inside toggleComplete function
const toggleComplete = async (id, category) => {
  try {
    // Toggle task implementation...
    
    // Track task completion
    trackEvent(Events.Task.COMPLETE, {
      taskId: id,
      category: category,
      newState: !task.completed
    });
    
    // Rest of implementation...
  } catch (error) {
    // Error handling...
  }
};
```

### API Performance Tracking

In the API client (`client/src/lib/queryClient.ts`), API calls are timed and tracked:

```typescript
import { startTimer, endTimer } from '@/lib/performance';
import { Events, trackEvent } from '@/lib/amplitude';

export async function apiRequest(method, url, data) {
  const requestId = generateId();
  const timerKey = `api_${requestId}`;
  
  startTimer(timerKey);
  
  try {
    // API request implementation...
    const response = await fetch(url, options);
    
    const duration = endTimer(timerKey);
    
    // Track API success
    trackEvent(Events.API.SUCCESS, {
      url,
      method,
      duration,
      status: response.status
    });
    
    return response;
  } catch (error) {
    const duration = endTimer(timerKey);
    
    // Track API error
    trackEvent(Events.API.ERROR, {
      url,
      method,
      duration,
      error: error.message
    });
    
    throw error;
  }
}
```

## Best Practices for Amplitude Usage

1. **Centralized Event Definitions**: Always use the centralized `Events` object for event names to maintain consistency.

2. **Semantic Naming**: Use descriptive, hierarchical event names (e.g., `Category.Action`) to make analysis easier.

3. **Consistent Properties**: Standardize property names across similar events.

4. **Error Tracking**: Track both successful and failed operations, with appropriate properties to distinguish them.

5. **Performance Monitoring**: Use the performance tracking utilities for any operation that might impact user experience.

6. **Development Mode**: During development, use the console logs to verify that events are being fired correctly.

7. **Event Batching**: For high-frequency events, consider batching them to reduce network traffic.

8. **User Properties**: Set user properties once identified to segment analysis by user type.

9. **Privacy Considerations**: Never track personally identifiable information (PII) unless explicitly permitted.

10. **Documentation**: Keep this document updated whenever new events are added or existing ones are modified.

## Common Debugging Techniques

If Amplitude tracking isn't working as expected, check:

1. Is Amplitude initialized with a valid API key?
2. Are you seeing the console debug logs for tracked events?
3. Is the condition for tracking in production being met?
4. Are there any errors in the console related to Amplitude?

You can enable debugging for Amplitude by setting:

```typescript
import { init, setLogLevel } from '@amplitude/analytics-browser';

// During initialization
init(API_KEY, {
  logLevel: 'Debug'
});

// Or anywhere in your code
setLogLevel('Debug');
```

## Amplitude Dashboard Access

To access the Amplitude dashboard for this project, contact the project administrator for credentials. The dashboard URL is: https://analytics.amplitude.com/

## Future Enhancements

Potential improvements to our Amplitude implementation:

1. Implement session tracking across page reloads
2. Add user journey tracking for common user flows
3. Create funnel analysis for conversion paths
4. Set up automatic anomaly detection for key metrics
5. Integrate A/B testing capabilities