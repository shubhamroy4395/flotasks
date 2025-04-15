/**
 * Fix for progress bars in the daily summary component
 * This file is imported directly in the DailySummary component
 */

export function fixProgressBars() {
  // Run on next tick to ensure DOM is ready
  setTimeout(() => {
    // Fix all progress bars in the document
    const progressBars = document.querySelectorAll('[role="progressbar"] > div > div');
    
    if (progressBars.length === 0) {
      // If no progress bars found, try again in 100ms
      setTimeout(fixProgressBars, 100);
      return;
    }

    // Get all progress root elements to directly fetch their value
    const progressRoots = document.querySelectorAll('[role="progressbar"]');
    const progressValues = new Map();
    
    // Extract values from progress roots
    progressRoots.forEach(root => {
      // Attempt to get the value from the aria-valuenow attribute
      let value = root.getAttribute('aria-valuenow');
      if (value) {
        progressValues.set(root, parseFloat(value));
      } else {
        // Try to extract from style
        const indicator = root.querySelector('div > div');
        if (indicator) {
          const style = window.getComputedStyle(indicator);
          const transform = style.transform || style.webkitTransform;
          if (transform && transform.includes('translateX')) {
            // Extract value from transform
            const match = transform.match(/translateX\(-?(\d+(?:\.\d+)?)%\)/);
            if (match) {
              const translateValue = parseFloat(match[1]);
              const percentage = 100 - translateValue;
              progressValues.set(root, percentage);
            }
          } else if (indicator.style.width) {
            // Extract from width if set directly
            const width = indicator.style.width;
            const percentage = parseFloat(width);
            if (!isNaN(percentage)) {
              progressValues.set(root, percentage);
            }
          }
        }
      }
    });

    progressBars.forEach(bar => {
      // Get the parent progress element
      let progressRoot = bar.closest('[role="progressbar"]');
      let value = progressValues.get(progressRoot) || 0;
      
      // Ensure the bar has correct styling with !important flags
      bar.style.setProperty('position', 'absolute', 'important');
      bar.style.setProperty('height', '100%', 'important');
      bar.style.setProperty('left', '0', 'important');
      bar.style.setProperty('top', '0', 'important');
      bar.style.setProperty('border-radius', '9999px', 'important');
      
      // Directly set width based on value (crucial fix for animation)
      bar.style.setProperty('width', `${value}%`, 'important');
      bar.style.setProperty('transform', 'none', 'important'); // Remove any transform that might be interfering
      bar.style.setProperty('transition', 'width 0.3s ease', 'important');
      
      // Find what type of card the progress bar is in
      let parent = bar.parentElement;
      while (parent && !Array.from(parent.classList || []).some(c => c.includes('progress-card-'))) {
        parent = parent.parentElement;
        if (!parent) break;
      }
      
      if (parent) {
        const classes = Array.from(parent.classList || []);
        
        // Apply specific styles based on card type with !important
        if (classes.some(c => c.includes('progress-card-blue'))) {
          bar.style.setProperty('background', 'linear-gradient(90deg, #3b82f6, #2563eb)', 'important');
          bar.style.setProperty('box-shadow', '0 0 10px rgba(59, 130, 246, 0.3)', 'important');
        } else if (classes.some(c => c.includes('progress-card-green'))) {
          bar.style.setProperty('background', 'linear-gradient(90deg, #10b981, #059669)', 'important');
          bar.style.setProperty('box-shadow', '0 0 10px rgba(16, 185, 129, 0.3)', 'important');
        } else if (classes.some(c => c.includes('progress-card-purple'))) {
          bar.style.setProperty('background', 'linear-gradient(90deg, #8b5cf6, #7c3aed)', 'important');
          bar.style.setProperty('box-shadow', '0 0 10px rgba(139, 92, 246, 0.3)', 'important');
        } else if (classes.some(c => c.includes('progress-card-amber'))) {
          bar.style.setProperty('background', 'linear-gradient(90deg, #f59e0b, #d97706)', 'important');
          bar.style.setProperty('box-shadow', '0 0 10px rgba(245, 158, 11, 0.3)', 'important');
        } else {
          // Default to primary color if no specific card type found
          bar.style.setProperty('background', 'var(--primary, hsl(222.2 47.4% 11.2%))', 'important');
        }
      }
    });
  }, 0);
}

// Setup a MutationObserver to watch for DOM changes
export function setupProgressBarObserver() {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') {
    return;
  }
  
  // Create an observer instance that will monitor both attribute and DOM changes
  const observer = new MutationObserver((mutations) => {
    // Check if any mutation involves a progress bar or its value
    const shouldFix = mutations.some(mutation => {
      // Look for attribute changes to aria-valuenow
      if (mutation.type === 'attributes' && 
          mutation.attributeName === 'aria-valuenow' &&
          mutation.target.hasAttribute('role') &&
          mutation.target.getAttribute('role') === 'progressbar') {
        return true;
      }
      
      // Look for changes to progress bar elements
      if (mutation.type === 'childList') {
        return Array.from(mutation.addedNodes).some(node => {
          return node.nodeType === Node.ELEMENT_NODE && 
                (node.querySelector('[role="progressbar"]') || 
                 node.hasAttribute('role') && 
                 node.getAttribute('role') === 'progressbar');
        });
      }
      
      return false;
    });
    
    if (shouldFix) {
      fixProgressBars();
    }
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-valuenow', 'style']
  });
  
  return observer;
}

// Auto-run the fix when this module is imported
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    fixProgressBars();
    setupProgressBarObserver();
    
    // Run again after a delay to catch any late-rendered components
    setTimeout(fixProgressBars, 500);
    setTimeout(fixProgressBars, 1000);
    
    // Also run when task completion toggles might have happened
    document.addEventListener('click', (e) => {
      // Check if clicked element might be a task checkbox or completion toggle
      if (e.target && 
         (e.target.type === 'checkbox' || 
          e.target.closest('[role="checkbox"]') ||
          e.target.closest('.task-item') ||
          e.target.closest('.goal-item'))) {
        // Wait a moment for the state to update
        setTimeout(fixProgressBars, 50);
      }
    });
  });
} 