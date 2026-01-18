import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => void;
  threshold?: number; // Distance in pixels to trigger refresh
  enabled?: boolean; // Whether pull-to-refresh is enabled
}

/**
 * Custom hook for pull-to-refresh functionality on mobile devices
 * Works with both window-level and element-level scrolling
 */
export function usePullToRefresh({ 
  onRefresh, 
  threshold = 80,
  enabled = true 
}: UsePullToRefreshOptions) {
  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);
  const isPulling = useRef(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if element or window is at the top
  const isAtTop = () => {
    // Check window scroll
    const windowAtTop = window.scrollY === 0 || window.pageYOffset === 0;
    
    // Check document body scroll
    const bodyAtTop = document.documentElement.scrollTop === 0 && document.body.scrollTop === 0;
    
    // Check element scroll if it exists
    const element = elementRef.current;
    const elementAtTop = element ? element.scrollTop === 0 : true;
    
    return windowAtTop && bodyAtTop && elementAtTop;
  };

  useEffect(() => {
    if (!enabled) return;

    // Only enable on mobile devices (touch devices)
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isMobile) return;

    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start if we're at the top and touch started near the top of the viewport
      const touchY = e.touches[0].clientY;
      const isNearTop = touchY < 100; // Touch started in top 100px of screen
      
      if (isAtTop() && isNearTop && !isPulling.current && !isRefreshing) {
        touchStartY.current = touchY;
        touchCurrentY.current = touchY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || touchStartY.current === null) return;

      touchCurrentY.current = e.touches[0].clientY;
      const pullDistance = touchCurrentY.current - touchStartY.current;

      // Only allow downward pull when at top
      if (pullDistance > 0 && isAtTop()) {
        // Prevent default scrolling while pulling
        if (pullDistance > 10) {
          e.preventDefault();
        }
      } else {
        // Reset if user scrolls up or page is not at top
        isPulling.current = false;
        touchStartY.current = null;
        touchCurrentY.current = null;
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling.current || touchStartY.current === null || touchCurrentY.current === null) {
        isPulling.current = false;
        touchStartY.current = null;
        touchCurrentY.current = null;
        return;
      }

      const pullDistance = touchCurrentY.current - touchStartY.current;

      // Trigger refresh if threshold is met
      if (pullDistance >= threshold && isAtTop()) {
        setIsRefreshing(true);
        onRefresh();
      }

      // Reset
      isPulling.current = false;
      touchStartY.current = null;
      touchCurrentY.current = null;
    };

    // Also listen on document to catch touches that might start on child elements
    const handleDocumentTouchStart = (e: TouchEvent) => {
      // Only handle if touch started within our element
      const element = elementRef.current;
      if (element && element.contains(e.target as Node)) {
        handleTouchStart(e);
      }
    };

    const handleDocumentTouchMove = (e: TouchEvent) => {
      const element = elementRef.current;
      if (element && (element.contains(e.target as Node) || isPulling.current)) {
        handleTouchMove(e);
      }
    };

    const handleDocumentTouchEnd = (e: TouchEvent) => {
      const element = elementRef.current;
      if (element && (element.contains(e.target as Node) || isPulling.current)) {
        handleTouchEnd();
      }
    };

    // Use capture phase to catch events before they bubble
    document.addEventListener('touchstart', handleDocumentTouchStart, { passive: false, capture: true });
    document.addEventListener('touchmove', handleDocumentTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', handleDocumentTouchEnd, { passive: true, capture: true });

    return () => {
      document.removeEventListener('touchstart', handleDocumentTouchStart, { capture: true } as EventListenerOptions);
      document.removeEventListener('touchmove', handleDocumentTouchMove, { capture: true } as EventListenerOptions);
      document.removeEventListener('touchend', handleDocumentTouchEnd, { capture: true } as EventListenerOptions);
    };
  }, [enabled, threshold, onRefresh, isRefreshing]);

  return { elementRef, isRefreshing };
}
