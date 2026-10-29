import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const { isOnline, wasOffline } = useOnlineStatus();

  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md shrink-0 sticky top-0 z-50 animate-in slide-in-from-top"
      >
        <WifiOff className="w-4 h-4 text-slate-950 animate-bounce" />
        <span>No internet connection detected. Active operations will resume when back online.</span>
      </div>
    );
  }

  if (wasOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-emerald-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-md shrink-0 sticky top-0 z-50 animate-in slide-in-from-top"
      >
        <CheckCircle2 className="w-4 h-4 text-white" />
        <span>Connection restored. System is live.</span>
      </div>
    );
  }

  return null;
};
