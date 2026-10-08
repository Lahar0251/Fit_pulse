import React, { useState, useEffect } from 'react';
import NoticeBanner from './NoticeBanner';
import ExerciseImage from './ExerciseImage';

function AttendancePage({ isPreview, onNavigate }) {
  const [records, setRecords] = useState([]);
  const [thisMonthVisits, setThisMonthVisits] = useState(0);
  const [activeCheckIn, setActiveCheckIn] = useState(null);
  const [todayCompletedSession, setTodayCompletedSession] = useState(null);
  const [hasCompletedWorkoutToday, setHasCompletedWorkoutToday] = useState(false);
  const [weekSchedule, setWeekSchedule] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [todaysWorkout, setTodaysWorkout] = useState(null);
  const [isRestDay, setIsRestDay] = useState(false);
  const [missedWorkouts, setMissedWorkouts] = useState([]);
  const [activeWorkoutSource, setActiveWorkoutSource] = useState('recommended');
  const [plannedWorkoutDays, setPlannedWorkoutDays] = useState(5);
  const [restConfirmed, setRestConfirmed] = useState(false);
  const [gymStatus, setGymStatus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [elapsedTimer, setElapsedTimer] = useState('00:00:00');

  // Fetch attendance data on component mount (and on page refresh)
  const fetchAttendance = async () => {
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/member/attendance', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });

      const result = await res.json();
      if (res.ok && result.status === 'success' && result.data) {
        setRecords(result.data.records || []);
        setThisMonthVisits(result.data.thisMonthVisits || 0);
        setActiveCheckIn(result.data.activeCheckIn || null);
        setTodayCompletedSession(result.data.todayCompletedSession || null);
        setHasCompletedWorkoutToday(Boolean(result.data.hasCompletedWorkoutToday));
        setWeekSchedule(result.data.weekSchedule || []);
        setTodaySchedule(result.data.todaySchedule || null);
        setTodaysWorkout(result.data.todaysWorkout || null);
        setIsRestDay(Boolean(result.data.isRestDay));
        setMissedWorkouts(result.data.missedWorkouts || []);
        setActiveWorkoutSource(result.data.activeWorkoutSource || 'recommended');
        setPlannedWorkoutDays(result.data.plannedWorkoutDays || 5);
      } else {
        setError(result.message || 'Failed to load attendance records.');
      }

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
        }
      } catch (statusErr) {
        console.warn('Could not fetch gym status:', statusErr);
      }
    } catch (err) {
      console.error('Fetch attendance error:', err);
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();

    const handleSessionChange = () => {
      fetchAttendance();
    };
    window.addEventListener('fitpulse-session-change', handleSessionChange);
    return () => window.removeEventListener('fitpulse-session-change', handleSessionChange);
  }, []);

  // Poll active session status every 10 seconds while workout is in progress
  // Enforces automatic check-out at gym closing time without requiring manual refresh
  useEffect(() => {
    if (!activeCheckIn) return;

    const pollCurrentSession = async () => {
      try {
        const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
        const res = await fetch('/api/member/attendance/current-session', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
          },
        });
        if (!res.ok) return;
        const result = await res.json();
        if (result?.status === 'success') {
          if (!result.data?.activeCheckIn) {
            // Gym closed or session auto-completed on backend!
            setActiveCheckIn(null);
            fetchAttendance();
          } else {
            setActiveCheckIn(result.data.activeCheckIn);
          }
          if (result.data?.gymStatus) {
            setGymStatus(result.data.gymStatus);
          }
        }
      } catch (err) {
        // Silently catch polling errors
      }
    };

    const intervalId = setInterval(pollCurrentSession, 10000);
    return () => clearInterval(intervalId);
  }, [activeCheckIn]);

  // Real Gym Session Timer driven by authoritative backend checkIn timestamp
  useEffect(() => {
    if (!activeCheckIn?.checkInTime) {
      setElapsedTimer('00:00:00');
      return;
    }

    const updateTimer = () => {
      const checkInMs = new Date(activeCheckIn.checkInTime).getTime();
      const nowMs = Date.now();
      const diffSecs = Math.max(0, Math.floor((nowMs - checkInMs) / 1000));

      const hrs = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      const secs = diffSecs % 60;

      const formatted = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      setElapsedTimer(formatted);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeCheckIn?.checkInTime]);

  // Handle Workout Source Switcher (Persisted in MongoDB)
  const handleSwitchWorkoutSource = async (newSource) => {
    if (activeWorkoutSource === 'trainer') return;
    setActiveWorkoutSource(newSource);
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      await fetch('/api/member/workout-source', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify({ activeWorkoutSource: newSource }),
      });
      await fetchAttendance();
    } catch (err) {
      console.warn('Failed to switch workout source:', err);
    }
  };

  // Handle Check In (Supports Scheduled and Make-Up Sessions)
  const handleCheckIn = async (checkInParams = {}) => {
    if (isPreview) {
      onNavigate?.('membership');
      return;
    }

    setError(null);
    setMessage(null);
    setActionLoading(true);

    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const payload = {
        workoutSource: activeWorkoutSource,
        sessionType: checkInParams.sessionType || 'scheduled',
        dayNumber: checkInParams.dayNumber || todaysWorkout?.dayNumber,
        makeupForDayNumber: checkInParams.makeupForDayNumber || null,
        scheduleDay: checkInParams.scheduleDay || null,
      };

      const res = await fetch('/api/member/attendance/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Failed to check in.');
      }

      setMessage(
        checkInParams.sessionType === 'makeup'
          ? `Checked in for Make-Up Workout (Day ${checkInParams.makeupForDayNumber})! Complete your exercises.`
          : 'Checked in successfully! Have a great workout session.'
      );
      window.dispatchEvent(new Event('fitpulse-session-change'));
      await fetchAttendance();
    } catch (err) {
      setError(err.message || 'Check-in failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Check Out
  const handleCheckOut = async () => {
    setError(null);
    setMessage(null);
    setActionLoading(true);

    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/member/attendance/check-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || 'Failed to check out.');
      }

      const duration = result.data?.durationMinutes || 0;
      setMessage(`Checked out successfully! Total session duration: ${formatDuration(duration, false)}.`);
      window.dispatchEvent(new Event('fitpulse-session-change'));
      await fetchAttendance();
    } catch (err) {
      setError(err.message || 'Check-out failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Exercise Completion (Strict one-way: completed actions are final)
  const handleToggleExercise = async (exerciseId) => {
    // If already completed in local session state, do not repeat or reverse
    const existingEx = activeCheckIn?.exercises?.find(
      (e) => e.exerciseId === exerciseId || (e._id && String(e._id) === String(exerciseId))
    );
    if (existingEx?.isCompleted) {
      return;
    }

    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch(`/api/member/attendance/active/exercise/${exerciseId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });

      const result = await res.json();
      if (res.ok && result.data?.attendance) {
        setActiveCheckIn(result.data.attendance);
      } else {
        setError(result.message || 'Failed to update exercise completion.');
      }
    } catch (err) {
      console.error('Error completing exercise:', err);
    }
  };

  // Format date helper (e.g. Oct 7)
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Format time helper (e.g. 5:35 PM)
  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format duration helper (e.g. 1h 27m, 40m)
  const formatDuration = (minutes, isActive) => {
    if (isActive) return 'In Progress';
    if (minutes === undefined || minutes === null || minutes < 1) return '< 1m';
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const totalAssigned = activeCheckIn?.totalAssigned || activeCheckIn?.exercises?.length || 0;
  const completedCount =
    activeCheckIn?.totalCompleted !== undefined
      ? activeCheckIn.totalCompleted
      : activeCheckIn?.exercises?.filter((e) => e.isCompleted).length || 0;

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Feature Preview Banner */}
      {isPreview && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                Feature Preview Mode
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              Your attendance tracking will appear here after membership activation.
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Live gym check-ins, real session timer, and exercise completion tracking unlock with an active membership.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('membership')}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-sm self-start sm:self-auto"
          >
            Activate Membership
          </button>
        </div>
      )}

      {/* Page Title Card with Gym Operating Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded inline-block mb-2">
            Member Portal &bull; Attendance
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Gym Attendance</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Record your gym visits, track live workout session duration, and track exercise completions.
          </p>
        </div>

        {/* Live Operating Status Badge */}
        {gymStatus && (
          <div className="flex flex-col sm:items-end">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${gymStatus.isClosure
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : gymStatus.isOpen
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
            >
              <span
                className={`w-2 h-2 rounded-full mr-1.5 ${gymStatus.isClosure
                    ? 'bg-rose-500'
                    : gymStatus.isOpen
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                  }`}
              />
              {gymStatus.isClosure ? 'GYM CLOSED TODAY' : `Gym: ${gymStatus.status}`}
            </span>
            <span className="text-[11px] text-slate-500 mt-1">
              {gymStatus.isClosure
                ? `Closed Today: ${gymStatus.reason}`
                : `Today: ${gymStatus.openingTime || '06:00 AM'} – ${gymStatus.closingTime || '10:00 PM'}`}
            </span>
            {gymStatus.hasTomorrowClosure && !gymStatus.isClosure && (
              <span className="text-[11px] font-semibold text-amber-700 mt-0.5">
                ⚠️ Tomorrow ({formatDate(gymStatus.tomorrowClosure?.date)}): Closed ({gymStatus.tomorrowClosure?.reason})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Gym Closed Banner if currently closed */}
      {gymStatus && !gymStatus.isOpen && (
        <NoticeBanner
          variant="warning"
          title={
            gymStatus.isClosure
              ? `GYM CLOSED TODAY (${formatDate(gymStatus.date || new Date())}) • Reason: ${gymStatus.reason}`
              : 'FACILITY CURRENTLY CLOSED'
          }
          message={
            gymStatus.isClosure
              ? 'Normal gym timings resume tomorrow. Physical training sessions are paused today.'
              : `Operating hours for today are ${gymStatus.openingTime || '06:00 AM'} – ${gymStatus.closingTime || '10:00 PM'}. Check-in is permitted only during open hours.`
          }
          secondaryText={gymStatus.isClosure && gymStatus.announcement ? `Notice: ${gymStatus.announcement}` : null}
        />
      )}

      {/* Advance Notice: Gym Closed Tomorrow (PART 3 & 4) */}
      {gymStatus && gymStatus.hasTomorrowClosure && !gymStatus.isClosure && (
        <NoticeBanner
          variant="warning"
          title={`GYM CLOSED TOMORROW (${formatDate(gymStatus.tomorrowClosure?.date)}) • Reason: ${gymStatus.tomorrowClosure?.reason}`}
          message="Advance notice for tomorrow's schedule. Check-ins operate as normal today."
          secondaryText={gymStatus.tomorrowClosure?.announcement ? `Notice: ${gymStatus.tomorrowClosure.announcement}` : null}
        />
      )}

      {/* Alert Messages */}
      {message && (
        <NoticeBanner
          variant="success"
          message={message}
          onClose={() => setMessage(null)}
        />
      )}

      {error && (
        <NoticeBanner
          variant="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Active Workout Source Selector (Part 8 & 9) */}
      <div className="flex flex-col items-center justify-center space-y-2">
        {activeWorkoutSource === 'trainer' ? (
          <div className="flex items-center space-x-3 bg-slate-100 p-1.5 rounded-full border border-gray-200">
            <button
              id="attendance-select-trainer"
              type="button"
              className="px-5 py-2 rounded-full font-semibold text-xs sm:text-sm bg-emerald-600 text-white shadow-sm cursor-default"
            >
              Trainer Assigned Workout
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3 bg-slate-100 p-1.5 rounded-full border border-gray-200">
            <button
              id="attendance-select-recommended"
              type="button"
              onClick={() => handleSwitchWorkoutSource('recommended')}
              className={`px-5 py-2 rounded-full font-semibold text-xs sm:text-sm transition-all cursor-pointer ${activeWorkoutSource === 'recommended'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
            >
              FitPulse Recommended
            </button>
            <button
              id="attendance-select-custom"
              type="button"
              onClick={() => handleSwitchWorkoutSource('custom')}
              className={`px-5 py-2 rounded-full font-semibold text-xs sm:text-sm transition-all cursor-pointer ${activeWorkoutSource === 'custom'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
            >
              My Custom Workout
            </button>
          </div>
        )}
      </div>

      {/* 7-Day Weekly Schedule Strip (Part 20) */}
      {weekSchedule && weekSchedule.length === 7 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">This Week Schedule</span>
            <span className="text-xs text-slate-500">{plannedWorkoutDays} Scheduled Workout Days &bull; {7 - plannedWorkoutDays} Rest Days</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {weekSchedule.map((slot, sIdx) => {
              const isWorkout = slot.type === 'workout';
              let badgeBg = 'bg-slate-100 text-slate-700';
              let badgeText = 'Rest Day';
              if (isWorkout) {
                if (slot.status === 'completed') {
                  badgeBg = 'bg-emerald-100 text-emerald-800';
                  badgeText = '✓ Completed';
                } else if (slot.status === 'made_up') {
                  badgeBg = 'bg-emerald-100 text-emerald-800';
                  badgeText = '✓ Made Up';
                } else if (slot.status === 'missed') {
                  badgeBg = 'bg-rose-100 text-rose-800';
                  badgeText = '✕ Missed';
                } else {
                  badgeBg = 'bg-slate-100 text-slate-700';
                  badgeText = '○ Scheduled';
                }
              }
              return (
                <div
                  key={sIdx}
                  className={`p-2.5 rounded-lg border transition-all ${slot.isToday ? 'ring-2 ring-emerald-500 bg-emerald-50/30 border-emerald-200' : 'bg-white border-gray-200'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800 uppercase">{slot.dayOfWeek.slice(0, 3)}</span>
                    {slot.isToday && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-600 text-white">
                        Today
                      </span>
                    )}
                  </div>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mb-1 ${badgeBg}`}>
                    {badgeText}
                  </span>
                  <p className="text-[11px] font-medium text-slate-700 truncate">
                    {isWorkout ? slot.workoutDayName : 'Rest Day'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's Workout Session Completed State (Rules 8, 10, 11, 12) */}
      {todayCompletedSession && !activeCheckIn && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 shadow-sm space-y-4">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              ✓ Session Finished
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Workout completed for today.
            </h2>
            <p className="text-sm text-slate-600">
              You have completed your daily workout session ({todayCompletedSession.workoutDayName || todayCompletedSession.scheduleDay || 'Workout Session'}). Great job staying consistent with your routine!
            </p>
            <div className="pt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600">
              <div className="px-3.5 py-1.5 bg-slate-50 border border-gray-200 rounded-md">
                <span className="text-slate-500">Duration:</span> <strong className="text-slate-900 ml-1">{formatDuration(todayCompletedSession.durationMinutes, false)}</strong>
              </div>
              <div className="px-3.5 py-1.5 bg-slate-50 border border-gray-200 rounded-md">
                <span className="text-slate-500">Exercises:</span> <strong className="text-slate-900 ml-1">{todayCompletedSession.totalCompleted || 0} / {todayCompletedSession.totalAssigned || 0} completed</strong>
              </div>
              <div className="px-3.5 py-1.5 bg-slate-50 border border-gray-200 rounded-md">
                <span className="text-slate-500">Completed At:</span> <strong className="text-slate-900 ml-1">{formatTime(todayCompletedSession.checkOutTime || todayCompletedSession.updatedAt)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rest Day Mode Card (Part 4, 6, 7) */}
      {isRestDay && !activeCheckIn && !todayCompletedSession && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 shadow-sm space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-gray-200">
              REST DAY
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Today is a scheduled rest day.
            </h2>
            <p className="text-sm text-slate-600">
              You have no scheduled workout today. Rest days are excluded from your consistency score and allow muscles to recover.
            </p>

            {/* Clear Choices: Option 1 (Take Rest) & Option 2 (Make Up a Missed Workout) */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <button
                id="take-rest-btn"
                type="button"
                onClick={() => {
                  setRestConfirmed(true);
                  setMessage('Enjoy your scheduled rest day! Proper recovery is key to fitness consistency.');
                }}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer border border-gray-300"
              >
                Take Rest
              </button>
            </div>
          </div>

          {/* Missed Workouts section for Make-Up (Part 7) */}
          {missedWorkouts && missedWorkouts.length > 0 && (
            <div className="pt-6 border-t border-gray-200 space-y-3 max-w-2xl mx-auto">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Missed Workouts Available for Make-Up ({missedWorkouts.length})
              </h3>
              <p className="text-xs text-slate-500">
                You missed scheduled workouts earlier this week. Completing a make-up workout fulfills the missed slot without adding an extra expected day.
              </p>
              <div className="space-y-2.5">
                {missedWorkouts.map((mw, mIdx) => (
                  <div
                    key={mIdx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-amber-50/60 border border-amber-200 gap-3"
                  >
                    <div>
                      <span className="text-xs font-bold text-amber-900 block">
                        You missed: {mw.workoutDayName} ({mw.dayOfWeek})
                      </span>
                      <span className="text-xs text-slate-600">
                        Focus: {mw.focus || 'Workout'} &bull; {mw.exercises?.length || 5} exercises
                      </span>
                    </div>
                    <button
                      id={`makeup-workout-btn-${mw.workoutDayNumber}`}
                      type="button"
                      disabled={actionLoading || (gymStatus !== null && !gymStatus.isOpen)}
                      onClick={() =>
                        handleCheckIn({
                          sessionType: 'makeup',
                          makeupForDayNumber: mw.workoutDayNumber,
                          dayNumber: mw.workoutDayNumber,
                        })
                      }
                      className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer shadow-sm self-start sm:self-auto ${gymStatus !== null && !gymStatus.isOpen
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'text-white bg-emerald-600 hover:bg-emerald-700'
                        }`}
                    >
                      {actionLoading
                        ? 'Starting...'
                        : (gymStatus !== null && !gymStatus.isOpen)
                          ? 'Gym Closed'
                          : 'Do Make-Up Workout'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today's Scheduled Workout Card if workout day and not checked in */}
      {!isRestDay && !activeCheckIn && !todayCompletedSession && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block mb-0.5">
                Today's Scheduled Workout &bull; {todaySchedule?.dayOfWeek || 'Today'}
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                {todaysWorkout?.workoutName || 'Workout Session'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Target Focus: <strong className="text-slate-800">{todaysWorkout?.focus || 'General Fitness'}</strong> &bull; {todaysWorkout?.exercises?.length || 5} Assigned Exercises
              </p>
            </div>
            <button
              id="check-in-btn"
              type="button"
              disabled={actionLoading || (gymStatus !== null && !gymStatus.isOpen)}
              onClick={() => handleCheckIn({ sessionType: 'scheduled', dayNumber: todaysWorkout?.dayNumber })}
              className={`px-6 py-2.5 text-sm font-bold rounded-lg shadow-sm self-start sm:self-auto transition-colors cursor-pointer ${gymStatus !== null && !gymStatus.isOpen
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
            >
              {actionLoading
                ? 'Processing...'
                : (gymStatus !== null && !gymStatus.isOpen)
                  ? (gymStatus.isClosure ? 'Gym Closed Today' : 'Gym Closed')
                  : 'CHECK IN'}
            </button>
          </div>

          {/* Exercise Preview */}
          {todaysWorkout?.exercises && todaysWorkout.exercises.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                Prescribed Exercises Preview
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {todaysWorkout.exercises.map((ex, exIdx) => (
                  <div key={exIdx} className="p-2.5 bg-slate-50 rounded border border-gray-200 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <ExerciseImage
                        name={ex.exerciseName}
                        className="w-8 h-8 shrink-0 object-contain rounded border border-gray-200 bg-white p-0.5"
                        fallbackClassName="w-8 h-8 shrink-0 rounded border border-gray-200 bg-white flex items-center justify-center text-[9px] text-slate-400 font-bold"
                      />
                      <span className="font-medium text-slate-800">{ex.exerciseName}</span>
                    </div>
                    <span className="text-slate-500 font-mono text-[11px]">{ex.sets} sets &bull; {ex.reps}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary and Check-In/Check-Out Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Simple Summary: This Month Total Gym Visits */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                This Month
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            </div>
            <h2 className="text-xs sm:text-sm font-medium text-slate-600">Total Gym Visits</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
              {loading ? '...' : isPreview ? '0 Visits' : `${thisMonthVisits} ${thisMonthVisits === 1 ? 'Visit' : 'Visits'}`}
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-gray-100">
            Recorded physical check-ins for the current calendar month.
          </p>
        </div>

        {/* Check In / Check Out Action Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Session Status
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${activeCheckIn
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 animate-pulse'
                    : todayCompletedSession
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-50 text-slate-600 border-gray-200'
                  }`}
              >
                {activeCheckIn ? 'Workout In Progress' : todayCompletedSession ? 'Completed Today' : 'Not Checked In'}
              </span>
            </div>

            <h2 className="text-base font-bold text-slate-900">
              {activeCheckIn ? 'Workout In Progress' : todayCompletedSession ? 'Workout Completed' : 'Ready to Workout?'}
            </h2>

            {activeCheckIn ? (
              <div className="mt-3 space-y-2 bg-slate-50 p-3.5 rounded-lg border border-gray-200 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Check In:</span>
                  <span className="font-semibold text-slate-900">{formatTime(activeCheckIn.checkInTime)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Current Session:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">{elapsedTimer}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Workout completion:</span>
                  <span className="font-bold text-slate-900">
                    {completedCount} / {totalAssigned} exercises
                  </span>
                </div>
              </div>
            ) : todayCompletedSession ? (
              <div className="mt-3 space-y-2 bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-200 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Session:</span>
                  <span className="font-semibold text-slate-900">{todayCompletedSession.workoutDayName || "Today's Session"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Completed:</span>
                  <span className="font-semibold text-emerald-700">{formatTime(todayCompletedSession.checkOutTime || todayCompletedSession.updatedAt)}</span>
                </div>
                <p className="text-slate-600 pt-1 border-t border-emerald-100">
                  You have completed your daily workout session for today. Limit is 1 workout per calendar day.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 mt-1">
                {isPreview
                  ? 'Your attendance tracking will appear here after membership activation.'
                  : isRestDay
                    ? 'Today is a scheduled rest day. Take rest or do a make-up workout.'
                    : 'Click Check In above or below when you arrive at the gym to record your attendance.'}
              </p>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-3">
            {isPreview ? (
              <button
                type="button"
                onClick={() => onNavigate?.('membership')}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 text-white text-xs sm:text-sm font-semibold rounded-md hover:bg-emerald-700 focus:outline-none cursor-pointer shadow-sm transition-colors"
              >
                Activate Membership to Check In
              </button>
            ) : activeCheckIn ? (
              <button
                id="check-out-btn"
                type="button"
                disabled={actionLoading}
                onClick={handleCheckOut}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white text-xs sm:text-sm font-semibold rounded-md hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 disabled:opacity-50 cursor-pointer shadow-sm transition-colors"
              >
                {actionLoading ? 'Processing...' : 'CHECK OUT'}
              </button>
            ) : todayCompletedSession ? (
              <button
                id="workout-completed-today-btn"
                type="button"
                disabled
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 text-slate-500 border border-slate-200 text-xs sm:text-sm font-semibold rounded-md cursor-not-allowed shadow-none"
              >
                ✓ Workout Completed for Today
              </button>
            ) : (
              <button
                id="check-in-btn-alt"
                type="button"
                disabled={actionLoading || (gymStatus !== null && !gymStatus.isOpen)}
                onClick={() => handleCheckIn({ sessionType: 'scheduled', dayNumber: todaysWorkout?.dayNumber })}
                className={`w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-md shadow-sm transition-colors ${gymStatus !== null && !gymStatus.isOpen
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer'
                  }`}
              >
                {actionLoading
                  ? 'Processing...'
                  : (gymStatus !== null && !gymStatus.isOpen)
                    ? (gymStatus.isClosure ? 'Gym Closed Today' : 'Gym Closed')
                    : 'CHECK IN'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Workout Session Exercise Checklist */}
      {activeCheckIn && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                Active Workout Exercises
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                {activeCheckIn.workoutDayName || "Today's Session Plan"}
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
              Completed: {completedCount} / {totalAssigned}
            </span>
          </div>

          {activeCheckIn.exercises && activeCheckIn.exercises.length > 0 ? (
            <div className="space-y-2.5">
              {activeCheckIn.exercises.map((ex, index) => {
                const exId = ex.exerciseId || ex._id || index;
                return (
                  <div
                    key={exId}
                    className={`flex items-center justify-between p-3.5 rounded-lg border transition-colors ${ex.isCompleted
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-white border-gray-200 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-mono font-medium text-slate-400 w-5">
                        #{index + 1}
                      </span>
                      <ExerciseImage
                        exercise={ex}
                        name={ex.exerciseName}
                        className="w-10 h-10 rounded border border-gray-200 bg-white p-1 object-contain flex-shrink-0"
                      />
                      <div>
                        <p
                          className={`text-sm font-semibold ${ex.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                        >
                          {ex.exerciseName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {ex.sets} {ex.sets === 1 ? 'set' : 'sets'} &bull; {ex.reps} reps
                        </p>
                      </div>
                    </div>

                    {ex.isCompleted ? (
                      <div
                        id={`exercise-completed-badge-${index}`}
                        className="flex items-center space-x-1.5 select-none bg-emerald-50 px-3 py-1.5 rounded border border-emerald-300 text-emerald-800 text-xs font-semibold shadow-xs"
                      >
                        <span>✓ Completed</span>
                      </div>
                    ) : (
                      <label className="flex items-center space-x-2 cursor-pointer select-none bg-white px-3 py-1.5 rounded border border-gray-200 hover:border-emerald-500">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => handleToggleExercise(exId)}
                          className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-700">Complete</span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-500 bg-slate-50 border border-dashed border-gray-200 rounded-md">
              No specific exercises assigned for this session. Complete your workout and check out when done.
            </div>
          )}
        </div>
      )}

      {/* Attendance History Table Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Attendance History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical record of your gym check-ins, check-outs, and session durations.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {records.length} {records.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading attendance records...
          </div>
        ) : isPreview ? (
          <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 border border-dashed border-gray-200 rounded-md">
            Your attendance tracking will appear here after membership activation.
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 border border-dashed border-gray-200 rounded-md">
            No attendance records logged yet. Check in above to start your gym visit history!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Check In</th>
                  <th className="py-3 px-4">Check Out</th>
                  <th className="py-3 px-4">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-slate-800">
                {records.map((rec) => {
                  const isActive = !rec.checkOutTime || rec.status === 'active';
                  return (
                    <tr
                      key={rec._id || rec.id}
                      className={isActive ? 'bg-emerald-50/40 font-medium' : 'hover:bg-slate-50/60'}
                    >
                      <td className="py-3 px-4 text-slate-900 whitespace-nowrap">
                        {formatDate(rec.checkInTime)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatTime(rec.checkInTime)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          formatTime(rec.checkOutTime)
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isActive ? (
                          <span className="text-emerald-700 font-semibold">In Progress</span>
                        ) : (
                          <span className="font-mono text-xs text-slate-700">
                            {formatDuration(rec.durationMinutes, false)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

export default AttendancePage;
