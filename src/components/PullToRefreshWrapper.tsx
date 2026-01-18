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
  const { elementRef, isRefreshing } = usePullToRefresh({
    onRefresh: () => {
      // Hard refresh the page to get latest updates
      window.location.reload();
    },
    threshold: 80,
    enabled: true
  });

  return (
    <div ref={elementRef} className="min-h-screen relative">
      {/* Loading spinner overlay */}
      {isRefreshing && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-full p-4 shadow-lg">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
