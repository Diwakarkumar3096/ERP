import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall.js';
import { Download, Smartphone, X, Share2, PlusSquare } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'menu' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'menu') {
      return (
        <button
          onClick={install}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-indigo-600 bg-indigo-50/60 hover:bg-indigo-50 rounded-lg transition-colors font-semibold ${className}`}
        >
          <Smartphone className="w-4 h-4 text-indigo-600" />
          <span>Install School ERP App</span>
        </button>
      );
    }

    return (
      <button
        onClick={install}
        title="Install School ERP as an App on your device"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        {variant === 'menu' ? (
          <button
            onClick={() => setShowIOSGuide(true)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-indigo-600 bg-indigo-50/60 hover:bg-indigo-50 rounded-lg transition-colors font-semibold ${className}`}
          >
            <Smartphone className="w-4 h-4 text-indigo-600" />
            <span>Install on iPhone/iPad</span>
          </button>
        ) : (
          <button
            onClick={() => setShowIOSGuide(true)}
            title="Install School ERP on iPhone or iPad"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold shadow-xs transition-colors shrink-0 ${className}`}
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Install on iOS</span>
          </button>
        )}

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  SE
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Install School ERP</h4>
                  <p className="text-xs text-slate-500">Add to iPhone or iPad Home Screen</p>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-xs text-slate-700">
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <div className="flex-1">
                    Tap the <span className="font-semibold text-slate-900 inline-flex items-center gap-1">Share button <Share2 className="w-3.5 h-3.5 inline text-blue-600" /></span> in the Safari bottom bar.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <div className="flex-1">
                    Scroll down and tap <span className="font-semibold text-slate-900 inline-flex items-center gap-1">Add to Home Screen <PlusSquare className="w-3.5 h-3.5 inline text-slate-700" /></span>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <div className="flex-1">
                    Tap <span className="font-semibold text-slate-900">Add</span> in the top-right corner to launch School ERP in standalone app mode anytime.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
