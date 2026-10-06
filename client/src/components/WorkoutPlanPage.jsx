import React, { useState, useEffect } from 'react';

function WorkoutPlanPage() {
  const [plan, setPlan] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [completingDay, setCompletingDay] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Editable profile parameters for rule-based workout regeneration
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [formGoal, setFormGoal] = useState('muscle_gain');
  const [formLevel, setFormLevel] = useState('intermediate');
  const [formDays, setFormDays] = useState(5);

  const fetchWorkoutPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/member/workout-plan', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to load workout plan');
      }

      if (result.status === 'success' && result.data) {
        setPlan(result.data.plan);
        if (result.data.profile) {
          setProfile(result.data.profile);
          setFormGoal(result.data.profile.fitnessGoal || 'muscle_gain');
          setFormLevel(result.data.profile.experienceLevel || 'intermediate');
          setFormDays(result.data.profile.plannedDaysPerWeek || 5);
        }
      }
    } catch (err) {
      console.error('Error fetching workout plan:', err);
      setError(err.message || 'Error loading workout plan from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkoutPlan();
  }, []);

  const handleUpdateProfileAndRegenerate = async (e) => {
    if (e) e.preventDefault();
    setUpdating(true);
    setError(null);
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/member/fitness-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fitnessGoal: formGoal,
          experienceLevel: formLevel,
          plannedDaysPerWeek: Number(formDays),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to update profile and generate plan');
      }

      if (result.data) {
        setPlan(result.data.plan);
        setProfile(result.data.profile);
        setSelectedDayIndex(0);
        setIsEditProfileOpen(false);
        setSuccessMessage(
          `New plan generated successfully for ${formatText(formLevel)} + ${formatText(formGoal)} (${formDays} Days/Week)!`
        );
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      console.error('Error updating workout plan:', err);
      setError(err.message || 'Failed to generate plan.');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleDayComplete = async (dayNumber) => {
    setCompletingDay(true);
    try {
      const token = localStorage.getItem('fitpulse_token');
      const res = await fetch(`/api/member/workout-plan/day/${dayNumber}/toggle-complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to update completion status');
      }

      if (result.data && result.data.plan) {
        setPlan(result.data.plan);
        const statusText = result.data.isCompleted ? 'marked as completed' : 'marked as incomplete';
        setSuccessMessage(`Day ${dayNumber} workout ${statusText}. Data saved in database.`);
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('Error toggling day completion:', err);
      setError(err.message || 'Failed to toggle workout completion.');
    } finally {
      setCompletingDay(false);
    }
  };

  const formatText = (text) => {
    if (!text) return '—';
    return text
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  if (loading) {
    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium text-slate-600">Loading your workout plan from database...</p>
      </main>
    );
  }

  if (error && !plan) {
    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white border border-red-200 rounded-lg p-6 text-center max-w-lg mx-auto shadow-sm">
          <p className="text-sm font-semibold text-red-600 mb-2">Unable to load workout plan</p>
          <p className="text-xs text-slate-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchWorkoutPlan}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </main>
    );
  }

  const daysList = plan?.days || [];
  const currentDay = daysList[selectedDayIndex] || daysList[0] || null;
  const isCurrentDayCompleted = currentDay?.isCompleted || false;

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Success Notification Banner */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm px-4 py-3 rounded-lg flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded inline-block mb-2">
              Member Program
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Workout Plan</h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {plan?.name || 'Personalized Fitness Routine'} &bull; Structured {daysList.length}-day schedule.
            </p>
            {plan?.assignedBy && (
              <div className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span>Assigned by Trainer: {plan.assignedBy.fullName || 'Trainer Marcus Vance'}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsEditProfileOpen(!isEditProfileOpen)}
            className="self-start sm:self-auto px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            {isEditProfileOpen ? 'Close Settings' : 'Change Fitness Profile'}
          </button>
        </div>
      </div>

      {/* Fitness Profile Overview & Rule-Based Generator Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">
            Active Fitness Profile Configuration
          </h2>
          <span className="text-xs text-slate-500 font-medium">Rule-Based Generator</span>
        </div>

        {/* Current Profile Summary Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 border border-gray-200 rounded-md">
            <span className="text-xs text-slate-500 uppercase font-semibold block mb-0.5">
              Fitness Goal
            </span>
            <span className="text-sm font-bold text-slate-900">
              {formatText(profile?.fitnessGoal || plan?.goal)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-gray-200 rounded-md">
            <span className="text-xs text-slate-500 uppercase font-semibold block mb-0.5">
              Experience Level
            </span>
            <span className="text-sm font-bold text-emerald-700">
              {formatText(profile?.experienceLevel || plan?.experienceLevel)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-gray-200 rounded-md">
            <span className="text-xs text-slate-500 uppercase font-semibold block mb-0.5">
              Planned Days Per Week
            </span>
            <span className="text-sm font-bold text-slate-900">
              {profile?.plannedDaysPerWeek || plan?.daysPerWeek || daysList.length} Days / Week
            </span>
          </div>
        </div>

        {/* Expandable Profile Change Form */}
        {isEditProfileOpen && (
          <form
            onSubmit={handleUpdateProfileAndRegenerate}
            className="pt-4 border-t border-gray-200 space-y-4 bg-slate-50 p-4 rounded-md"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Fitness Goal */}
              <div>
                <label htmlFor="goal-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Fitness Goal
                </label>
                <select
                  id="goal-select"
                  value={formGoal}
                  onChange={(e) => setFormGoal(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                >
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="fat_loss">Fat Loss</option>
                  <option value="strength">Strength</option>
                  <option value="general_fitness">General Fitness</option>
                  <option value="endurance">Endurance</option>
                </select>
              </div>

              {/* Experience Level */}
              <div>
                <label htmlFor="level-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Experience Level
                </label>
                <select
                  id="level-select"
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {/* Planned Days */}
              <div>
                <label htmlFor="days-select" className="block text-xs font-semibold text-slate-700 mb-1">
                  Planned Days Per Week
                </label>
                <select
                  id="days-select"
                  value={formDays}
                  onChange={(e) => setFormDays(Number(e.target.value))}
                  className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                >
                  <option value="2">2 Days / Week</option>
                  <option value="3">3 Days / Week</option>
                  <option value="4">4 Days / Week</option>
                  <option value="5">5 Days / Week</option>
                  <option value="6">6 Days / Week</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                {updating ? 'Generating Plan...' : 'Save Profile & Generate Plan'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Day Navigation Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Training Days ({daysList.length} Scheduled)
          </span>
          <span className="text-xs text-slate-500">Select day to view routine</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {daysList.map((dayItem, idx) => {
            const isSelected = selectedDayIndex === idx;
            const isCompleted = dayItem.isCompleted;

            return (
              <button
                key={dayItem.dayNumber || idx}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-colors border cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-600'
                    : 'bg-white text-slate-700 border-gray-200 hover:border-gray-300 hover:text-slate-900'
                }`}
              >
                <span>Day {dayItem.dayNumber || idx + 1}</span>
                {isCompleted && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    ✓ Done
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Routine & Exercises */}
      {currentDay ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-6">
          {/* Day Header with "Mark as Completed" Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Day {currentDay.dayNumber}
                </span>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs text-slate-500">{currentDay.focus}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {currentDay.dayName}
              </h2>
            </div>

            {/* Simple "Mark as Completed" action */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                disabled={completingDay}
                onClick={() => handleToggleDayComplete(currentDay.dayNumber)}
                className={`px-4 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-colors flex items-center space-x-2 cursor-pointer ${
                  isCurrentDayCompleted
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                } disabled:opacity-50`}
              >
                {isCurrentDayCompleted ? (
                  <>
                    <svg className="w-4 h-4 text-emerald-700" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>✓ Completed (Click to Undo)</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Mark as Completed</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Exercise List */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Prescribed Exercises ({currentDay.exercises?.length || 0})
            </h3>

            <div className="space-y-4">
              {currentDay.exercises && currentDay.exercises.length > 0 ? (
                currentDay.exercises.map((exercise, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 sm:p-5 bg-white shadow-xs flex flex-col sm:flex-row gap-4 items-start"
                  >
                    {/* Exercise Image */}
                    {exercise.imageUrl ? (
                      <img
                        src={exercise.imageUrl}
                        alt={exercise.exerciseName}
                        className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 object-contain rounded border border-gray-200 bg-slate-50 p-1"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded border border-gray-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400 font-bold">
                        GYM
                      </div>
                    )}

                    {/* Exercise Information */}
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <h4 className="text-base sm:text-lg font-bold text-slate-900">
                          {exercise.exerciseName}
                        </h4>
                        <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 self-start sm:self-auto">
                          {exercise.muscleGroup || 'Full Body'}
                        </span>
                      </div>

                      {/* Sets, Reps, Rest Badges */}
                      <div className="flex flex-wrap gap-2 pt-1 text-xs">
                        <div className="px-2.5 py-1 bg-slate-50 border border-gray-200 rounded text-slate-700">
                          <span className="text-slate-500">Sets:</span>{' '}
                          <span className="font-bold text-slate-900">{exercise.sets}</span>
                        </div>
                        <div className="px-2.5 py-1 bg-slate-50 border border-gray-200 rounded text-slate-700">
                          <span className="text-slate-500">Reps:</span>{' '}
                          <span className="font-bold text-slate-900 font-mono">{exercise.reps}</span>
                        </div>
                        <div className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-emerald-800">
                          <span className="text-emerald-700">Rest:</span>{' '}
                          <span className="font-bold">{exercise.restSeconds}s</span>
                        </div>
                      </div>

                      {/* Short Instruction */}
                      {exercise.instructions && (
                        <div className="mt-2 text-xs sm:text-sm text-slate-600 bg-slate-50/70 border border-gray-100 rounded p-2.5 leading-relaxed">
                          <span className="font-semibold text-slate-800">Instruction: </span>
                          {exercise.instructions}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-4">No exercises scheduled for this day.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-slate-500 text-sm">
          No workout day selected.
        </div>
      )}
    </main>
  );
}

export default WorkoutPlanPage;
