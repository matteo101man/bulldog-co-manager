import { useEffect, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => void;
  threshold?: number; // Distance in pixels to trigger refresh
  enabled?: boolean; // Whether pull-to-refresh is enabled
}

/**
 * Custom hook for pull-to-refresh functionality on mobile devices
 * Only works when the page is scrolled to the top
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

  useEffect(() => {
    if (!enabled) return;

    // Only enable on mobile devices (touch devices)
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isMobile) return;

    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start if we're at the top of the page
      if (window.scrollY === 0 && !isPulling.current) {
        touchStartY.current = e.touches[0].clientY;
        touchCurrentY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || touchStartY.current === null) return;

      touchCurrentY.current = e.touches[0].clientY;
      const pullDistance = touchCurrentY.current - touchStartY.current;

      // Only allow downward pull
      if (pullDistance > 0 && window.scrollY === 0) {
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
      if (pullDistance >= threshold && window.scrollY === 0) {
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
  }, [enabled, threshold, onRefresh]);

  return elementRef;
}
