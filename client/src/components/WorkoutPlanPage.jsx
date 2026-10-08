import React, { useState, useEffect } from 'react';
import NoticeBanner from './NoticeBanner';
import ExerciseImage from './ExerciseImage';

const EXERCISE_LIBRARY = [
  'Barbell Flat Bench Press', 'Incline Dumbbell Press', 'Push-Ups', 'Dumbbell Chest Flyes',
  'Wide-Grip Lat Pulldown', 'Bent-Over Barbell Row', 'Seated Cable Row', 'Single-Arm Dumbbell Row',
  'Barbell Back Squats', 'Dumbbell Goblet Squats', 'Conventional Barbell Deadlift', 'Romanian Deadlifts (RDL)',
  'Leg Press Machine', 'Walking Dumbbell Lunges', 'Standing Calf Raises',
  'Overhead Dumbbell Press', 'Dumbbell Lateral Raises', 'Standing Barbell Curls', 'Dumbbell Hammer Curls',
  'Cable Triceps Rope Pushdown', 'Parallel Bar Tricep Dips',
  'Isometric Core Plank', 'Hanging Knee Raises', 'Dynamic Mountain Climbers'
];

function WorkoutPlanPage({ isPreview, onNavigate }) {
  const [recommendedPlan, setRecommendedPlan] = useState(null);
  const [customPlan, setCustomPlan] = useState(null);
  const [trainerPlan, setTrainerPlan] = useState(null);
  const [hasTrainerPlan, setHasTrainerPlan] = useState(false);
  const [trainerInfo, setTrainerInfo] = useState(null);
  const [activePlanType, setActivePlanType] = useState('recommended'); // 'recommended' | 'custom' | 'trainer'
  const [profile, setProfile] = useState(null);
  const [gymStatus, setGymStatus] = useState(null);
  const [activeCheckIn, setActiveCheckIn] = useState(null);
  const [todayCompletedSession, setTodayCompletedSession] = useState(null);
  const [hasCompletedWorkoutToday, setHasCompletedWorkoutToday] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [elapsedTimer, setElapsedTimer] = useState('00:00:00');
  
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isViewingRestDay, setIsViewingRestDay] = useState(false);
  const [selectedRestDayInfo, setSelectedRestDayInfo] = useState(null);
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

  // Custom Plan Builder State
  const [isBuildingCustom, setIsBuildingCustom] = useState(false);
  const [customPlanName, setCustomPlanName] = useState('My Custom Plan');
  const [customDays, setCustomDays] = useState([]);

  // Weekly Schedule Editor State (PART 5, 6, 7 & 8)
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState('');

  let plan = recommendedPlan;
  if (activePlanType === 'trainer') {
    plan = trainerPlan;
  } else if (activePlanType === 'custom') {
    plan = customPlan;
  }

  const formatClosureDate = (dateStr) => {
    if (!dateStr) return 'Tomorrow';
    try {
      const [y, m, d] = dateStr.split('-');
      const dt = new Date(Number(y), Number(m) - 1, Number(d));
      return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    try {
      return new Date(isoString).toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '--:--';
    }
  };

  const fetchWorkoutPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/member/workout-plan', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to load workout plan');
      }

      if (result.status === 'success' && result.data) {
        setRecommendedPlan(result.data.recommendedPlan || null);
        setCustomPlan(result.data.customPlan || null);
        setTrainerPlan(result.data.trainerPlan || null);
        setHasTrainerPlan(Boolean(result.data.hasTrainerPlan));
        setTrainerInfo(result.data.trainerInfo || null);
        setActiveCheckIn(result.data.activeCheckIn || null);
        setTodayCompletedSession(result.data.todayCompletedSession || null);
        setHasCompletedWorkoutToday(Boolean(result.data.hasCompletedWorkoutToday));
        
        if (result.data.profile) {
          setProfile(result.data.profile);
          setFormGoal(result.data.profile.fitnessGoal || 'muscle_gain');
          setFormLevel(result.data.profile.currentLevel || result.data.profile.experienceLevel || 'intermediate');
          setFormDays(result.data.profile.plannedDaysPerWeek || 5);
        }

        const savedSource = result.data.activeWorkoutSource || result.data.profile?.activeWorkoutSource || (result.data.profile?.trainerId ? 'trainer' : 'recommended');
        setActivePlanType(savedSource);
      }

      // Fetch live gym operating status in Asia/Kolkata
      try {
        const statusRes = await fetch('/api/member/gym-status', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
          },
        });
        const statusResult = await statusRes.json();
        if (statusRes.ok && statusResult.status === 'success' && statusResult.data) {
          setGymStatus(statusResult.data);
        }
      } catch (statusErr) {
        console.warn('Could not fetch gym status in WorkoutPlanPage:', statusErr);
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

    const handleSessionChange = () => {
      fetchWorkoutPlan();
    };
    window.addEventListener('fitpulse-session-change', handleSessionChange);
    return () => window.removeEventListener('fitpulse-session-change', handleSessionChange);
  }, []);

  // Poll active session status every 10s while checked in to detect automatic checkout at gym closing time
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
            setActiveCheckIn(null);
            fetchWorkoutPlan();
          } else {
            setActiveCheckIn(result.data.activeCheckIn);
          }
          if (result.data?.gymStatus) {
            setGymStatus(result.data.gymStatus);
          }
        }
      } catch (err) {}
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

  const handleCheckInFromWorkout = async (targetDayNumber) => {
    if (isPreview) {
      setError('Active membership required to check in. Please activate your membership.');
      return;
    }
    if (hasCompletedWorkoutToday || todayCompletedSession) {
      setError('You have already completed a workout session today. Limit is 1 workout session per calendar day.');
      return;
    }
    setCheckingIn(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/member/attendance/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify({
          workoutSource: activePlanType,
          sessionType: 'scheduled',
          dayNumber: targetDayNumber || currentDay?.dayNumber || 1,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to check in');
      }

      setActiveCheckIn(result.data);
      setSuccessMessage('Checked in successfully! Workout session is now in progress.');
      window.dispatchEvent(new Event('fitpulse-session-change'));
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(err.message || 'Check-in failed. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOutFromWorkout = async () => {
    setCheckingOut(true);
    setError(null);
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
        throw new Error(result.message || 'Failed to check out');
      }

      setActiveCheckIn(null);
      const dur = result.data?.durationMinutes || 0;
      setSuccessMessage(`Workout completed! Session duration: ${dur} min${dur === 1 ? '' : 's'}.`);
      window.dispatchEvent(new Event('fitpulse-session-change'));
      setTimeout(() => setSuccessMessage(''), 4000);
      fetchWorkoutPlan();
    } catch (err) {
      setError(err.message || 'Check-out failed. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleUpdateProfileAndRegenerate = async (e) => {
    if (e) e.preventDefault();
    setUpdating(true);
    setError(null);
    setSuccessMessage('');

    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/member/fitness-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify({
          fitnessGoal: formGoal,
          plannedDaysPerWeek: Number(formDays),
          plannedWorkoutDays: Number(formDays),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Unable to generate workout plan. Please try again.');
      }

      if (result.data && result.data.plan) {
        setRecommendedPlan(result.data.plan); 
        if (result.data.profile) {
          setProfile(result.data.profile);
          setFormGoal(result.data.profile.fitnessGoal || formGoal);
          setFormDays(result.data.profile.plannedDaysPerWeek || formDays);
          const activeLevel = result.data.profile?.currentLevel || result.data.profile?.experienceLevel || formLevel;
          setFormLevel(activeLevel);
        }
        setSelectedDayIndex(0);
        setIsViewingRestDay(false);
        setSelectedRestDayInfo(null);
        setIsEditProfileOpen(false);
        setSuccessMessage(
          `New plan generated successfully for ${formatText(formLevel)} + ${formatText(formGoal)} (${formDays} Days/Week)!`
        );
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        throw new Error('Unable to generate workout plan. Please try again.');
      }
    } catch (err) {
      console.error('Error updating workout plan:', err);
      setError('Unable to generate workout plan. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleDayComplete = async (dayNumber) => {
    if (isPreview) {
      setError('Active membership required to track workout completion. Please activate your membership.');
      return;
    }
    if (hasCompletedWorkoutToday || todayCompletedSession) {
      setError('You have already completed a workout session today. Limit is 1 workout session per calendar day.');
      return;
    }
    const targetDay = plan?.days?.find((d) => d.dayNumber === Number(dayNumber));
    if (targetDay?.isCompleted || isCurrentDayCompleted) {
      // Strict one-way completion: completed state is final and permanent
      return;
    }
    setCompletingDay(true);
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch(`/api/member/workout-plan/day/${dayNumber}/toggle-complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify({ planId: plan._id })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to update completion status');
      }

      if (result.data && result.data.plan) {
        if (activePlanType === 'trainer') {
          setTrainerPlan(result.data.plan);
        } else if (activePlanType === 'recommended') {
          setRecommendedPlan(result.data.plan);
        } else {
          setCustomPlan(result.data.plan);
        }
        setSuccessMessage(`Day ${dayNumber} workout marked as completed.`);
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('Error completing day:', err);
      setError(err.message || 'Failed to mark workout complete.');
    } finally {
      setCompletingDay(false);
    }
  };

  const handleSaveCustomPlan = async () => {
    setUpdating(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/member/workout-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify({
          name: customPlanName,
          daysPerWeek: customDays.length,
          days: customDays.map((d, i) => ({
            dayNumber: i + 1,
            dayName: d.dayName,
            focus: d.focus,
            exercises: d.exercises,
          })),
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to save custom plan');

      setSuccessMessage('Custom plan saved successfully!');
      setIsBuildingCustom(false);
      setSelectedDayIndex(0);
      fetchWorkoutPlan();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const addCustomDay = () => {
    setCustomDays([...customDays, {
      dayName: `Day ${customDays.length + 1}`,
      focus: 'Full Body',
      exercises: []
    }]);
  };

  const addCustomExercise = (dayIndex) => {
    const newDays = [...customDays];
    newDays[dayIndex].exercises.push({
      exerciseName: EXERCISE_LIBRARY[0],
      sets: 3,
      reps: '10',
      restSeconds: 60
    });
    setCustomDays(newDays);
  };

  const updateCustomExercise = (dayIndex, exIndex, field, value) => {
    const newDays = [...customDays];
    newDays[dayIndex].exercises[exIndex][field] = value;
    setCustomDays(newDays);
  };
  
  const removeCustomExercise = (dayIndex, exIndex) => {
    const newDays = [...customDays];
    newDays[dayIndex].exercises.splice(exIndex, 1);
    setCustomDays(newDays);
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
        <p className="text-sm font-medium text-slate-600">Loading your workout plans...</p>
      </main>
    );
  }

  const handleSelectWorkoutSource = async (newSource) => {
    if (activePlanType === 'trainer' || hasAssignedTrainer) return;
    setActivePlanType(newSource);
    setIsBuildingCustom(false);
    setSelectedDayIndex(0);
    setIsViewingRestDay(false);

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
    } catch (err) {
      console.warn('Could not persist workout source preference:', err);
    }
  };

  const getAvailableSlotsForSource = (source) => {
    const target = source === 'custom' ? customPlan : recommendedPlan;
    if (target?.days && target.days.length > 0) {
      return target.days;
    }
    return [
      { dayNumber: 1, dayName: 'Day 1: Upper Body / Push' },
      { dayNumber: 2, dayName: 'Day 2: Lower Body / Legs' },
      { dayNumber: 3, dayName: 'Day 3: Pull / Back & Core' },
      { dayNumber: 4, dayName: 'Day 4: Hypertrophy Split' },
      { dayNumber: 5, dayName: 'Day 5: Full Body / Conditioning' },
    ];
  };

  const handleOpenScheduleEditor = () => {
    const currentSchedule = plan?.weekSchedule || [];
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    const initialForm = validDays.map((dayName, idx) => {
      const existing = currentSchedule.find((s) => s.dayOfWeek === dayName || s.dayIndex === idx);
      if (existing) {
        return {
          dayOfWeek: dayName,
          dayIndex: idx,
          type: existing.type,
          workoutSource: existing.workoutSource || (activePlanType === 'custom' ? 'custom' : 'recommended'),
          workoutDayNumber: existing.workoutDayNumber || 1,
          workoutDayName: existing.workoutDayName || `Day ${existing.workoutDayNumber || 1}`,
          focus: existing.focus || '',
        };
      }
      const isW = idx < (profile?.plannedDaysPerWeek || 5);
      return {
        dayOfWeek: dayName,
        dayIndex: idx,
        type: isW ? 'workout' : 'rest',
        workoutSource: activePlanType,
        workoutDayNumber: isW ? idx + 1 : null,
        workoutDayName: isW ? `Day ${idx + 1}` : 'Rest Day',
        focus: isW ? 'Workout' : 'Rest & Recovery',
      };
    });

    setScheduleForm(initialForm);
    setScheduleError('');
    setIsEditingSchedule(true);
  };

  const handleScheduleDayTypeChange = (idx, type) => {
    setScheduleForm((prev) => {
      const updated = [...prev];
      const day = { ...updated[idx], type };
      if (type === 'rest') {
        day.workoutDayNumber = null;
        day.workoutDayName = 'Rest Day';
        day.focus = 'Rest & Recovery';
      } else {
        const slots = getAvailableSlotsForSource(day.workoutSource || 'recommended');
        const defaultSlot = slots[idx % slots.length] || slots[0];
        day.workoutDayNumber = defaultSlot.dayNumber;
        day.workoutDayName = defaultSlot.dayName;
        day.focus = defaultSlot.focus || 'Workout';
      }
      updated[idx] = day;
      return updated;
    });
  };

  const handleScheduleDaySourceChange = (idx, source) => {
    setScheduleForm((prev) => {
      const updated = [...prev];
      const day = { ...updated[idx], workoutSource: source };
      const slots = getAvailableSlotsForSource(source);
      const chosen = slots[0];
      day.workoutDayNumber = chosen.dayNumber;
      day.workoutDayName = chosen.dayName;
      day.focus = chosen.focus || 'Workout';
      updated[idx] = day;
      return updated;
    });
  };

  const handleScheduleDaySlotChange = (idx, dayNum) => {
    setScheduleForm((prev) => {
      const updated = [...prev];
      const day = { ...updated[idx] };
      const slots = getAvailableSlotsForSource(day.workoutSource || 'recommended');
      const found = slots.find((s) => s.dayNumber === dayNum) || slots[0];
      day.workoutDayNumber = found.dayNumber;
      day.workoutDayName = found.dayName;
      day.focus = found.focus || 'Workout';
      updated[idx] = day;
      return updated;
    });
  };

  const handleSaveWeeklySchedule = async () => {
    setSavingSchedule(true);
    setScheduleError('');
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/member/weekly-schedule', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify({ weekSchedule: scheduleForm }),
      });

      const result = await res.json();
      if (!res.ok || result.status !== 'success') {
        throw new Error(result.message || 'Unable to save your weekly routine. Please try again.');
      }

      if (result.data?.weekSchedule) {
        if (recommendedPlan) {
          setRecommendedPlan({
            ...recommendedPlan,
            weekSchedule: result.data.weekSchedule,
            daysPerWeek: result.data.plannedDaysPerWeek || recommendedPlan.daysPerWeek,
          });
        }
        if (customPlan) {
          setCustomPlan({
            ...customPlan,
            weekSchedule: result.data.weekSchedule,
            daysPerWeek: result.data.plannedDaysPerWeek || customPlan.daysPerWeek,
          });
        }
      }
      setIsEditingSchedule(false);
      setSuccessMessage('Weekly routine schedule saved successfully!');
    } catch (err) {
      console.error('Error saving weekly schedule:', err);
      setScheduleError(err.message || 'Unable to save your weekly routine. Please try again.');
    } finally {
      setSavingSchedule(false);
    }
  };

  // Common UI: Tab Switching
  const hasAssignedTrainer = Boolean(profile?.trainerId || profile?.fitness?.trainerId || activePlanType === 'trainer');
  const assignedTrainerName = trainerInfo?.fullName || profile?.fitness?.trainer?.fullName || profile?.trainer?.fullName || 'Personal Trainer';

  const renderTabSwitcher = () => (
    <div className="flex flex-col items-center justify-center space-y-2 mb-8">
      {hasAssignedTrainer ? (
        <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-100 p-1.5 rounded-2xl sm:rounded-full border border-gray-200">
          <button
            id="select-trainer-source-btn"
            type="button"
            className="px-6 py-2 rounded-full font-semibold text-xs sm:text-sm bg-emerald-600 text-white shadow-sm cursor-default"
          >
            Trainer Assigned Workout
          </button>
          <button
            id="select-recommended-source-btn"
            type="button"
            disabled
            title="Available after trainer removal"
            className="px-5 py-2 rounded-full font-semibold text-xs sm:text-sm text-slate-400 bg-transparent cursor-not-allowed"
          >
            FitPulse Recommended <span className="text-[10px] hidden sm:inline text-slate-400">(Available after trainer removal)</span>
          </button>
          <button
            id="select-custom-source-btn"
            type="button"
            disabled
            title="Available after trainer removal"
            className="px-5 py-2 rounded-full font-semibold text-xs sm:text-sm text-slate-400 bg-transparent cursor-not-allowed"
          >
            My Custom Workout <span className="text-[10px] hidden sm:inline text-slate-400">(Available after trainer removal)</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center space-x-3 bg-slate-100 p-1.5 rounded-full border border-gray-200">
          <button
            id="select-recommended-source-btn"
            onClick={() => handleSelectWorkoutSource('recommended')}
            className={`px-6 py-2 rounded-full font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
              activePlanType === 'recommended'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            FitPulse Recommended
          </button>
          <button
            id="select-custom-source-btn"
            onClick={() => handleSelectWorkoutSource('custom')}
            className={`px-6 py-2 rounded-full font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
              activePlanType === 'custom'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            My Custom Workout
          </button>
        </div>
      )}
    </div>
  );

  // Render Custom Plan Builder
  if (activePlanType === 'custom' && isBuildingCustom) {
    return (
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {renderTabSwitcher()}
        
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Custom Plan Builder</h1>
          <button onClick={() => setIsBuildingCustom(false)} className="text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
            &larr; Back to plan view
          </button>
        </div>

        {error && (
          <NoticeBanner
            variant="error"
            message={error}
          />
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Name</label>
            <input
              type="text"
              value={customPlanName}
              onChange={(e) => setCustomPlanName(e.target.value)}
              className="w-full max-w-sm px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-6">
            {customDays.map((day, dIdx) => (
              <div key={dIdx} className="bg-slate-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <input
                    type="text"
                    value={day.dayName}
                    onChange={(e) => {
                      const newDays = [...customDays];
                      newDays[dIdx].dayName = e.target.value;
                      setCustomDays(newDays);
                    }}
                    className="font-bold text-slate-900 bg-transparent border-b border-gray-300 focus:border-emerald-600 focus:outline-none px-1"
                  />
                  <input
                    type="text"
                    value={day.focus}
                    onChange={(e) => {
                      const newDays = [...customDays];
                      newDays[dIdx].focus = e.target.value;
                      setCustomDays(newDays);
                    }}
                    placeholder="Focus (e.g. Chest)"
                    className="text-xs text-slate-600 bg-white border border-gray-300 rounded px-2 py-1 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-3">
                  {day.exercises.map((ex, exIdx) => (
                    <div key={exIdx} className="flex flex-wrap items-center gap-2 bg-white p-2 border border-gray-200 rounded shadow-xs">
                      <select
                        value={ex.exerciseName}
                        onChange={(e) => updateCustomExercise(dIdx, exIdx, 'exerciseName', e.target.value)}
                        className="flex-1 min-w-[150px] text-xs px-2 py-1.5 bg-white border border-gray-300 rounded focus:outline-none focus:border-emerald-600"
                      >
                        {EXERCISE_LIBRARY.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                      
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-slate-500 font-semibold uppercase">Sets</label>
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={(e) => updateCustomExercise(dIdx, exIdx, 'sets', Number(e.target.value))}
                          className="w-12 text-xs px-2 py-1.5 border border-gray-300 rounded text-center focus:border-emerald-600 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-slate-500 font-semibold uppercase">Reps</label>
                        <input
                          type="text"
                          value={ex.reps}
                          onChange={(e) => updateCustomExercise(dIdx, exIdx, 'reps', e.target.value)}
                          className="w-16 text-xs px-2 py-1.5 border border-gray-300 rounded text-center focus:border-emerald-600 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-slate-500 font-semibold uppercase">Rest(s)</label>
                        <input
                          type="number"
                          value={ex.restSeconds}
                          onChange={(e) => updateCustomExercise(dIdx, exIdx, 'restSeconds', Number(e.target.value))}
                          className="w-12 text-xs px-2 py-1.5 border border-gray-300 rounded text-center focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                      
                      <button onClick={() => removeCustomExercise(dIdx, exIdx)} className="text-red-500 hover:text-red-700 px-2 cursor-pointer">
                        &times;
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => addCustomExercise(dIdx)}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    + Add Exercise
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={addCustomDay}
              className="w-full py-3 border-2 border-dashed border-gray-300 text-sm font-semibold text-slate-500 rounded-lg hover:border-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              + Add Training Day
            </button>
          </div>
          
          <div className="pt-6 border-t border-gray-200">
            <button
              onClick={handleSaveCustomPlan}
              disabled={updating || customDays.length === 0}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {updating ? 'Saving...' : 'Save Custom Plan'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- No Plan UI ---
  if (!plan || (activePlanType === 'trainer' && (!plan.days || plan.days.length === 0))) {
    if (activePlanType === 'trainer') {
      return (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {renderTabSwitcher()}
          <div className="bg-white border border-gray-200 rounded-lg p-10 shadow-sm text-center max-w-2xl mx-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 font-bold text-2xl flex items-center justify-center mx-auto border border-emerald-200">
              🏋️
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 mb-2">
                TRAINER ASSIGNED
              </span>
              <h2 className="text-2xl font-bold text-slate-900">
                Your trainer has not assigned a workout plan yet.
              </h2>
              <p className="text-slate-600 mt-2 text-sm">
                Assigned Trainer: <strong className="text-slate-900">{assignedTrainerName}</strong>
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Your trainer will assign your workout soon. As soon as your coach saves your personalized routine in the trainer portal, it will immediately appear here.
              </p>
            </div>
          </div>
        </main>
      );
    }
    if (activePlanType === 'recommended') {
      return (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {renderTabSwitcher()}
          <div className="bg-white border border-gray-200 rounded-lg p-10 shadow-sm text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">No Recommended Plan Found</h2>
            <p className="text-slate-600 mb-6 text-sm">Set your fitness goals and we will generate a personalized rule-based plan for you instantly.</p>
            
            <form onSubmit={handleUpdateProfileAndRegenerate} className="text-left space-y-4 bg-slate-50 p-6 rounded-md border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fitness Goal</label>
                  <select value={formGoal} onChange={(e) => setFormGoal(e.target.value)} className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-emerald-600">
                    <option value="muscle_gain">Muscle Gain</option>
                    <option value="fat_loss">Fat Loss</option>
                    <option value="strength">Strength</option>
                    <option value="general_fitness">General Fitness</option>
                    <option value="endurance">Endurance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Fitness Level</label>
                  <div className="w-full text-xs sm:text-sm bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-slate-800 font-bold flex flex-col justify-center">
                    <span>{formatText(profile?.currentLevel || profile?.experienceLevel || formLevel)}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Planned Days</label>
                  <select value={formDays} onChange={(e) => setFormDays(Number(e.target.value))} className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-emerald-600">
                    <option value="2">2 Days</option>
                    <option value="3">3 Days</option>
                    <option value="4">4 Days</option>
                    <option value="5">5 Days</option>
                    <option value="6">6 Days</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={updating} className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm">
                {updating ? 'Generating...' : 'Save & Generate'}
              </button>
            </form>
          </div>
        </main>
      );
    } else {
      return (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {renderTabSwitcher()}
          <div className="bg-white border border-gray-200 rounded-lg p-10 shadow-sm text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">You haven't built a plan yet</h2>
            <p className="text-slate-600 mb-6 text-sm">Create a completely custom workout routine step by step.</p>
            <button
              onClick={() => {
                setCustomDays([]);
                setCustomPlanName('My Custom Plan');
                setIsBuildingCustom(true);
              }}
              className="px-6 py-3 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm cursor-pointer"
            >
              Start Building Now
            </button>
          </div>
        </main>
      );
    }
  }

  // --- View Plan UI ---
  const daysList = plan?.days || [];
  const currentDay = daysList[selectedDayIndex] || daysList[0] || null;
  const isCurrentDayCompleted = currentDay?.isCompleted || false;

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Feature Preview Banner */}
      {isPreview && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                Preview — activate membership to use your personal plan
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              FitPulse creates a workout plan based on your goal, experience level and planned training days.
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              The plan below illustrates your target program split. Activate your membership to track live sessions and log completion.
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

      {renderTabSwitcher()}

      {/* Tomorrow Gym Closure Warning (PART 13) */}
      {gymStatus?.hasTomorrowClosure && !gymStatus?.isClosure && (
        <NoticeBanner
          variant="warning"
          title={`GYM CLOSED TOMORROW (${formatClosureDate(gymStatus.tomorrowClosure?.date)}) • Reason: ${gymStatus.tomorrowClosure?.reason}`}
          message="Your gym is closed tomorrow. Your scheduled workout may need to be moved to another day."
          secondaryText={gymStatus.tomorrowClosure?.announcement ? `Notice: ${gymStatus.tomorrowClosure.announcement}` : null}
        />
      )}

      {/* Today Gym Closure Notice */}
      {gymStatus?.isClosure && (
        <NoticeBanner
          variant="warning"
          title={`GYM CLOSED TODAY (${formatClosureDate(gymStatus.todayDate)}) • Reason: ${gymStatus.reason}`}
          message="Normal gym timings resume tomorrow. Physical training sessions are paused today."
          secondaryText={gymStatus.announcement ? `Notice: ${gymStatus.announcement}` : null}
        />
      )}

      {successMessage && (
        <NoticeBanner
          variant="success"
          message={successMessage}
          onClose={() => setSuccessMessage('')}
        />
      )}

      {/* Active Workout Session Banner when checked in (PART 3 & 15) */}
      {activeCheckIn && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Workout In Progress
                </span>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs font-mono font-bold text-emerald-700">{elapsedTimer}</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Checked in at <strong>{formatTime(activeCheckIn.checkInTime)}</strong> &bull; {activeCheckIn.workoutDayName || "Today's Session"} &bull; {activeCheckIn.totalCompleted || 0} / {activeCheckIn.totalAssigned || 5} exercises completed
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              type="button"
              id="workout-view-attendance-btn"
              onClick={() => onNavigate?.('attendance')}
              className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-white border border-emerald-300 rounded hover:bg-emerald-50 transition-colors cursor-pointer"
            >
              View in Attendance &rarr;
            </button>
            <button
              type="button"
              id="workout-banner-checkout-btn"
              disabled={checkingOut}
              onClick={handleCheckOutFromWorkout}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {checkingOut ? 'Checking Out...' : 'CHECK OUT'}
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded inline-block bg-emerald-50 text-emerald-800 border border-emerald-200">
                {activePlanType === 'trainer'
                  ? 'Trainer Assigned Program'
                  : plan?.planType === 'custom'
                  ? 'Custom Program'
                  : 'Recommended Program'}
              </span>
              {activePlanType === 'trainer' && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Assigned by Trainer: {plan?.assignedByName || assignedTrainerName}
                </span>
              )}
              {isPreview && (
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Preview Mode
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Workout Plan</h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              <strong className="text-slate-800 font-semibold">{plan?.name || 'Personalized Fitness Routine'}</strong> &bull; Structured {daysList.length}-day schedule.
            </p>
          </div>

          {!isPreview && activePlanType === 'recommended' && (
            <button
              id="edit-settings-btn"
              onClick={() => setIsEditProfileOpen(!isEditProfileOpen)}
              className="self-start sm:self-auto px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              {isEditProfileOpen ? 'Close Settings' : 'Edit Settings'}
            </button>
          )}

          {!isPreview && activePlanType === 'custom' && (
            <button
              onClick={() => {
                setCustomPlanName(plan.name);
                setCustomDays(plan.days);
                setIsBuildingCustom(true);
              }}
              className="self-start sm:self-auto px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              Edit Custom Plan
            </button>
          )}
        </div>
      </div>

      {/* Fitness Profile Overview & Rule-Based Generator Settings */}
      {activePlanType === 'recommended' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Active Fitness Profile Configuration</h2>
            <span className="text-xs text-slate-500 font-medium">Rule-Based Generator</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-gray-200 rounded-md">
              <span className="text-xs text-slate-500 uppercase font-semibold block mb-0.5">Fitness Goal</span>
              <span className="text-sm font-bold text-slate-900">{formatText(profile?.fitnessGoal || plan?.goal)}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-gray-200 rounded-md">
              <span className="text-xs text-slate-500 uppercase font-semibold block mb-0.5">Current Fitness Level</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-emerald-700">{formatText(profile?.currentLevel || profile?.experienceLevel || plan?.experienceLevel)}</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-gray-200 rounded-md">
              <span className="text-xs text-slate-500 uppercase font-semibold block mb-0.5">Planned Days</span>
              <span className="text-sm font-bold text-slate-900">{profile?.plannedDaysPerWeek || plan?.daysPerWeek || daysList.length} Days / Week</span>
            </div>
          </div>
          {isEditProfileOpen && (
            <form onSubmit={handleUpdateProfileAndRegenerate} className="pt-4 border-t border-gray-200 space-y-4 bg-slate-50 p-4 rounded-md">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fitness Goal</label>
                  <select value={formGoal} onChange={(e) => setFormGoal(e.target.value)} className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600">
                    <option value="muscle_gain">Muscle Gain</option>
                    <option value="fat_loss">Fat Loss</option>
                    <option value="strength">Strength</option>
                    <option value="general_fitness">General Fitness</option>
                    <option value="endurance">Endurance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Fitness Level</label>
                  <div className="w-full text-xs sm:text-sm bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-slate-800 font-bold flex flex-col justify-center">
                    <span>{formatText(profile?.currentLevel || profile?.experienceLevel || formLevel)}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Planned Days</label>
                  <select value={formDays} onChange={(e) => setFormDays(Number(e.target.value))} className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600">
                    <option value="2">2 Days</option>
                    <option value="3">3 Days</option>
                    <option value="4">4 Days</option>
                    <option value="5">5 Days</option>
                    <option value="6">6 Days</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setIsEditProfileOpen(false)} className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">Cancel</button>
                <button type="submit" disabled={updating} className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
                  {updating ? 'Generating...' : 'Save & Generate'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 7-Day Weekly Schedule View (Part 20) */}
      {plan?.weekSchedule && plan.weekSchedule.length === 7 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">This Week Schedule</span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500">{profile?.plannedDaysPerWeek || plan?.daysPerWeek || daysList.length} Workout Days &bull; {7 - (profile?.plannedDaysPerWeek || plan?.daysPerWeek || daysList.length)} Rest Days</span>
            </div>
            <div className="flex items-center space-x-3">
              {!isPreview && activePlanType !== 'trainer' && (
                <button
                  id="edit-weekly-routine-btn"
                  type="button"
                  onClick={handleOpenScheduleEditor}
                  className="px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  ✎ Edit Weekly Routine
                </button>
              )}
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Click day to view</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {plan.weekSchedule.map((slot, sIdx) => {
              const isWorkout = slot.type === 'workout';
              const isSlotToday = slot.isToday;
              const isRestActive = isViewingRestDay && selectedRestDayInfo?.dayIndex === sIdx;
              const isWorkoutActive = !isViewingRestDay && selectedDayIndex === (slot.workoutDayNumber ? slot.workoutDayNumber - 1 : 0);

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
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => {
                    if (isWorkout) {
                      setIsViewingRestDay(false);
                      setSelectedRestDayInfo(null);
                      const targetIdx = daysList.findIndex((d) => d.dayNumber === slot.workoutDayNumber);
                      setSelectedDayIndex(targetIdx >= 0 ? targetIdx : 0);
                    } else {
                      setIsViewingRestDay(true);
                      setSelectedRestDayInfo(slot);
                    }
                  }}
                  className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSlotToday ? 'ring-2 ring-emerald-500' : ''
                  } ${
                    (!isWorkout && isRestActive) || (isWorkout && isWorkoutActive)
                      ? isWorkout ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-100 border-slate-400'
                      : !isWorkout
                      ? 'bg-slate-50/80 border-gray-200 hover:bg-slate-100'
                      : 'bg-white border-gray-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{slot.dayOfWeek.slice(0, 3)}</span>
                    {isSlotToday && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-600 text-white">
                        Today
                      </span>
                    )}
                  </div>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold mb-1 ${badgeBg}`}>
                    {badgeText}
                  </span>
                  <p className="text-[11px] font-medium text-slate-700 truncate">
                    {isWorkout ? slot.workoutDayName : 'Rest & Recovery'}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Schedule Editor Drawer / Card */}
          {isEditingSchedule && (
            <div className="bg-slate-50 border border-emerald-300 rounded-lg p-5 mt-4 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit 7-Day Weekly Routine</h3>
                  <p className="text-xs text-slate-600">
                    Configure each day of the week as a Rest Day or assign a specific workout from FitPulse Recommended or My Custom Workout.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingSchedule(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              {scheduleError && (
                <NoticeBanner
                  variant="error"
                  message={scheduleError}
                />
              )}

              <div className="space-y-3">
                {scheduleForm.map((dayItem, dIdx) => (
                  <div
                    key={dayItem.dayOfWeek}
                    className="bg-white border border-gray-200 rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="w-32 shrink-0">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
                        {dayItem.dayOfWeek}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {dayItem.type === 'workout' ? 'Workout' : 'Rest Day'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 flex-1">
                      {/* Type selector: Rest or Workout */}
                      <div className="flex items-center space-x-2">
                        <label className="text-xs font-semibold text-slate-700">Type:</label>
                        <select
                          value={dayItem.type}
                          onChange={(e) => handleScheduleDayTypeChange(dIdx, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="rest">Rest Day</option>
                          <option value="workout">Workout</option>
                        </select>
                      </div>

                      {dayItem.type === 'workout' && (
                        <>
                          {/* Source selector: Recommended or Custom */}
                          <div className="flex items-center space-x-2">
                            <label className="text-xs font-semibold text-slate-700">Source:</label>
                            <select
                              value={dayItem.workoutSource || 'recommended'}
                              onChange={(e) => handleScheduleDaySourceChange(dIdx, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                              <option value="recommended">FitPulse Recommended</option>
                              <option value="custom">My Custom Workout</option>
                            </select>
                          </div>

                          {/* Workout slot selector */}
                          <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
                            <label className="text-xs font-semibold text-slate-700">Routine Day:</label>
                            <select
                              value={dayItem.workoutDayNumber || 1}
                              onChange={(e) => handleScheduleDaySlotChange(dIdx, Number(e.target.value))}
                              className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white text-slate-800 font-medium flex-1 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 truncate"
                            >
                              {getAvailableSlotsForSource(dayItem.workoutSource || 'recommended').map((slot) => (
                                <option key={slot.dayNumber} value={slot.dayNumber}>
                                  {slot.dayName} {slot.focus ? `(${slot.focus})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsEditingSchedule(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="save-weekly-routine-btn"
                  disabled={savingSchedule}
                  onClick={handleSaveWeeklySchedule}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-xs flex items-center space-x-2"
                >
                  {savingSchedule ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Saving Schedule...</span>
                    </>
                  ) : (
                    <span>Save Weekly Routine</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Day Navigation Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Training Routine Days ({daysList.length})</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {daysList.map((dayItem, idx) => {
            const isSelected = !isViewingRestDay && selectedDayIndex === idx;
            const isCompleted = dayItem.isCompleted;
            return (
              <button
                key={dayItem.dayNumber || idx}
                onClick={() => {
                  setIsViewingRestDay(false);
                  setSelectedRestDayInfo(null);
                  setSelectedDayIndex(idx);
                }}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-md text-xs sm:text-sm font-semibold transition-colors border cursor-pointer ${isSelected ? 'bg-emerald-50 text-emerald-800 border-emerald-600' : 'bg-white text-slate-700 border-gray-200 hover:border-gray-300 hover:text-slate-900'}`}
              >
                <span>{dayItem.dayName || `Day ${idx + 1}`}</span>
                {isCompleted && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">✓ Done</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Routine or Rest Day Display */}
      {isViewingRestDay ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 text-slate-700 mx-auto">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
              {selectedRestDayInfo?.dayOfWeek || 'Scheduled Rest'}
            </span>
            <h2 className="text-2xl font-bold text-slate-900">REST DAY</h2>
            <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Today is a scheduled rest day. Rest and recovery allow muscle fibers to repair and strengthen.
            </p>
          </div>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            Rest days are excluded from your consistency calculations and never penalize your score.
          </p>
        </div>
      ) : currentDay ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Day {currentDay.dayNumber}</span>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs text-slate-500">{currentDay.focus || 'Full Body'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{currentDay.dayName}</h2>
            </div>
            <div className="flex items-center space-x-3">
              {isCurrentDayCompleted ? (
                <div
                  id="day-completed-badge"
                  className="px-4 py-2.5 rounded-md text-xs sm:text-sm font-semibold flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-300 select-none shadow-xs"
                >
                  <span>✓ Completed</span>
                </div>
              ) : activeCheckIn ? (
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 animate-pulse">
                    Workout In Progress &bull; {elapsedTimer}
                  </span>
                  <button
                    type="button"
                    id="workout-page-checkout-btn"
                    disabled={checkingOut}
                    onClick={handleCheckOutFromWorkout}
                    className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {checkingOut ? 'Checking Out...' : 'CHECK OUT'}
                  </button>
                </div>
              ) : hasCompletedWorkoutToday ? (
                <div className="flex items-center space-x-2">
                  <span
                    id="workout-completed-today-badge"
                    className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    ✓ Workout Completed for Today
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    id="workout-page-check-in-btn"
                    disabled={checkingIn || (gymStatus !== null && !gymStatus.isOpen)}
                    onClick={() => handleCheckInFromWorkout(currentDay.dayNumber)}
                    className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-md transition-colors cursor-pointer shadow-xs ${
                      gymStatus !== null && !gymStatus.isOpen
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {checkingIn
                      ? 'Checking In...'
                      : gymStatus !== null && !gymStatus.isOpen
                      ? (gymStatus.isClosure ? 'Gym Closed Today' : 'Gym Closed')
                      : 'CHECK IN'}
                  </button>
                  <button
                    type="button"
                    id="mark-day-complete-btn"
                    onClick={() => handleToggleDayComplete(currentDay.dayNumber)}
                    disabled={completingDay}
                    className="px-3 py-2 text-xs sm:text-sm font-semibold transition-colors flex items-center space-x-1 cursor-pointer bg-white text-slate-700 hover:bg-slate-100 border border-gray-300 disabled:opacity-50 shadow-xs"
                  >
                    <span>{completingDay ? 'Marking Complete...' : 'Mark as Completed'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Prescribed Exercises ({currentDay.exercises?.length || 0})</h3>
            <div className="space-y-4">
              {currentDay.exercises && currentDay.exercises.length > 0 ? (
                currentDay.exercises.map((exercise, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 sm:p-5 bg-white shadow-xs flex flex-col sm:flex-row gap-4 items-start">
                    <ExerciseImage
                      exercise={exercise}
                      name={exercise.exerciseName}
                      className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 object-contain rounded border border-gray-200 bg-slate-50 p-1"
                    />
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <h4 className="text-base sm:text-lg font-bold text-slate-900">{exercise.exerciseName}</h4>
                        {exercise.muscleGroup && (
                          <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 self-start sm:self-auto">{exercise.muscleGroup}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1 text-xs">
                        <div className="px-2.5 py-1 bg-slate-50 border border-gray-200 rounded text-slate-700"><span className="text-slate-500">Sets:</span> <span className="font-bold text-slate-900">{exercise.sets}</span></div>
                        <div className="px-2.5 py-1 bg-slate-50 border border-gray-200 rounded text-slate-700"><span className="text-slate-500">Reps:</span> <span className="font-bold text-slate-900 font-mono">{exercise.reps}</span></div>
                        <div className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800"><span className="text-emerald-700">Rest:</span> <span className="font-bold">{exercise.restSeconds}s</span></div>
                      </div>
                      {exercise.instructions && (
                        <div className="mt-2 text-xs sm:text-sm text-slate-600 bg-slate-50/70 border border-gray-100 rounded p-2.5 leading-relaxed">
                          <span className="font-semibold text-slate-800">Instruction: </span>{exercise.instructions}
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
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-slate-500 text-sm">No workout day selected.</div>
      )}
    </main>
  );
}

export default WorkoutPlanPage;
