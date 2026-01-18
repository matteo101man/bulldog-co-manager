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
      // Only start if we're at the top
      if (isAtTop() && !isPulling.current && !isRefreshing) {
        touchStartY.current = e.touches[0].clientY;
        touchCurrentY.current = e.touches[0].clientY;
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

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, threshold, onRefresh, isRefreshing]);

  return { elementRef, isRefreshing };
}
