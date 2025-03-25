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