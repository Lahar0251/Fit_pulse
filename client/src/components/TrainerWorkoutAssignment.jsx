import React, { useState, useEffect } from 'react';

const COMMON_EXERCISES = [
  'Barbell Flat Bench Press',
  'Incline Dumbbell Press',
  'Standard Push-Ups',
  'Dumbbell Chest Flyes',
  'Wide-Grip Lat Pulldown',
  'Bent-Over Barbell Row',
  'Seated Cable Row',
  'Conventional Barbell Deadlift',
  'Barbell Back Squats',
  'Dumbbell Goblet Squats',
  'Romanian Deadlifts (RDL)',
  'Walking Dumbbell Lunges',
  'Leg Press Machine',
  'Overhead Dumbbell Shoulder Press',
  'Dumbbell Lateral Raises',
  'Standing Barbell Overhead Press',
  'Standing Barbell Bicep Curls',
  'Cable Triceps Rope Pushdown',
  'Parallel Bar Dips',
  'Isometric Core Plank',
  'Dynamic Mountain Climbers',
  'Hanging Knee Raises',
];

function TrainerWorkoutAssignment() {
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Plan editor mode: 'none' | 'create' | 'edit'
  const [editorMode, setEditorMode] = useState('none');
  const [editingPlanId, setEditingPlanId] = useState(null);

  // Active workout plan form
  const [planForm, setPlanForm] = useState({
    name: '',
    goal: 'muscle_gain',
    days: [
      {
        dayNumber: 1,
        dayName: 'Day 1 - Full Body',
        focus: 'Strength & Hypertrophy',
        exercises: [
          {
            exerciseName: 'Barbell Flat Bench Press',
            sets: 3,
            reps: '10',
            restSeconds: 60,
          },
          {
            exerciseName: 'Barbell Back Squats',
            sets: 3,
            reps: '10',
            restSeconds: 90,
          },
        ],
      },
    ],
  });

  const getHeaders = () => {
    const token = localStorage.getItem('fitpulse_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const showNotification = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // Fetch assigned members and plans
  const fetchData = async () => {
    setLoading(true);
    try {
      const [membersRes, plansRes] = await Promise.all([
        fetch('/api/trainer/members', { credentials: 'include', headers: getHeaders() }),
        fetch('/api/trainer/plans', { credentials: 'include', headers: getHeaders() }),
      ]);

      const membersData = await membersRes.json();
      const plansData = await plansRes.json();

      if (membersRes.ok && membersData.data) {
        setMembers(membersData.data);
        if (membersData.data.length > 0 && !selectedMemberId) {
          setSelectedMemberId(membersData.data[0]._id);
        }
      }

      if (plansRes.ok && plansData.data) {
        setPlans(plansData.data);
      }
    } catch (err) {
      console.error('Error fetching trainer assignment data:', err);
      showNotification('Failed to load members or workout plans.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedMember = members.find((m) => m._id === selectedMemberId) || members[0] || null;

  // Format helper for goals and experience levels
  const formatText = (text) => {
    if (!text) return '—';
    return text
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  // Handle Plan Form Day and Exercise updates
  const handleAddDay = () => {
    const nextDayNumber = planForm.days.length + 1;
    setPlanForm((prev) => ({
      ...prev,
      days: [
        ...prev.days,
        {
          dayNumber: nextDayNumber,
          dayName: `Day ${nextDayNumber}`,
          focus: 'Full Body Conditioning',
          exercises: [
            {
              exerciseName: 'Barbell Flat Bench Press',
              sets: 3,
              reps: '10',
              restSeconds: 60,
            },
          ],
        },
      ],
    }));
  };

  const handleRemoveDay = (dayIndex) => {
    if (planForm.days.length <= 1) {
      alert('Plan must contain at least one day.');
      return;
    }
    const updated = planForm.days
      .filter((_, idx) => idx !== dayIndex)
      .map((day, idx) => ({
        ...day,
        dayNumber: idx + 1,
      }));
    setPlanForm((prev) => ({ ...prev, days: updated }));
  };

  const handleDayNameChange = (dayIndex, value) => {
    const updated = [...planForm.days];
    updated[dayIndex].dayName = value;
    setPlanForm((prev) => ({ ...prev, days: updated }));
  };

  const handleAddExercise = (dayIndex) => {
    const updated = [...planForm.days];
    updated[dayIndex].exercises.push({
      exerciseName: 'Standard Push-Ups',
      sets: 3,
      reps: '10-12',
      restSeconds: 60,
    });
    setPlanForm((prev) => ({ ...prev, days: updated }));
  };

  const handleRemoveExercise = (dayIndex, exerciseIndex) => {
    const updated = [...planForm.days];
    if (updated[dayIndex].exercises.length <= 1) {
      alert('Each day must have at least one exercise.');
      return;
    }
    updated[dayIndex].exercises = updated[dayIndex].exercises.filter(
      (_, idx) => idx !== exerciseIndex
    );
    setPlanForm((prev) => ({ ...prev, days: updated }));
  };

  const handleExerciseChange = (dayIndex, exerciseIndex, field, value) => {
    const updated = [...planForm.days];
    updated[dayIndex].exercises[exerciseIndex][field] = value;
    setPlanForm((prev) => ({ ...prev, days: updated }));
  };

  // Start creating new plan
  const startCreatePlan = () => {
    setEditorMode('create');
    setEditingPlanId(null);
    setPlanForm({
      name: selectedMember ? `${selectedMember.fullName}'s Routine` : 'Custom Routine',
      goal: selectedMember?.fitnessProfile?.fitnessGoal || 'muscle_gain',
      days: [
        {
          dayNumber: 1,
          dayName: 'Day 1 - Push & Core',
          focus: 'Chest, Shoulders & Abs',
          exercises: [
            {
              exerciseName: 'Barbell Flat Bench Press',
              sets: 3,
              reps: '10',
              restSeconds: 60,
            },
            {
              exerciseName: 'Overhead Dumbbell Shoulder Press',
              sets: 3,
              reps: '12',
              restSeconds: 60,
            },
          ],
        },
        {
          dayNumber: 2,
          dayName: 'Day 2 - Pull & Legs',
          focus: 'Back & Quads',
          exercises: [
            {
              exerciseName: 'Barbell Back Squats',
              sets: 4,
              reps: '8-10',
              restSeconds: 90,
            },
            {
              exerciseName: 'Wide-Grip Lat Pulldown',
              sets: 3,
              reps: '12',
              restSeconds: 60,
            },
          ],
        },
      ],
    });
  };

  // Start editing existing plan
  const startEditPlan = (planToEdit) => {
    setEditorMode('edit');
    setEditingPlanId(planToEdit._id);
    setPlanForm({
      name: planToEdit.name,
      goal: planToEdit.goal || 'general_fitness',
      days: planToEdit.days.map((d, dIdx) => ({
        dayNumber: d.dayNumber || dIdx + 1,
        dayName: d.dayName || `Day ${dIdx + 1}`,
        focus: d.focus || 'Workout',
        exercises: (d.exercises || []).map((e) => ({
          exerciseName: e.exerciseName,
          sets: e.sets || 3,
          reps: e.reps || '10-12',
          restSeconds: e.restSeconds || 60,
        })),
      })),
    });
  };

  // Save created plan (optionally assign to current member)
  const handleSavePlan = async (assignDirectly = false) => {
    if (!planForm.name.trim()) {
      alert('Please enter a workout plan name.');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        name: planForm.name.trim(),
        goal: planForm.goal,
        days: planForm.days,
        ...(assignDirectly && selectedMemberId ? { assignToMemberId: selectedMemberId } : {}),
      };

      let res;
      if (editorMode === 'edit' && editingPlanId) {
        res = await fetch(`/api/trainer/plans/${editingPlanId}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/trainer/plans', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to save workout plan');
      }

      const actionText =
        editorMode === 'edit'
          ? 'Workout plan updated successfully!'
          : assignDirectly
          ? `Workout plan '${planForm.name}' created and assigned to ${selectedMember?.fullName}!`
          : `Workout plan '${planForm.name}' saved to templates!`;

      showNotification(actionText, 'success');
      setEditorMode('none');
      setEditingPlanId(null);
      await fetchData();
    } catch (err) {
      console.error('Error saving workout plan:', err);
      showNotification(err.message || 'Error saving workout plan', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Assign existing plan to member
  const handleAssignExistingPlan = async (planId) => {
    if (!selectedMemberId) {
      alert('Please select an assigned member first.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/trainer/members/${selectedMemberId}/assign-plan`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ planId }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to assign plan');
      }

      showNotification(
        `Plan assigned to ${selectedMember?.fullName} successfully!`,
        'success'
      );
      await fetchData();
    } catch (err) {
      console.error('Error assigning plan:', err);
      showNotification(err.message || 'Failed to assign plan to member', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete plan
  const handleDeletePlan = async (planId, planName) => {
    if (!window.confirm(`Are you sure you want to delete '${planName}'?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/trainer/plans/${planId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || 'Failed to delete plan');
      }

      showNotification(`Workout plan '${planName}' deleted successfully.`, 'success');
      if (editingPlanId === planId) {
        setEditorMode('none');
        setEditingPlanId(null);
      }
      await fetchData();
    } catch (err) {
      console.error('Error deleting plan:', err);
      showNotification(err.message || 'Failed to delete plan', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium text-slate-600">Loading trainer workout console...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {message.text && (
        <div
          className={`border px-4 py-3 rounded-md text-xs sm:text-sm flex items-center justify-between shadow-xs ${
            message.type === 'error'
              ? 'bg-red-50 border-red-300 text-red-800'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="font-bold">{message.type === 'error' ? 'Notice:' : 'Success:'}</span>
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage({ text: '', type: '' })}
            className="font-bold text-sm ml-4 cursor-pointer"
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
              Trainer Workout Assignment Console
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Member Workout Plans
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Select an assigned member, review their fitness goals, and create or assign custom workout routines.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={startCreatePlan}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
            >
              + Create New Plan
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Member Selector & Profile, Right Plans & Assignment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Assigned Members List & Member Fitness Profile (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          {/* STEP 1: Select an assigned member */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                1. Select Assigned Member
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {members.length} Assigned
              </span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {members.length > 0 ? (
                members.map((m) => {
                  const isSelected = m._id === selectedMemberId;
                  const hasPlan = !!m.activePlan;

                  return (
                    <button
                      key={m._id}
                      type="button"
                      onClick={() => {
                        setSelectedMemberId(m._id);
                        if (editorMode === 'create') {
                          setPlanForm((prev) => ({
                            ...prev,
                            name: `${m.fullName}'s Routine`,
                          }));
                        }
                      }}
                      className={`w-full text-left p-3 rounded-md border text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-semibold shadow-xs'
                          : 'bg-white border-gray-200 text-slate-700 hover:border-gray-300 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-900">{m.fullName}</p>
                        <p className="text-[11px] text-slate-500 font-normal">{m.email}</p>
                      </div>

                      <div className="text-right">
                        {hasPlan ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            Active Plan
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            No Plan
                          </span>
                        )}
                        {isSelected && (
                          <span className="block text-[10px] text-emerald-700 font-bold mt-0.5">
                            Selected ✓
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center">
                  No assigned members found.
                </p>
              )}
            </div>
          </div>

          {/* STEP 2: View member's fitness profile */}
          {selectedMember && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  2. Member Fitness Profile
                </h2>
                <span className="text-xs font-semibold text-emerald-700">
                  {selectedMember.fullName}
                </span>
              </div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-gray-200 rounded-md">
                  <span className="text-slate-500 uppercase font-semibold text-[10px] block mb-0.5">
                    Fitness Goal
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatText(selectedMember.fitnessProfile?.fitnessGoal)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-gray-200 rounded-md">
                  <span className="text-slate-500 uppercase font-semibold text-[10px] block mb-0.5">
                    Experience Level
                  </span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {formatText(selectedMember.fitnessProfile?.experienceLevel)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-gray-200 rounded-md">
                  <span className="text-slate-500 uppercase font-semibold text-[10px] block mb-0.5">
                    Target Days
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedMember.fitnessProfile?.plannedDaysPerWeek || 5} Days / Week
                  </span>
                </div>

                <div className="p-3 bg-slate-50 border border-gray-200 rounded-md">
                  <span className="text-slate-500 uppercase font-semibold text-[10px] block mb-0.5">
                    Preferred Time
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatText(selectedMember.fitnessProfile?.preferredSchedule || 'Morning')}
                  </span>
                </div>
              </div>

              {/* Currently Assigned Workout Plan Status */}
              <div className="border border-gray-200 rounded-md p-3.5 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Currently Assigned Plan:
                  </span>
                  {selectedMember.activePlan ? (
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 bg-gray-200 text-slate-700 rounded font-medium">
                      None
                    </span>
                  )}
                </div>

                {selectedMember.activePlan ? (
                  <div className="space-y-1.5 text-xs">
                    <p className="font-bold text-emerald-800 text-sm">
                      {selectedMember.activePlan.name}
                    </p>
                    <p className="text-slate-600 text-[11px]">
                      Days: {selectedMember.activePlan.days?.length || 0} &bull; Goal:{' '}
                      {formatText(selectedMember.activePlan.goal)}
                    </p>
                    {selectedMember.activePlan.assignedBy && (
                      <p className="text-[11px] text-slate-500">
                        Assigned by: {selectedMember.activePlan.assignedBy.fullName}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    No workout plan is currently active for this member. Select or create a plan to assign.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Step 3 & 4 (Create/Edit Plan OR Select & Assign Plan) (7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          {/* EDITOR FORM (Create or Edit Plan) */}
          {editorMode !== 'none' ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                    {editorMode === 'edit' ? 'Plan Modification' : 'New Plan Builder'}
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editorMode === 'edit' ? 'Edit Workout Plan' : 'Create Workout Plan'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditorMode('none');
                    setEditingPlanId(null);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 border border-gray-300 px-3 py-1.5 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {/* Plan Metadata Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="plan-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Plan Name *
                  </label>
                  <input
                    id="plan-name"
                    type="text"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    placeholder="e.g., Alex's Hypertrophy Routine"
                    className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="plan-goal" className="block text-xs font-semibold text-slate-700 mb-1">
                    Fitness Goal
                  </label>
                  <select
                    id="plan-goal"
                    value={planForm.goal}
                    onChange={(e) => setPlanForm({ ...planForm, goal: e.target.value })}
                    className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="muscle_gain">Muscle Gain</option>
                    <option value="fat_loss">Fat Loss</option>
                    <option value="strength">Strength</option>
                    <option value="general_fitness">General Fitness</option>
                    <option value="endurance">Endurance</option>
                  </select>
                </div>
              </div>

              {/* Workout Fields: Day, Exercise, Sets, Reps, Rest */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Workout Days ({planForm.days.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddDay}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded cursor-pointer"
                  >
                    + Add Day
                  </button>
                </div>

                {planForm.days.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className="border border-gray-200 rounded-md p-4 bg-slate-50/60 space-y-3"
                  >
                    {/* Day Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 flex-1">
                        <span className="text-xs font-bold text-slate-700 shrink-0">
                          Day {day.dayNumber}:
                        </span>
                        <input
                          type="text"
                          value={day.dayName}
                          onChange={(e) => handleDayNameChange(dayIndex, e.target.value)}
                          placeholder="e.g. Day 1 - Upper Body"
                          className="text-xs sm:text-sm bg-white border border-gray-300 rounded px-2.5 py-1 text-slate-900 font-semibold w-full max-w-xs focus:outline-none focus:border-emerald-600"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleAddExercise(dayIndex)}
                          className="text-[11px] font-semibold text-emerald-700 bg-white border border-emerald-300 px-2 py-1 rounded hover:bg-emerald-50 cursor-pointer"
                        >
                          + Add Exercise
                        </button>
                        {planForm.days.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDay(dayIndex)}
                            className="text-[11px] text-red-600 hover:text-red-800 px-1.5 py-1 cursor-pointer"
                            title="Remove Day"
                          >
                            Remove Day
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Exercises Table / Rows */}
                    <div className="space-y-2 pt-1">
                      <div className="hidden sm:grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                        <div className="col-span-5">Exercise Name</div>
                        <div className="col-span-2 text-center">Sets</div>
                        <div className="col-span-2 text-center">Reps</div>
                        <div className="col-span-2 text-center">Rest (s)</div>
                        <div className="col-span-1 text-center">Action</div>
                      </div>

                      {day.exercises.map((exercise, exIndex) => (
                        <div
                          key={exIndex}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded border border-gray-200 text-xs"
                        >
                          {/* Exercise input or select */}
                          <div className="sm:col-span-5">
                            <label className="sm:hidden block text-[10px] font-semibold text-slate-500 mb-0.5">
                              Exercise Name
                            </label>
                            <input
                              type="text"
                              list={`exercise-suggestions-${dayIndex}-${exIndex}`}
                              value={exercise.exerciseName}
                              onChange={(e) =>
                                handleExerciseChange(dayIndex, exIndex, 'exerciseName', e.target.value)
                              }
                              placeholder="Exercise name"
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                            />
                            <datalist id={`exercise-suggestions-${dayIndex}-${exIndex}`}>
                              {COMMON_EXERCISES.map((exName) => (
                                <option key={exName} value={exName} />
                              ))}
                            </datalist>
                          </div>

                          {/* Sets */}
                          <div className="sm:col-span-2">
                            <label className="sm:hidden block text-[10px] font-semibold text-slate-500 mb-0.5">
                              Sets
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={exercise.sets}
                              onChange={(e) =>
                                handleExerciseChange(dayIndex, exIndex, 'sets', Number(e.target.value))
                              }
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 text-center focus:outline-none focus:border-emerald-600"
                            />
                          </div>

                          {/* Reps */}
                          <div className="sm:col-span-2">
                            <label className="sm:hidden block text-[10px] font-semibold text-slate-500 mb-0.5">
                              Reps
                            </label>
                            <input
                              type="text"
                              value={exercise.reps}
                              onChange={(e) =>
                                handleExerciseChange(dayIndex, exIndex, 'reps', e.target.value)
                              }
                              placeholder="e.g. 10-12"
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 text-center focus:outline-none focus:border-emerald-600"
                            />
                          </div>

                          {/* Rest */}
                          <div className="sm:col-span-2">
                            <label className="sm:hidden block text-[10px] font-semibold text-slate-500 mb-0.5">
                              Rest (s)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="300"
                              step="5"
                              value={exercise.restSeconds}
                              onChange={(e) =>
                                handleExerciseChange(
                                  dayIndex,
                                  exIndex,
                                  'restSeconds',
                                  Number(e.target.value)
                                )
                              }
                              className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 text-center focus:outline-none focus:border-emerald-600"
                            />
                          </div>

                          {/* Delete Exercise Row */}
                          <div className="sm:col-span-1 text-right sm:text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveExercise(dayIndex, exIndex)}
                              className="text-red-500 hover:text-red-700 text-sm font-bold cursor-pointer"
                              title="Remove exercise"
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Form Actions */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditorMode('none');
                    setEditingPlanId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleSavePlan(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Plan Only'}
                </button>

                {selectedMember && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleSavePlan(true)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {actionLoading
                      ? 'Assigning...'
                      : `Save & Assign to ${selectedMember.fullName}`}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* STEP 3 & 4: Plans List (Select existing plan, Assign, Edit, Delete) */
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    3 &amp; 4. Select or Manage Workout Plans
                  </h2>
                  <p className="text-xs text-slate-500">
                    Choose an existing plan to assign to {selectedMember?.fullName || 'the member'}, or edit/delete plans.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={startCreatePlan}
                  className="self-start sm:self-auto px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-md hover:bg-emerald-100 cursor-pointer"
                >
                  + New Plan
                </button>
              </div>

              {/* Plans List */}
              <div className="space-y-4">
                {plans.length > 0 ? (
                  plans.map((planItem) => {
                    const isAssignedToCurrent =
                      selectedMember?.activePlan &&
                      selectedMember.activePlan._id === planItem._id;

                    return (
                      <div
                        key={planItem._id}
                        className={`border rounded-lg p-4 sm:p-5 transition-colors space-y-3 ${
                          isAssignedToCurrent
                            ? 'bg-emerald-50/40 border-emerald-400'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-base font-bold text-slate-900">
                                {planItem.name}
                              </h3>
                              {isAssignedToCurrent && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Currently Assigned
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {planItem.days?.length || 0} Training Days &bull; Goal:{' '}
                              {formatText(planItem.goal)}
                              {planItem.userId?.fullName && (
                                <span> &bull; Trainee: {planItem.userId.fullName}</span>
                              )}
                            </p>
                          </div>

                          {/* Plan Actions: Assign, Edit, Delete */}
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              disabled={actionLoading || isAssignedToCurrent}
                              onClick={() => handleAssignExistingPlan(planItem._id)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                                isAssignedToCurrent
                                  ? 'bg-gray-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {isAssignedToCurrent
                                ? 'Assigned'
                                : `Assign to ${selectedMember ? selectedMember.fullName.split(' ')[0] : 'Member'}`}
                            </button>

                            <button
                              type="button"
                              onClick={() => startEditPlan(planItem)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-gray-300 rounded-md hover:bg-slate-50 cursor-pointer"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleDeletePlan(planItem._id, planItem.name)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Quick Day & Exercise Summary */}
                        <div className="pt-2 border-t border-gray-100">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-2">
                            Day &amp; Exercise Breakdown:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {planItem.days && planItem.days.length > 0 ? (
                              planItem.days.map((d, dIdx) => (
                                <div
                                  key={dIdx}
                                  className="p-2.5 bg-slate-50 border border-gray-200 rounded text-slate-700 space-y-1"
                                >
                                  <div className="font-bold text-slate-900 text-xs">
                                    Day {d.dayNumber || dIdx + 1}: {d.dayName || 'Workout'}
                                  </div>
                                  <div className="text-[11px] text-slate-600 space-y-0.5">
                                    {(d.exercises || []).map((ex, eIdx) => (
                                      <div key={eIdx} className="flex justify-between">
                                        <span className="font-medium truncate mr-1">
                                          &bull; {ex.exerciseName}
                                        </span>
                                        <span className="text-slate-500 shrink-0 font-mono">
                                          {ex.sets}x{ex.reps} ({ex.restSeconds}s)
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400">No days configured.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center space-y-2">
                    <p className="text-sm font-semibold text-slate-700">No workout plans available.</p>
                    <p className="text-xs text-slate-500">
                      Click "+ New Plan" to create a simple workout plan with Days, Exercises, Sets, Reps, and Rest.
                    </p>
                    <button
                      type="button"
                      onClick={startCreatePlan}
                      className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 cursor-pointer"
                    >
                      Create First Plan
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default TrainerWorkoutAssignment;
