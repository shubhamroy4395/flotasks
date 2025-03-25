import { trackEvent } from './amplitude';

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

/**
 * Get performance summary for analysis
 * Returns a summary of recent performance metrics
 */
export function getPerformanceSummary() {
  const summary: Record<string, { count: number, total: number, average: number, max: number }> = {};
  
  // Process all metrics
  recentMetrics.forEach(metric => {
    if (!summary[metric.operationName]) {
      summary[metric.operationName] = { count: 0, total: 0, average: 0, max: 0 };
    }
    
    const entry = summary[metric.operationName];
    entry.count++;
    entry.total += metric.duration;
    entry.average = entry.total / entry.count;
    entry.max = Math.max(entry.max, metric.duration);
  });
  
  return summary;
}

/**
 * Clear all performance metrics
 */
export function clearPerformanceMetrics() {
  recentMetrics.length = 0;
  operationTimers.clear();
}