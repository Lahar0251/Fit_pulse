import React, { useState, useEffect } from 'react';
import NoticeBanner from './NoticeBanner';
import ExerciseImage from './ExerciseImage';

function TrainerDashboard({ currentUser }) {
  const [members, setMembers] = useState([]);
  const [gymStatus, setGymStatus] = useState(null);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showTomorrowClosureModal, setShowTomorrowClosureModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeDayTab, setActiveDayTab] = useState(1);

  // Workout Plans Library state
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Plan Modals & Forms state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [planModalMode, setPlanModalMode] = useState('create'); // 'create' | 'edit_library' | 'edit_assigned'
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [selectedPlanToAssign, setSelectedPlanToAssign] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  const initialPlanForm = {
    name: '',
    goal: 'general_fitness',
    days: [
      {
        dayNumber: 1,
        dayName: 'Day 1 - Push',
        focus: 'Chest, Shoulders & Triceps',
        exercises: [
          { exerciseName: 'Barbell Bench Press', sets: 4, reps: '8-10', rest: '90s' },
          { exerciseName: 'Overhead Dumbbell Press', sets: 3, reps: '10-12', rest: '60s' },
          { exerciseName: 'Tricep Rope Pushdown', sets: 3, reps: '12', rest: '45s' },
        ],
      },
      {
        dayNumber: 2,
        dayName: 'Day 2 - Pull',
        focus: 'Back & Biceps',
        exercises: [
          { exerciseName: 'Bent-Over Barbell Row', sets: 4, reps: '8-10', rest: '90s' },
          { exerciseName: 'Lat Pulldown', sets: 3, reps: '10-12', rest: '60s' },
          { exerciseName: 'Dumbbell Hammer Curl', sets: 3, reps: '12', rest: '45s' },
        ],
      },
      {
        dayNumber: 3,
        dayName: 'Day 3 - Legs & Core',
        focus: 'Quads, Hamstrings & Core',
        exercises: [
          { exerciseName: 'Barbell Back Squat', sets: 4, reps: '8-10', rest: '120s' },
          { exerciseName: 'Romanian Deadlift', sets: 3, reps: '10', rest: '90s' },
          { exerciseName: 'Plank Hold', sets: 3, reps: '45s', rest: '45s' },
        ],
      },
    ],
  };

  const [planFormData, setPlanFormData] = useState(initialPlanForm);

  // Fetch assigned members for the logged-in trainer
  const fetchAssignedMembers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/trainer/members', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });

      const result = await res.json();
      if (res.ok && result.status === 'success' && Array.isArray(result.data)) {
        setMembers(result.data);
        if (result.data.length > 0 && !selectedMemberId) {
          selectMember(result.data[0].id);
        }
      } else {
        setError(result.message || 'Failed to load assigned members.');
      }

      // Fetch live gym operating status in Asia/Kolkata
      try {
        const statusRes = await fetch('/api/trainer/gym-status', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
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
      console.error('Failed to fetch assigned members:', err);
      setError('Network error while connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch specific member's fitness profile and workout plan
  const selectMember = async (memberId) => {
    setSelectedMemberId(memberId);
    setLoadingDetails(true);
    setActiveDayTab(1);
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch(`/api/trainer/members/${memberId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });

      const result = await res.json();
      if (res.ok && result.status === 'success' && result.data) {
        setSelectedDetails(result.data);
      } else {
        console.error('Failed to load member details:', result.message);
      }
    } catch (err) {
      console.error('Error fetching member details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Fetch trainer workout plans library
  const fetchTrainerPlans = async () => {
    setLoadingPlans(true);
    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch('/api/trainer/plans', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });

      const result = await res.json();
      if (res.ok && result.status === 'success' && Array.isArray(result.data)) {
        setPlans(result.data);
        if (result.data.length > 0 && !selectedPlanToAssign) {
          setSelectedPlanToAssign(result.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch trainer plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    fetchAssignedMembers();
    fetchTrainerPlans();
  }, []);

  const showNotification = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage('');
    }, 4500);
  };

  const formatText = (text) => {
    if (!text) return '—';
    return text
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  // Open Create Plan modal
  const handleOpenCreatePlan = () => {
    setPlanModalMode('create');
    setEditingPlanId(null);
    setPlanFormData({
      name: '',
      goal: 'general_fitness',
      days: [
        {
          dayNumber: 1,
          dayName: 'Day 1 - Full Body',
          focus: 'Full Body',
          exercises: [
            { exerciseName: 'Barbell Back Squat', sets: 3, reps: '10', rest: '60s' },
            { exerciseName: 'Dumbbell Bench Press', sets: 3, reps: '10', rest: '60s' },
            { exerciseName: 'Seated Cable Row', sets: 3, reps: '12', rest: '60s' },
          ],
        },
      ],
    });
    setIsPlanModalOpen(true);
  };

  // Open Edit Plan modal for library plan
  const handleOpenEditPlan = (plan) => {
    setPlanModalMode('edit_library');
    setEditingPlanId(plan._id);
    setPlanFormData({
      name: plan.name || '',
      goal: plan.goal || 'general_fitness',
      days: (plan.days || []).map((d, dIdx) => ({
        dayNumber: d.dayNumber || dIdx + 1,
        dayName: d.dayName || `Day ${dIdx + 1}`,
        focus: d.focus || 'Workout',
        exercises: (d.exercises || []).map((ex) => ({
          exerciseName: ex.exerciseName || '',
          sets: ex.sets || 3,
          reps: ex.reps || '10-12',
          rest: ex.rest || `${ex.restSeconds || 60}s`,
        })),
      })),
    });
    setIsPlanModalOpen(true);
  };

  // Open Edit modal for the currently assigned member's plan
  const handleOpenEditAssignedPlan = () => {
    if (!selectedDetails?.workoutPlan) return;
    const currentPlan = selectedDetails.workoutPlan;
    setPlanModalMode('edit_assigned');
    setEditingPlanId(currentPlan.id);
    setPlanFormData({
      name: currentPlan.name || 'Custom Assigned Plan',
      goal: currentPlan.goal || 'general_fitness',
      days: (currentPlan.days || []).map((d, dIdx) => ({
        dayNumber: d.dayNumber || dIdx + 1,
        dayName: d.dayName || `Day ${dIdx + 1}`,
        focus: d.focus || 'Workout',
        exercises: (d.exercises || []).map((ex) => ({
          exerciseName: ex.exerciseName || '',
          sets: ex.sets || 3,
          reps: ex.reps || '10-12',
          rest: ex.rest || `${ex.restSeconds || 60}s`,
        })),
      })),
    });
    setIsPlanModalOpen(true);
  };

  // Form field modification helpers
  const handleAddDay = () => {
    const nextNumber = planFormData.days.length + 1;
    setPlanFormData({
      ...planFormData,
      days: [
        ...planFormData.days,
        {
          dayNumber: nextNumber,
          dayName: `Day ${nextNumber}`,
          focus: 'Workout',
          exercises: [{ exerciseName: 'Exercise 1', sets: 3, reps: '10-12', rest: '60s' }],
        },
      ],
    });
  };

  const handleRemoveDay = (dayIndex) => {
    if (planFormData.days.length <= 1) return;
    const updated = planFormData.days
      .filter((_, idx) => idx !== dayIndex)
      .map((d, idx) => ({
        ...d,
        dayNumber: idx + 1,
      }));
    setPlanFormData({
      ...planFormData,
      days: updated,
    });
  };

  const handleDayNameChange = (dayIndex, value) => {
    const updated = [...planFormData.days];
    updated[dayIndex].dayName = value;
    setPlanFormData({ ...planFormData, days: updated });
  };

  const handleAddExercise = (dayIndex) => {
    const updated = [...planFormData.days];
    updated[dayIndex].exercises.push({
      exerciseName: '',
      sets: 3,
      reps: '10-12',
      rest: '60s',
    });
    setPlanFormData({ ...planFormData, days: updated });
  };

  const handleRemoveExercise = (dayIndex, exIndex) => {
    const updated = [...planFormData.days];
    if (updated[dayIndex].exercises.length <= 1) return;
    updated[dayIndex].exercises = updated[dayIndex].exercises.filter((_, idx) => idx !== exIndex);
    setPlanFormData({ ...planFormData, days: updated });
  };

  const handleExerciseChange = (dayIndex, exIndex, field, value) => {
    const updated = [...planFormData.days];
    updated[dayIndex].exercises[exIndex][field] = value;
    setPlanFormData({ ...planFormData, days: updated });
  };

  // Save workout plan (Create, Edit Library, or Edit Assigned)
  const handleSavePlan = async (e, alsoAssignToMember = false) => {
    if (e) e.preventDefault();

    if (!planFormData.name.trim()) {
      alert('Please provide a name for the workout plan.');
      return;
    }

    // Ensure all exercises have a name
    for (let d = 0; d < planFormData.days.length; d++) {
      const day = planFormData.days[d];
      for (let ex = 0; ex < day.exercises.length; ex++) {
        if (!day.exercises[ex].exerciseName.trim()) {
          alert(`Please provide a name for all exercises on Day ${d + 1}.`);
          return;
        }
      }
    }

    setSavingPlan(true);
    const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
    const tabId = sessionStorage.getItem('fitpulse_tab_id') || 'tab_main';

    try {
      if (planModalMode === 'create') {
        const res = await fetch('/api/trainer/plans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Tab-Session-Id': tabId,
          },
          body: JSON.stringify(planFormData),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Failed to create plan');

        showNotification(`Workout plan "${planFormData.name}" created successfully!`);
        await fetchTrainerPlans();

        if (alsoAssignToMember && selectedMemberId && result.data?._id) {
          await handleAssignPlan(result.data._id);
        }
      } else if (planModalMode === 'edit_library') {
        const res = await fetch(`/api/trainer/plans/${editingPlanId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Tab-Session-Id': tabId,
          },
          body: JSON.stringify(planFormData),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Failed to update plan');

        showNotification(`Workout plan "${planFormData.name}" updated successfully!`);
        await fetchTrainerPlans();
      } else if (planModalMode === 'edit_assigned') {
        const res = await fetch(`/api/trainer/members/${selectedMemberId}/workout-plan`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Tab-Session-Id': tabId,
          },
          body: JSON.stringify(planFormData),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Failed to update assigned plan');

        showNotification(`Workout plan for ${selectedDetails?.account?.fullName} updated successfully!`);
        await selectMember(selectedMemberId);
      }

      setIsPlanModalOpen(false);
    } catch (err) {
      console.error('Error saving workout plan:', err);
      alert(err.message || 'Error occurred while saving plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  // Delete workout plan from library
  const handleDeletePlan = async (planId, planName) => {
    if (!window.confirm(`Are you sure you want to delete the workout plan "${planName}"?`)) {
      return;
    }

    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch(`/api/trainer/plans/${planId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to delete plan');

      showNotification(`Workout plan "${planName}" deleted successfully.`);
      await fetchTrainerPlans();
    } catch (err) {
      console.error('Error deleting plan:', err);
      alert(err.message || 'Failed to delete plan.');
    }
  };

  // Assign plan to selected member
  const handleAssignPlan = async (planIdToAssign) => {
    if (!selectedMemberId) {
      alert('Please select an assigned trainee first.');
      return;
    }

    try {
      const token = sessionStorage.getItem('fitpulse_token') || localStorage.getItem('fitpulse_token');
      const res = await fetch(`/api/trainer/members/${selectedMemberId}/assign-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Tab-Session-Id': sessionStorage.getItem('fitpulse_tab_id') || 'tab_main',
        },
        body: JSON.stringify({ planId: planIdToAssign }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to assign plan');

      const memberName = selectedDetails?.account?.fullName || 'the member';
      showNotification(`Workout plan successfully assigned to ${memberName}!`);
      setIsAssignModalOpen(false);
      await selectMember(selectedMemberId);
    } catch (err) {
      console.error('Error assigning plan:', err);
      alert(err.message || 'Failed to assign plan.');
    }
  };

  // Calculate trainer aggregate stats
  const totalTrainees = members.length;
  const avgConsistency =
    totalTrainees > 0
      ? Math.round(
          members.reduce((acc, m) => acc + (m.consistencyPercentage || 0), 0) / totalTrainees
        )
      : 0;

  const selectedMember = members.find((m) => m.id === selectedMemberId);

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

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Gym Closure Popup Modal (Today - PART 2 & 14) */}
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
                Normal gym timings resume tomorrow. Trainee workouts and physical gym sessions are paused today.
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

      {/* Tomorrow Gym Closure Popup Modal (Advance Notice - PART 3 & 15) */}
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
                The gym will be closed tomorrow. In-person trainee sessions must be rescheduled.
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

      {/* Active Gym Closure Notice (Today) */}
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

      {/* Advance Notice: Light Amber Warning Card (Tomorrow) */}
      {gymStatus?.hasTomorrowClosure && !gymStatus?.isClosure && (
        <NoticeBanner
          variant="warning"
          title={`GYM CLOSED TOMORROW (${formatClosureDate(gymStatus.tomorrowClosure?.date)}) • Reason: ${gymStatus.tomorrowClosure?.reason}`}
          message="Your gym is closed tomorrow. Trainee workout schedules and in-person sessions should be planned accordingly."
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

      {/* Top Banner (Visually matching Member Welcome Banner) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                Trainer Portal
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500 font-medium">Instructor Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Welcome back, {currentUser?.fullName || 'Trainer'}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Select an assigned member, review their fitness profile, create workout plans, and assign routines.
            </p>
          </div>

          <div className="flex flex-col sm:items-end justify-center">
            {/* Live Operating Status Badge */}
            {gymStatus && (
              <>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    gymStatus.isClosure
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : gymStatus.isOpen
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full mr-1.5 ${
                      gymStatus.isClosure
                        ? 'bg-rose-500'
                        : gymStatus.isOpen
                        ? 'bg-emerald-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  {gymStatus.isClosure ? 'GYM CLOSED TODAY' : `Gym Status: ${gymStatus.status || (gymStatus.isOpen ? 'OPEN' : 'CLOSED')}`}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  {gymStatus.isClosure
                    ? `Closed Today: ${gymStatus.reason}`
                    : `Today (${gymStatus.dayOfWeek}): ${gymStatus.openingTime || '06:00 AM'} – ${gymStatus.closingTime || '10:00 PM'}`}
                </span>
                {gymStatus.hasTomorrowClosure && !gymStatus.isClosure && (
                  <span className="text-[11px] font-semibold text-amber-700 mt-0.5">
                    ⚠️ Tomorrow ({formatClosureDate(gymStatus.tomorrowClosure?.date)}): Closed ({gymStatus.tomorrowClosure?.reason})
                  </span>
                )}
                {!gymStatus.isClosure && !gymStatus.hasTomorrowClosure && gymStatus.nextUpcomingClosure && gymStatus.nextUpcomingClosure.daysUntil > 1 && (
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    Upcoming closure: {formatClosureDate(gymStatus.nextUpcomingClosure.date)} (in {gymStatus.nextUpcomingClosure.daysUntil} days)
                  </span>
                )}
              </>
            )}

            <div className="flex items-center gap-2.5 mt-3">
              <button
                type="button"
                onClick={handleOpenCreatePlan}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
              >
                + Create Workout Plan
              </button>
              <button
                type="button"
                onClick={() => {
                  fetchAssignedMembers();
                  fetchTrainerPlans();
                }}
                disabled={loading}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-md border border-gray-300 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Stats Cards (Matching Member 5-cards presentation) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
            Assigned Trainees
          </span>
          <p className="text-2xl font-bold text-slate-900">{totalTrainees} Members</p>
          <p className="text-xs text-slate-500 mt-1">Active clients under your supervision</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
            Average Adherence
          </span>
          <p className="text-2xl font-bold text-emerald-700">{avgConsistency}%</p>
          <p className="text-xs text-slate-500 mt-1">Based on monthly attendance check-ins</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
            Workout Plan Library
          </span>
          <p className="text-2xl font-bold text-slate-900">{plans.length} Plans</p>
          <p className="text-xs text-slate-500 mt-1">Available templates ready to assign</p>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <NoticeBanner
          variant="success"
          message={successMessage}
          onClose={() => setSuccessMessage('')}
        />
      )}

      {/* Error alert banner */}
      {error && (
        <NoticeBanner
          variant="error"
          message={error}
          onClose={() => setError('')}
        />
      )}

      {/* Section 1: Assigned Trainees Selection Table (Matching Member Table Presentation) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">1. Select an Assigned Member</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click on a member below to inspect their fitness profile and assign or customize their workout plan.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
            {members.length} {members.length === 1 ? 'Member' : 'Members'}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-900">Loading assigned members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 border border-dashed border-gray-200 rounded-md">
            <p className="text-sm font-semibold text-slate-700 mb-1">No members currently assigned.</p>
            <p className="text-xs text-slate-500">
              Members enrolled in personal training programs will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Trainee Name</th>
                  <th className="py-3 px-4">Fitness Goal</th>
                  <th className="py-3 px-4">Experience Level</th>
                  <th className="py-3 px-4">Planned Days</th>
                  <th className="py-3 px-4">Adherence</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-slate-800">
                {members.map((member) => {
                  const isSelected = selectedMemberId === member.id;
                  return (
                    <tr
                      key={member.id}
                      onClick={() => selectMember(member.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/70 border-l-4 border-emerald-600 font-medium'
                          : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{member.fullName}</div>
                        <div className="text-xs text-slate-500">{member.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {formatText(member.fitnessGoal)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {formatText(member.experienceLevel)}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {member.plannedDaysPerWeek} Days / wk
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 border border-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, member.consistencyPercentage || 0)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-800">
                            {member.consistencyPercentage || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectMember(member.id);
                          }}
                          className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer shadow-xs ${
                            isSelected
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-gray-300'
                          }`}
                        >
                          {isSelected ? '✓ Selected' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Selected Member Details, Fitness Profile & Workout Assignment */}
      {selectedMemberId && (
        <div className="space-y-6">
          {loadingDetails ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-sm">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-900">Loading trainee profile and workout plan...</p>
            </div>
          ) : selectedDetails ? (
            <>
              {/* Member Fitness Profile Overview (PART 10 - Matching Member White Cards Style) */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-gray-100 gap-2">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded inline-block mb-1">
                      2. Member Fitness Profile
                    </span>
                    <h2 className="text-xl font-bold text-slate-900">
                      {selectedDetails.account?.fullName}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Contact: {selectedDetails.account?.phone || 'Not provided'} &bull; Email: {selectedDetails.account?.email} &bull; Member since {formatDate(selectedDetails.account?.memberSince)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Status: {selectedDetails.fitness?.membershipStatus || 'Active'}
                    </span>
                  </div>
                </div>

                {/* Profile Grid (Clean White Stat Cards with Light Gray Borders and Green Accents) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-xs">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">Age</span>
                    <p className="text-lg font-bold text-slate-900">
                      {selectedDetails.fitness?.age ? `${selectedDetails.fitness.age} yrs` : '—'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Biological age</p>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-xs">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">Height</span>
                    <p className="text-lg font-bold text-slate-900">
                      {selectedDetails.fitness?.height ? `${selectedDetails.fitness.height} cm` : '—'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Stature measurement</p>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-xs">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">Weight</span>
                    <p className="text-lg font-bold text-slate-900">
                      {selectedDetails.fitness?.weight ? `${selectedDetails.fitness.weight} kg` : '—'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Body weight</p>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-xs">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">Primary Goal</span>
                    <p className="text-lg font-bold text-emerald-700 truncate">
                      {formatText(selectedDetails.fitness?.fitnessGoal)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Target objective</p>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-xs">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">Experience</span>
                    <p className="text-lg font-bold text-slate-900 truncate">
                      {formatText(selectedDetails.fitness?.experienceLevel)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Classification level</p>
                  </div>

                  <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-xs">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">Planned Days</span>
                    <p className="text-lg font-bold text-slate-900">
                      {selectedDetails.fitness?.plannedDaysPerWeek || 5} Days / wk
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Weekly workout target</p>
                  </div>
                </div>
              </div>

              {/* Active Assigned Workout Plan for Selected Trainee */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded inline-block">
                        3. Assigned Workout Plan
                      </span>
                      {selectedDetails.workoutPlan?.assignedByName ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Assigned by Trainer: {selectedDetails.workoutPlan.assignedByName}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          Active Routine
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                      {selectedDetails.workoutPlan?.name || 'Assigned Plan'}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                      Goal: <span className="font-semibold text-slate-800">{formatText(selectedDetails.workoutPlan?.goal)}</span> &bull; {selectedDetails.workoutPlan?.days?.length || 0}-Day Training Split
                    </p>
                  </div>

                  {/* Actions: Assign Plan, Edit Assigned Plan, Create New Plan */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAssignModalOpen(true)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
                    >
                      Assign Existing Plan
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenEditAssignedPlan}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-md border border-gray-300 shadow-sm transition-colors cursor-pointer"
                    >
                      Edit Assigned Plan
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenCreatePlan}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-emerald-700 text-xs sm:text-sm font-semibold rounded-md border border-emerald-300 shadow-sm transition-colors cursor-pointer"
                    >
                      + Create New Plan
                    </button>
                  </div>
                </div>

                {/* Day Tabs (PART 5 - Light Green Active State matching Member UI) */}
                {selectedDetails.workoutPlan?.days && selectedDetails.workoutPlan.days.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 border-b border-gray-100 pb-3 overflow-x-auto">
                      {selectedDetails.workoutPlan.days.map((day) => {
                        const isDayActive = activeDayTab === day.dayNumber;
                        return (
                          <button
                            key={day.dayNumber}
                            type="button"
                            onClick={() => setActiveDayTab(day.dayNumber)}
                            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                              isDayActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold shadow-xs ring-1 ring-emerald-400'
                                : 'bg-white text-slate-700 hover:bg-slate-50 border-gray-200'
                            }`}
                          >
                            Day {day.dayNumber}: {day.dayName.split('(')[0].trim()}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Day Content: Day, Exercise, Sets, Reps, Rest */}
                    {(() => {
                      const day =
                        selectedDetails.workoutPlan.days.find((d) => d.dayNumber === activeDayTab) ||
                        selectedDetails.workoutPlan.days[0];
                      if (!day) return null;

                      return (
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Day {day.dayNumber}</span>
                                <span className="text-xs text-slate-400">&bull;</span>
                                <span className="text-xs text-slate-500">{day.focus || 'Full Body'}</span>
                              </div>
                              <h3 className="text-base sm:text-lg font-bold text-slate-900">{day.dayName}</h3>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                              {(day.exercises || []).length} Prescribed Exercises
                            </span>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs sm:text-sm">
                              <thead>
                                <tr className="border-b border-gray-200 bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                                  <th className="py-3 px-4 w-12 text-center">#</th>
                                  <th className="py-3 px-4">Exercise Name</th>
                                  <th className="py-3 px-4">Sets</th>
                                  <th className="py-3 px-4">Reps</th>
                                  <th className="py-3 px-4">Rest Interval</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 text-slate-800">
                                {(day.exercises || []).map((ex, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">
                                      {idx + 1}
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-slate-900">
                                      <div className="flex items-center space-x-3">
                                        <ExerciseImage
                                          exercise={ex}
                                          name={ex.exerciseName}
                                          className="w-9 h-9 rounded border border-gray-200 bg-white p-1 object-contain shrink-0"
                                        />
                                        <span>{ex.exerciseName}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="px-2.5 py-1 bg-slate-50 border border-gray-200 rounded text-slate-700 font-semibold text-xs">
                                        {ex.sets} sets
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="px-2.5 py-1 bg-slate-50 border border-gray-200 rounded text-slate-700 font-semibold font-mono text-xs">
                                        {ex.reps} reps
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs">
                                        {ex.rest || `${ex.restSeconds || 60}s`}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic py-4">No structured workout plan available for this member.</p>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Section 3: Workout Plan Library (Trainer Plans CRUD) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-gray-100 gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Trainer Workout Plan Library</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Create, edit, and manage reusable workout plans. Assign any plan to your selected trainee with one click.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreatePlan}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-md shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
          >
            + Create New Plan
          </button>
        </div>

        {loadingPlans ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            Loading workout plans...
          </div>
        ) : plans.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 border border-dashed border-gray-200 rounded-md">
            <p className="text-sm font-semibold text-slate-700 mb-1">No workout plans in library.</p>
            <p className="text-xs text-slate-500">
              Click "+ Create New Plan" to build your first template.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((p) => {
              const totalExercises = (p.days || []).reduce(
                (acc, d) => acc + ((d.exercises || []).length),
                0
              );
              return (
                <div
                  key={p._id}
                  className="p-5 border border-gray-200 rounded-lg bg-white flex flex-col justify-between space-y-4 shadow-sm hover:border-gray-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {formatText(p.goal)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {(p.days || []).length} Days &bull; {totalExercises} Exercises
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{p.name}</h3>

                    {/* Days overview */}
                    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                      {(p.days || []).map((day, idx) => (
                        <div key={idx} className="text-xs text-slate-600 flex justify-between items-center py-0.5">
                          <span className="font-semibold text-slate-800">{day.dayName}</span>
                          <span className="text-slate-500 text-[11px]">{(day.exercises || []).length} exercises</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Plan Card Actions */}
                  <div className="flex flex-wrap items-center justify-between pt-3 border-t border-gray-100 gap-2">
                    {selectedMemberId ? (
                      <button
                        type="button"
                        onClick={() => handleAssignPlan(p._id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
                      >
                        Assign to {selectedMember?.fullName.split(' ')[0] || 'Member'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Select a member above to assign</span>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPlan(p)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md border border-gray-300 shadow-xs transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(p._id, p.name)}
                        className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 text-xs font-semibold rounded-md border border-rose-200 shadow-xs transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Create / Edit Workout Plan (CRUD) */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {planModalMode === 'create'
                    ? 'Create Workout Plan'
                    : planModalMode === 'edit_library'
                    ? 'Edit Library Workout Plan'
                    : `Edit Assigned Plan for ${selectedDetails?.account?.fullName || 'Member'}`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Specify Day, Exercise, Sets, Reps, and Rest.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={(e) => handleSavePlan(e, false)} className="space-y-6">
              {/* Plan Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="plan-name-input" className="block text-xs font-semibold text-slate-700 mb-1">
                    Plan Name *
                  </label>
                  <input
                    id="plan-name-input"
                    type="text"
                    required
                    value={planFormData.name}
                    onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                    placeholder="e.g., 4-Day Strength & Conditioning"
                    className="w-full text-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="plan-goal-select" className="block text-xs font-semibold text-slate-700 mb-1">
                    Fitness Goal
                  </label>
                  <select
                    id="plan-goal-select"
                    value={planFormData.goal}
                    onChange={(e) => setPlanFormData({ ...planFormData, goal: e.target.value })}
                    className="w-full text-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="general_fitness">General Fitness</option>
                    <option value="muscle_gain">Muscle Gain</option>
                    <option value="fat_loss">Fat Loss</option>
                    <option value="strength">Strength</option>
                    <option value="endurance">Endurance</option>
                  </select>
                </div>
              </div>

              {/* Days & Exercises List */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Training Days ({planFormData.days.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddDay}
                    className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                  >
                    + Add Day
                  </button>
                </div>

                {planFormData.days.map((day, dIdx) => (
                  <div key={dIdx} className="p-4 bg-slate-50/70 border border-gray-200 rounded-lg space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <label htmlFor={`day-name-${dIdx}`} className="block text-xs font-semibold text-slate-700 mb-1">
                          Day {day.dayNumber} Title
                        </label>
                        <input
                          id={`day-name-${dIdx}`}
                          type="text"
                          required
                          value={day.dayName}
                          onChange={(e) => handleDayNameChange(dIdx, e.target.value)}
                          placeholder={`Day ${dIdx + 1} Name`}
                          className="w-full text-sm bg-white border border-gray-300 rounded-md px-3 py-1.5 text-slate-900 focus:outline-none focus:border-emerald-600"
                        />
                      </div>

                      {planFormData.days.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDay(dIdx)}
                          className="mt-5 text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                        >
                          Remove Day
                        </button>
                      )}
                    </div>

                    {/* Exercises Table with required fields: Exercise, Sets, Reps, Rest */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Exercises for Day {day.dayNumber}:</span>
                        <button
                          type="button"
                          onClick={() => handleAddExercise(dIdx)}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                        >
                          + Add Exercise
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 bg-slate-100/60 text-slate-600 font-semibold uppercase">
                              <th className="py-2.5 px-2.5">Exercise *</th>
                              <th className="py-2.5 px-2.5 w-20">Sets</th>
                              <th className="py-2.5 px-2.5 w-24">Reps</th>
                              <th className="py-2.5 px-2.5 w-24">Rest</th>
                              <th className="py-2.5 px-2.5 w-12 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {day.exercises.map((ex, exIdx) => (
                              <tr key={exIdx} className="bg-white">
                                <td className="py-2 px-2">
                                  <input
                                    type="text"
                                    required
                                    value={ex.exerciseName}
                                    onChange={(e) =>
                                      handleExerciseChange(dIdx, exIdx, 'exerciseName', e.target.value)
                                    }
                                    placeholder="e.g. Bench Press"
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-emerald-600"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    required
                                    value={ex.sets}
                                    onChange={(e) =>
                                      handleExerciseChange(dIdx, exIdx, 'sets', Number(e.target.value))
                                    }
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-emerald-600"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="text"
                                    required
                                    value={ex.reps}
                                    onChange={(e) =>
                                      handleExerciseChange(dIdx, exIdx, 'reps', e.target.value)
                                    }
                                    placeholder="10-12"
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-emerald-600"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="text"
                                    required
                                    value={ex.rest}
                                    onChange={(e) =>
                                      handleExerciseChange(dIdx, exIdx, 'rest', e.target.value)
                                    }
                                    placeholder="60s"
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-emerald-600"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center">
                                  {day.exercises.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveExercise(dIdx, exIdx)}
                                      className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer text-sm"
                                      title="Remove Exercise"
                                    >
                                      &times;
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>

                {planModalMode === 'create' && selectedMemberId && (
                  <button
                    type="button"
                    disabled={savingPlan}
                    onClick={(e) => handleSavePlan(e, true)}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md cursor-pointer disabled:opacity-50"
                  >
                    Save &amp; Assign to {selectedMember?.fullName.split(' ')[0] || 'Member'}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={savingPlan}
                  className="w-full sm:w-auto px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingPlan ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Assign Plan to Selected Member */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Assign Plan to {selectedDetails?.account?.fullName || 'Member'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a routine from your library to assign to this member.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            {plans.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No plans found in library. Please create a workout plan first.
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {plans.map((p) => {
                  const isChecked = selectedPlanToAssign === p._id;
                  return (
                    <div
                      key={p._id}
                      onClick={() => setSelectedPlanToAssign(p._id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                        isChecked
                          ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                          : 'border-gray-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatText(p.goal)} &bull; {(p.days || []).length} Days Split
                        </p>
                      </div>
                      <input
                        type="radio"
                        name="plan-select"
                        checked={isChecked}
                        onChange={() => setSelectedPlanToAssign(p._id)}
                        className="text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedPlanToAssign || plans.length === 0}
                onClick={() => handleAssignPlan(selectedPlanToAssign)}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm cursor-pointer disabled:opacity-50"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default TrainerDashboard;
