import React from 'react';

/**
 * Shared Logout Confirmation Modal
 * Reusable across Member, Trainer, and Admin roles.
 * Clean, lightweight, conforming strictly to FitPulse design standards.
 */
function LogoutConfirmModal({ onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </div>
        <h3 id="logout-modal-title" className="text-lg font-bold text-slate-900 mb-2">
          Leave Authenticated Portal?
        </h3>
        <p className="text-sm text-slate-600 mb-6">
          Are you sure you want to end your authenticated session and leave the portal?
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            id="logout-modal-stay-btn"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Stay
          </button>
          <button
            type="button"
            id="logout-modal-confirm-btn"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            Logout & Leave
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogoutConfirmModal;
