
import React, { useState, useEffect } from 'react';

/**
 * Offline banner — shows a subtle notification when the user loses connection.
 * Auto-hides when back online.
 */
const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowBanner(true);
      setJustReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      // Show "back online" for 3s then hide
      setTimeout(() => {
        setShowBanner(false);
        setJustReconnected(false);
      }, 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Set initial state
    if (!navigator.onLine) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[999] flex items-center justify-center gap-2 py-2 px-4 text-[11px] font-semibold tracking-wide transition-all duration-500 animate-fade-down max-w-md mx-auto ${
        isOffline
          ? 'bg-amber-500/90 text-black'
          : 'bg-emerald-500/90 text-black'
      }`}
      style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
    >
      <i className={`fa-solid ${isOffline ? 'fa-wifi' : 'fa-check-circle'} text-[10px]`} />
      {isOffline
        ? 'Mode offline — Data tersimpan lokal'
        : 'Kembali online ✓'
      }
    </div>
  );
};

export default OfflineBanner;
