import React, { useState, useEffect } from 'react';
import NoticeBanner from './NoticeBanner';
import ExerciseImage from './ExerciseImage';

function MemberDashboard({ currentUser, onNavigate }) {
  const [data, setData] = useState(null);
  const [gymStatus, setGymStatus] = useState(null);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showTomorrowClosureModal, setShowTomorrowClosureModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const response = await fetch('/api/member/dashboard', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to load member dashboard');
      }

      setData(result.data);

      // Fetch live gym operating status in Asia/Kolkata
      try {
        const statusRes = await fetch('/api/member/gym-status', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const statusResult = await statusRes.json();
        if (statusRes.ok && statusResult.status === 'success' && statusResult.data) {
          setGymStatus(statusResult.data);
          if (statusResult.data.isClosure) {
            setShowClosureModal(true);
          }
        }
      } catch (statusErr) {
        console.warn('Could not fetch gym status:', statusErr);
      }
    } catch (err) {
      console.error('Error fetching member dashboard:', err);
      setError(err.message || 'Network error while loading data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleSessionChange = () => {
      fetchDashboardData();
    };
    window.addEventListener('fitpulse-session-change', handleSessionChange);
    return () => window.removeEventListener('fitpulse-session-change', handleSessionChange);
  }, []);

  const formatText = (text) => {
    if (!text) return '—';
    return text
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatClosureDate = (dateStr) => {
    if (!dateStr) return 'Today';
    try {
      const [y, m, d] = dateStr.split('-');
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium text-slate-600">Loading your member dashboard...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white border border-red-200 rounded-lg p-6 text-center max-w-lg mx-auto shadow-sm">
          <p className="text-sm font-semibold text-red-600 mb-2">Unable to load dashboard data</p>
          <p className="text-xs text-slate-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </main>
    );
  }

  const memberName = data?.member?.fullName || currentUser?.fullName || 'Member';
  const currentGoal = formatText(data?.currentGoal);
  const fitnessLevel = formatText(data?.fitnessLevel);
  const plannedDays = data?.plannedWorkoutDays ?? 5;
  const attendanceDays = data?.thisMonthsAttendance ?? 0;
  const consistencyRate = data?.consistencyPercentage;
  const todaysWorkout = data?.todaysWorkout;
  const membershipStatus = data?.membership?.status || 'Pending';
  const isActive = membershipStatus === 'Active';

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Gym Closure Popup Modal (Today - PART 2 & 13) */}
      {showClosureModal && gymStatus?.isClosure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-amber-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <div>
              <span className="inline-block px-3 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 mb-2">
                GYM CLOSED TODAY
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">
                {formatClosureDate(gymStatus.todayDate)}
              </h3>
              <p className="text-sm font-semibold text-amber-800 mt-1">
                Reason: {gymStatus.reason}
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-lg text-xs text-slate-700 leading-relaxed text-left">
              <p className="font-medium text-slate-900 mb-1">Message:</p>
              <p>
                {gymStatus.announcement ||
                  `The gym is closed today due to ${gymStatus.reason}. Normal gym timings resume tomorrow.`}
              </p>
              <p className="text-[11px] text-slate-500 mt-2 italic">
                Normal gym timings resume tomorrow. Gym-wide closures do not penalize your workout consistency.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowClosureModal(false)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tomorrow Gym Closure Popup Modal (Advance Notice - PART 3 & 5) */}
      {showTomorrowClosureModal && gymStatus?.hasTomorrowClosure && !gymStatus?.isClosure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-amber-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <div>
              <span className="inline-block px-3 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 mb-2">
                GYM CLOSED TOMORROW
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">
                {formatClosureDate(gymStatus.tomorrowClosure?.date || gymStatus.nextUpcomingClosure?.date)}
              </h3>
              <p className="text-sm font-semibold text-amber-800 mt-1">
                Reason: {gymStatus.tomorrowClosure?.reason || gymStatus.nextUpcomingClosure?.reason}
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-lg text-xs text-slate-700 leading-relaxed text-left">
              <p className="font-medium text-slate-900 mb-1">Message:</p>
              <p>
                {gymStatus.tomorrowClosure?.announcement ||
                  `The gym will be closed tomorrow due to ${gymStatus.tomorrowClosure?.reason || 'a scheduled closure'}.`}
              </p>
              <p className="text-[11px] text-slate-600 mt-2 font-medium">
                The gym will be closed tomorrow. Please plan your workout accordingly.
              </p>
              <p className="text-[11px] text-slate-500 mt-1 italic">
                Pre-scheduled closures are automatically excused from consistency ratings. Normal operating hours resume after the closure date.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowTomorrowClosureModal(false)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Gym Closure Top Banner (Today - PART 2 & 5) */}
      {gymStatus?.isClosure && (
        <NoticeBanner
          variant="warning"
          title={`GYM CLOSED TODAY (${formatClosureDate(gymStatus.todayDate)}) • Reason: ${gymStatus.reason}`}
          message="Normal gym timings resume tomorrow. Physical training sessions are paused today."
          secondaryText={gymStatus.announcement ? `Notice: ${gymStatus.announcement}` : null}
          actionLabel="View Notice"
          onAction={() => setShowClosureModal(true)}
        />
      )}

      {/* Tomorrow Gym Closure Advance Warning Banner (PART 3, 4 & 5) */}
      {gymStatus?.hasTomorrowClosure && !gymStatus?.isClosure && (
        <NoticeBanner
          variant="warning"
          title={`GYM CLOSED TOMORROW (${formatClosureDate(gymStatus.tomorrowClosure?.date)}) • Reason: ${gymStatus.tomorrowClosure?.reason}`}
          message={
            gymStatus.tomorrowClosure?.announcement ||
            `The gym will be closed tomorrow due to ${gymStatus.tomorrowClosure?.reason}. Please plan your workout accordingly.`
          }
          secondaryText={gymStatus.tomorrowClosure?.announcement ? `Notice: ${gymStatus.tomorrowClosure.announcement}` : null}
          actionLabel="View Notice"
          onAction={() => setShowTomorrowClosureModal(true)}
        />
      )}

      {/* Upcoming Future Closure Notice (PART 10 & 23) */}
      {!gymStatus?.isClosure && !gymStatus?.hasTomorrowClosure && gymStatus?.nextUpcomingClosure && gymStatus.nextUpcomingClosure.daysUntil > 1 && (
        <NoticeBanner
          variant="info"
          title={`UPCOMING GYM CLOSURE (${formatClosureDate(gymStatus.nextUpcomingClosure.date)}) • In ${gymStatus.nextUpcomingClosure.daysUntil} days`}
          message={`Reason: ${gymStatus.nextUpcomingClosure.reason}`}
        />
      )}

      {/* Non-Active Member Notice */}
      {!isActive && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                Membership: Not Active
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              Activate your membership to unlock workout tracking, gym check-ins, and consistency reports.
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Explore available plans to get started with full access.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('membership')}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-sm self-start sm:self-auto"
          >
            Choose Membership
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                Member Dashboard
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {currentUser?.hasLoggedInBefore
                ? `Welcome back, ${memberName}!`
                : `Welcome to FitPulse, ${memberName}!`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {isActive
                ? 'Here is your routine schedule and personal gym consistency overview.'
                : 'Here is your account overview. Activate your membership to start tracking workouts.'}
            </p>
          </div>

          {/* Today's Gym Status Pill */}
          <div className="flex flex-col sm:items-end justify-center">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                gymStatus?.isClosure
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : gymStatus?.isOpen
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full mr-1.5 ${
                  gymStatus?.isClosure
                    ? 'bg-rose-500'
                    : gymStatus?.isOpen
                    ? 'bg-emerald-500'
                    : 'bg-rose-500'
                }`}
              />
              {gymStatus?.isClosure
                ? 'GYM CLOSED TODAY'
                : `Gym Status: ${gymStatus?.status || (gymStatus?.isOpen ? 'OPEN' : 'CLOSED')}`}
            </span>
            <span className="text-[11px] text-slate-500 mt-1">
              {gymStatus?.isClosure
                ? `Closed Today: ${gymStatus.reason}`
                : `Today (${gymStatus?.dayOfWeek || 'Today'}): ${gymStatus?.openingTime || '06:00 AM'} – ${gymStatus?.closingTime || '10:00 PM'}`}
            </span>
            {gymStatus?.hasTomorrowClosure && !gymStatus?.isClosure && (
              <span className="text-[11px] font-semibold text-amber-700 mt-0.5">
                ⚠️ Tomorrow ({formatClosureDate(gymStatus.tomorrowClosure?.date)}): Closed ({gymStatus.tomorrowClosure?.reason})
              </span>
            )}
            {!gymStatus?.isClosure && !gymStatus?.hasTomorrowClosure && gymStatus?.nextUpcomingClosure && gymStatus.nextUpcomingClosure.daysUntil > 1 && (
              <span className="text-[11px] text-slate-500 mt-0.5">
                Upcoming closure: {formatClosureDate(gymStatus.nextUpcomingClosure.date)} (in {gymStatus.nextUpcomingClosure.daysUntil} days)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Active Gym Session Banner on Dashboard (PART 15) */}
      {isActive && data?.activeCheckIn && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Workout Session In Progress
                </span>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs font-semibold text-slate-700">{data.activeCheckIn.workoutDayName || "Today's Session"}</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Checked in at <strong>{new Date(data.activeCheckIn.checkInTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true })}</strong> &bull; Complete exercises & check out in Attendance.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="dashboard-go-attendance-btn"
            onClick={() => onNavigate?.('attendance')}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
          >
            Go to Session &rarr;
          </button>
        </div>
      )}

      {/* 5 Simple Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Current Goal */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
            Current Goal
          </span>
          <p className="text-xl font-bold text-slate-900 truncate">{currentGoal}</p>
          <p className="text-xs text-slate-500 mt-1">Primary fitness objective</p>
        </div>

        {/* Card 2: Fitness Level */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
            Fitness Level
          </span>
          <p className="text-xl font-bold text-slate-900 truncate">{fitnessLevel}</p>
          <p className="text-xs text-slate-500 mt-1">Experience classification</p>
        </div>

        {/* Card 3: Planned Workout Days */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
            Planned Workout Days
          </span>
          <p className="text-xl font-bold text-slate-900">{plannedDays} Days / Week</p>
          <p className="text-xs text-slate-500 mt-1">Scheduled workout frequency</p>
        </div>

        {/* Card 4: Gym Visits */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
            Gym Visits
          </span>
          <p className="text-xl font-bold text-slate-900">
            {isActive ? `${attendanceDays} Days` : '0'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Total visits this month</p>
        </div>

        {/* Card 5: Consistency Percentage */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
            Consistency
          </span>
          <p className="text-xl font-bold text-emerald-700">
            {isActive && consistencyRate !== null && attendanceDays > 0
              ? `${consistencyRate}%`
              : 'Not available yet'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Session completion score</p>
        </div>
      </div>

      {/* Today's Workout Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="border-b border-gray-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                {data?.isRestDay ? 'Scheduled Rest' : "Today's Workout"}
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                {data?.isRestDay ? 'REST DAY' : (todaysWorkout?.workoutName || 'Workout Session')}
              </h2>
            </div>
            {data?.hasCompletedWorkoutToday ? (
              <span className="inline-flex items-center px-3 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                ✓ Completed Today
              </span>
            ) : todaysWorkout?.focus && !data?.isRestDay ? (
              <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                Target Focus: {todaysWorkout.focus}
              </span>
            ) : null}
            {data?.isRestDay && (
              <span className="inline-flex items-center px-3 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-gray-200 self-start sm:self-auto">
                Rest & Recovery
              </span>
            )}
          </div>
        </div>

        {/* Exercise Details List or Rest Day or Inactive Empty State */}
        {!isActive ? (
          <div className="text-center py-10 px-4 bg-slate-50/70 rounded-lg border border-dashed border-gray-200">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="font-semibold text-slate-800 text-base">Activate membership to create/use your workout plan</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto mb-5">
              Personalized workout splits, daily exercise targets, and active gym session logging become available once your membership is activated.
            </p>
            <button
              type="button"
              onClick={() => onNavigate?.('membership')}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
            >
              Choose Membership
            </button>
          </div>
        ) : data?.isRestDay ? (
          <div className="text-center py-8 text-slate-600 bg-slate-50/80 rounded-lg border border-gray-200">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-200 text-slate-800 mb-2">
              REST DAY
            </span>
            <p className="font-bold text-slate-900 text-base">Today is a scheduled rest day.</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              You have no scheduled workout today. Rest days are excluded from your consistency calculations and allow your muscles to recover.
            </p>
          </div>
        ) : todaysWorkout && todaysWorkout.exercises && todaysWorkout.exercises.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Exercise</th>
                  <th className="py-3 px-4">Sets</th>
                  <th className="py-3 px-4">Reps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {todaysWorkout.exercises.map((exercise, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-xs font-medium text-slate-400">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center space-x-3">
                        <ExerciseImage
                          exercise={exercise}
                          name={exercise.exerciseName}
                          className="w-9 h-9 rounded border border-gray-200 bg-white p-1 object-contain shrink-0"
                        />
                        <span>{exercise.exerciseName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {exercise.sets} {exercise.sets === 1 ? 'set' : 'sets'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-mono text-xs">
                      {exercise.reps} reps
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-sm bg-slate-50/50 rounded-lg border border-dashed border-gray-200">
            <p className="font-medium text-slate-700">No workout scheduled for today.</p>
            <p className="text-xs text-slate-500 mt-1">Enjoy your active recovery and proper hydration!</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default MemberDashboard;
