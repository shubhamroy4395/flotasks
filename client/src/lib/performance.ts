import { trackEvent } from './amplitude';

// Map to store the start time of each tracked operation
const operationTimers = new Map<string, number>();

/**
 * Start timing an operation
 * @param operationName Unique identifier for the operation being timed
 */
export function startTimer(operationName: string): void {
  operationTimers.set(operationName, performance.now());
}

/**
 * End timing an operation and log the results
 * @param operationName Unique identifier for the operation being timed
 * @param eventName Optional event name for tracking in analytics
 * @returns The duration in milliseconds
 */
export function endTimer(operationName: string, eventName?: string): number {
  const startTime = operationTimers.get(operationName);
  if (startTime === undefined) {
    console.warn(`No timer started for operation: ${operationName}`);
    return 0;
  }

  const endTime = performance.now();
  const duration = endTime - startTime;
  
  // Log to console for debugging
  console.log(`[Performance] ${operationName}: ${duration.toFixed(2)}ms`);
  
  // Track in analytics if event name is provided
  if (eventName) {
    trackEvent(eventName, {
      operation: operationName,
      duration_ms: Math.round(duration),
    });
  }
  
  // Remove the timer
  operationTimers.delete(operationName);
  
  return duration;
}

/**
 * Creates a tracking wrapper for any function
 * @param fn The function to wrap
 * @param operationName Name for the operation being timed
 * @param eventName Optional event name for tracking in analytics
 * @returns Wrapped function with timing
 */
export function withTiming<T extends (...args: any[]) => any>(
  fn: T, 
  operationName: string,
  eventName?: string
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    startTimer(operationName);
    const result = fn(...args);
    
    // Handle promises specially
    if (result instanceof Promise) {
      return result
        .then((value) => {
          endTimer(operationName, eventName);
          return value;
        })
        .catch((error) => {
          endTimer(operationName, eventName);
          throw error;
        }) as ReturnType<T>;
    }
    
    endTimer(operationName, eventName);
    return result;
  };
}

// Remove React component wrapping as it's not needed yet