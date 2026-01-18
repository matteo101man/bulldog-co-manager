import React, { ReactNode } from 'react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

interface PullToRefreshWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper component that enables pull-to-refresh on mobile devices
 * Works on any page when the user pulls down from the top
 */
export default function PullToRefreshWrapper({ children }: PullToRefreshWrapperProps) {
  const pullToRefreshRef = usePullToRefresh({
    onRefresh: () => {
      // Hard refresh the page to get latest updates
      window.location.reload();
    },
    threshold: 80,
    enabled: true
  });

  return (
    <div ref={pullToRefreshRef} className="min-h-screen">
      {children}
    </div>
  );
}
