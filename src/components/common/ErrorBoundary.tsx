import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, Copy, Check, ChevronDown, ChevronUp, Bug, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log unexpected runtime UI errors to console for telemetry
    console.error('[React ErrorBoundary Caught Error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    // Clear any broken sub-navigation and reset state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.href = '/';
  };

  handleCopyDetails = () => {
    const { error, errorInfo } = this.state;
    const text = `School ERP Runtime Error Report
Time: ${new Date().toISOString()}
Error: ${error?.name}: ${error?.message}
Component Stack:
${errorInfo?.componentStack || 'N/A'}
Call Stack:
${error?.stack || 'N/A'}`;

    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    }).catch(() => {});
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle, fallbackMessage } = this.props;
      const { error, errorInfo, showDetails, copied } = this.state;

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-rose-500 to-amber-600 px-6 py-5 text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  {fallbackTitle || 'School ERP System Error'}
                </h1>
                <p className="text-xs text-rose-100 font-medium">
                  An unexpected UI runtime exception was prevented from crashing the app.
                </p>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6">
              <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-800">
                    <p className="font-semibold text-rose-950 mb-1">
                      {fallbackMessage || 'The current view encountered an unexpected issue.'}
                    </p>
                    <p className="text-xs text-rose-700 font-mono break-all line-clamp-2">
                      {error?.message || 'Unknown runtime error occurred.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] transition-all text-xs font-semibold shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 transition-all text-xs font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reload Page
                </button>
                <button
                  type="button"
                  onClick={this.handleGoHome}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 transition-all text-xs font-semibold"
                >
                  <Home className="w-3.5 h-3.5" />
                  Dashboard
                </button>
              </div>

              {/* Collapsible Error Diagnostics */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => this.setState({ showDetails: !showDetails })}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <Bug className="w-3.5 h-3.5 text-slate-500" />
                    <span>Technical Error Details</span>
                    {showDetails ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={this.handleCopyDetails}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-medium text-slate-600 transition-colors"
                    title="Copy full error stack to clipboard"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-500" />
                        <span>Copy Report</span>
                      </>
                    )}
                  </button>
                </div>

                {showDetails && (
                  <div className="p-3 bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                    <p className="text-rose-400 font-bold mb-1">
                      {error?.name}: {error?.message}
                    </p>
                    {error?.stack && (
                      <pre className="text-slate-400 whitespace-pre-wrap text-[10px]">
                        {error.stack}
                      </pre>
                    )}
                    {errorInfo?.componentStack && (
                      <div className="mt-2 pt-2 border-t border-slate-800">
                        <span className="text-amber-400 font-semibold">Component Hierarchy:</span>
                        <pre className="text-slate-400 whitespace-pre-wrap text-[10px]">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
              <span className="text-[11px] text-slate-500 font-medium">
                School ERP Management System • Institutional Safety Boundary
              </span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
