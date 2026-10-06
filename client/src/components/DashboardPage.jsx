import React from 'react';
import MemberDashboard from './MemberDashboard';

function DashboardPage({ currentUser, onLogout, onNavigate }) {
  if (!currentUser) {
    return null;
  }

  const role = currentUser.role || 'member';

  if (role === 'member') {
    return <MemberDashboard currentUser={currentUser} />;
  }

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Welcome Banner for Trainer/Admin */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${
                  role === 'admin'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}
              >
                {role} Dashboard
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500">Authenticated Session</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Welcome back, {currentUser.fullName}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Signed in as <span className="font-mono text-slate-800 font-medium">{currentUser.email}</span>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {role === 'trainer' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                Trainer Status
              </span>
              <p className="text-xl font-bold text-blue-600">Certified Trainer</p>
              <p className="text-xs text-slate-500 mt-1">Assigned to client training programs</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                Active Trainees
              </span>
              <p className="text-xl font-bold text-slate-900">8 Members</p>
              <p className="text-xs text-slate-500 mt-1">Under personal fitness guidance</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                Sessions Scheduled
              </span>
              <p className="text-xl font-bold text-slate-900">3 Today</p>
              <p className="text-xs text-slate-500 mt-1">Next session: 4:00 PM</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded inline-block mb-1">
                  Active Feature
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  Member Workout Plan Assignment
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                  Select your assigned members, view their fitness goals and experience levels, build or customize routines (Day, Exercise, Sets, Reps, Rest), and assign plans directly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('trainer-workouts')}
                className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
              >
                Open Workout Assignment &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {role === 'admin' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                Security Policy
              </span>
              <p className="text-xl font-bold text-amber-600">Role Isolation Active</p>
              <p className="text-xs text-slate-500 mt-1">Public registration strictly member-only</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                System Health
              </span>
              <p className="text-xl font-bold text-slate-900">Operational</p>
              <p className="text-xs text-slate-500 mt-1">Express API &amp; Database connected</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                Privilege Level
              </span>
              <p className="text-xl font-bold text-slate-900">Super Administrator</p>
              <p className="text-xs text-slate-500 mt-1">Full access to member &amp; staff controls</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-2">Administrator Console Notice</h2>
            <p className="text-xs text-slate-600">
              Administrator role verified. Member audits, trainer management, and financial summaries will be expanded in the admin milestone.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

export default DashboardPage;
