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
  const wasAtTopRef = useRef(true);

  // Check if we're at the top - simplified check
  const isAtTop = () => {
    // Primary check: window scroll
    const windowScroll = window.scrollY || window.pageYOffset || 0;
    const docScroll = document.documentElement.scrollTop || document.body.scrollTop || 0;
    
    // Allow small tolerance (5px) for rounding issues
    return windowScroll <= 5 && docScroll <= 5;
  };

  useEffect(() => {
    if (!enabled) return;

    // Only enable on mobile devices (touch devices)
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isMobile) return;

    // Track scroll position to know when we're at top
    const handleScroll = () => {
      wasAtTopRef.current = isAtTop();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    const handleTouchStart = (e: TouchEvent) => {
      // Don't start if already refreshing
      if (isRefreshing) return;

      const touchY = e.touches[0].clientY;
      
      // Check if we're at top and touch is in upper portion of screen
      if (wasAtTopRef.current && touchY < 200 && !isPulling.current) {
        touchStartY.current = touchY;
        touchCurrentY.current = touchY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || touchStartY.current === null) return;

      touchCurrentY.current = e.touches[0].clientY;
      const pullDistance = touchCurrentY.current - touchStartY.current;

      // Only allow downward pull
      if (pullDistance > 0) {
        // If we've pulled enough, prevent default to stop scrolling
        if (pullDistance > 15 && wasAtTopRef.current) {
          e.preventDefault();
        }
      } else {
        // Reset if user scrolls up
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

      // Trigger refresh if threshold is met and we're still at top
      if (pullDistance >= threshold && wasAtTopRef.current) {
        setIsRefreshing(true);
        onRefresh();
      }

      // Reset
      isPulling.current = false;
      touchStartY.current = null;
      touchCurrentY.current = null;
    };

    // Listen on document to catch all touches
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, threshold, onRefresh, isRefreshing]);

  return { elementRef, isRefreshing };
}
