import React from 'react';

/**
 * Universal Notice / Alert Banner Component for FitPulse.
 * Visual Source of Truth: Screenshot 1 (Unified Alert Architecture).
 *
 * Supports semantic variants: 'warning' | 'error' | 'success' | 'info' | 'neutral'
 * Same visual structure across Member, Trainer, and Admin roles.
 */
const VARIANTS = {
  warning: {
    container: 'bg-amber-50 border-amber-300 text-amber-900',
    title: 'text-amber-950',
    message: 'text-amber-800',
    secondary: 'text-amber-700',
    button: 'bg-white hover:bg-amber-100 text-amber-900 border-amber-300',
    closeButton: 'text-amber-800 hover:text-amber-950',
    defaultIcon: '⚠️',
  },
  error: {
    container: 'bg-rose-50 border-rose-300 text-rose-900',
    title: 'text-rose-950',
    message: 'text-rose-800',
    secondary: 'text-rose-700',
    button: 'bg-white hover:bg-rose-100 text-rose-900 border-rose-300',
    closeButton: 'text-rose-700 hover:text-rose-950',
    defaultIcon: '⚠️',
  },
  success: {
    container: 'bg-emerald-50 border-emerald-300 text-emerald-900',
    title: 'text-emerald-950',
    message: 'text-emerald-800',
    secondary: 'text-emerald-700',
    button: 'bg-white hover:bg-emerald-100 text-emerald-900 border-emerald-300',
    closeButton: 'text-emerald-700 hover:text-emerald-950',
    defaultIcon: '✓',
  },
  info: {
    container: 'bg-blue-50 border-blue-300 text-blue-900',
    title: 'text-blue-950',
    message: 'text-blue-800',
    secondary: 'text-blue-700',
    button: 'bg-white hover:bg-blue-100 text-blue-900 border-blue-300',
    closeButton: 'text-blue-700 hover:text-blue-950',
    defaultIcon: 'ℹ️',
  },
  neutral: {
    container: 'bg-slate-50 border-slate-300 text-slate-900',
    title: 'text-slate-950',
    message: 'text-slate-800',
    secondary: 'text-slate-600',
    button: 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300',
    closeButton: 'text-slate-600 hover:text-slate-950',
    defaultIcon: 'ℹ️',
  },
};

function NoticeBanner({
  variant = 'warning',
  icon,
  title,
  message,
  secondaryText,
  action,
  actionLabel,
  onAction,
  onClose,
  className = '',
  children,
  role = 'alert',
  id,
}) {
  const config = VARIANTS[variant] || VARIANTS.warning;
  const displayIcon = icon !== undefined ? icon : config.defaultIcon;

  const displayTitle = title || (!title && message && (secondaryText || children) ? message : title);
  const displayMessage = title ? message : (!secondaryText && !children ? message : null);

  return (
    <div
      role={role}
      id={id}
      className={`border rounded-lg p-4 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${config.container} ${className}`}
    >
      <div className="flex items-start space-x-3 flex-1 min-w-0">
        {displayIcon && (
          <span className="text-lg shrink-0 select-none leading-none pt-0.5">
            {displayIcon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          {displayTitle && (
            <p className={`font-bold ${config.title} leading-snug break-words`}>
              {displayTitle}
            </p>
          )}
          {displayMessage && (
            <p className={`${config.message} ${displayTitle ? 'mt-1' : ''} font-medium leading-relaxed break-words`}>
              {displayMessage}
            </p>
          )}
          {secondaryText && (
            <p className={`text-xs ${config.secondary} mt-0.5 break-words`}>
              {secondaryText}
            </p>
          )}
          {children}
        </div>
      </div>

      {(action || (actionLabel && onAction) || onClose) && (
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {action ? (
            action
          ) : actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className={`px-3.5 py-1.5 border text-xs font-semibold rounded cursor-pointer self-start sm:self-auto transition-colors whitespace-nowrap shadow-xs ${config.button}`}
            >
              {actionLabel}
            </button>
          ) : null}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notification"
              className={`p-1 text-base leading-none font-bold rounded cursor-pointer transition-colors ${config.closeButton}`}
            >
              &times;
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default NoticeBanner;
