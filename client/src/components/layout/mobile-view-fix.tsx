import { useEffect } from 'react';

/**
 * MobileViewFix - Fixes common mobile view issues in production
 * This is especially important for viewport height and Safari behavior on iOS
 */
export function MobileViewFix() {
  useEffect(() => {
    // Fix for iOS Safari viewport height issues
    const fixViewportHeight = () => {
      // First set a fallback based on window inner height
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // Then use a more accurate calculation for iOS devices after a small delay
      setTimeout(() => {
        // Get the viewport height and multiply by 1% to get a CSS vh unit
        const vh = window.innerHeight * 0.01;
        // Set the --vh custom property with the value
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      }, 100);
    };
    
    // Fix for handling keyboard opening on mobile
    const handleResize = () => {
      fixViewportHeight();
      
      // Add overflow handling when keyboard is open
      if (window.innerHeight < window.innerWidth * 1.2) {
        document.body.classList.add('keyboard-open');
      } else {
        document.body.classList.remove('keyboard-open');
      }
    };
    
    // Add media query tracking for smaller viewports
    const setupMobileMediaQuery = () => {
      const phoneMediaQuery = window.matchMedia('(max-width: 768px)');
      const smallPhoneMediaQuery = window.matchMedia('(max-width: 375px)');
      
      // Add device-specific classes to the HTML element
      const updateDeviceClasses = () => {
        if (smallPhoneMediaQuery.matches) {
          document.documentElement.classList.add('is-small-phone');
        } else {
          document.documentElement.classList.remove('is-small-phone');
        }
        
        if (phoneMediaQuery.matches) {
          document.documentElement.classList.add('is-phone');
        } else {
          document.documentElement.classList.remove('is-phone');
        }
      };
      
      // Initial setup
      updateDeviceClasses();
      
      // Setup listeners
      phoneMediaQuery.addEventListener('change', updateDeviceClasses);
      smallPhoneMediaQuery.addEventListener('change', updateDeviceClasses);
      
      return () => {
        phoneMediaQuery.removeEventListener('change', updateDeviceClasses);
        smallPhoneMediaQuery.removeEventListener('change', updateDeviceClasses);
      };
    };
    
    // Prevent zoom on focus for input elements on iOS
    const addMetaViewport = () => {
      // For iPhone/iOS to prevent automatic zoom on input focus
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');
      }
    };
    
    // Fix to ensure scrolling works correctly
    const setupOverflowHandling = () => {
      document.documentElement.classList.add('overflow-fix');
      document.body.classList.add('overflow-fix');
    };
    
    // Run all fixes
    fixViewportHeight();
    const cleanupMediaQuery = setupMobileMediaQuery();
    addMetaViewport();
    setupOverflowHandling();
    
    // Set up event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      cleanupMediaQuery();
    };
  }, []);
  
  // Component returns null as it's just for side effects
  return null;
}

export default MobileViewFix; 