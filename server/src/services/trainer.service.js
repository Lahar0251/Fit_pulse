import User from '../models/user.model.js';
import FitnessProfile from '../models/fitnessProfile.model.js';
import WorkoutPlan from '../models/workoutPlan.model.js';
import Attendance from '../models/attendance.model.js';
import { generateRuleBasedPlan, buildWeeklySchedule, getExerciseImageUrl } from './workoutGenerator.service.js';
import { calculateConsistencyMetrics } from './member.service.js';

/**
 * Retrieve all trainees assigned to a given trainer
 */
export const getAssignedMembers = async (trainerId) => {
  // Find profiles assigned to this trainer - STRICT ISOLATION (PART 18)
  const profiles = await FitnessProfile.find({ trainerId });

  if (profiles.length === 0) {
    return [];
  }

  const memberIds = profiles.map((p) => p.userId);
  const users = await User.find({ _id: { $in: memberIds }, role: 'member' }).select('-password');
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  // Compute attendance & consistency for current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const attendances = await Attendance.find({
    userId: { $in: memberIds },
    checkInTime: { $gte: startOfMonth, $lte: endOfMonth },
  });

  // Group attendance by userId
  const userAttendancesMap = new Map();
  attendances.forEach((att) => {
    const uId = att.userId.toString();
    if (!userAttendancesMap.has(uId)) {
      userAttendancesMap.set(uId, []);
    }
    userAttendancesMap.get(uId).push(att);
  });

  const results = [];
  for (const profile of profiles) {
    const user = userMap.get(profile.userId.toString());
    if (!user) continue;

    const userSessions = userAttendancesMap.get(profile.userId.toString()) || [];
    const attendedCount = userSessions.length;
    const plannedDays = profile.plannedDaysPerWeek || 5;
    const metrics = calculateConsistencyMetrics({
      expectedWorkoutDays: plannedDays,
      targetWorkoutMinutes: 60,
      sessions: userSessions,
    });
    const consistencyPercentage = metrics.consistencyPercentage;

    results.push({
      id: user._id,
      _id: user._id,
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '—',
      memberSince: user.createdAt,
      fitnessGoal: profile.fitnessGoal || 'general_fitness',
      experienceLevel: profile.experienceLevel || 'intermediate',
      plannedDaysPerWeek: profile.plannedDaysPerWeek || 5,
      attendanceCount: attendedCount,
      consistencyPercentage,
      membershipStatus: profile.membershipStatus || 'Active',
    });
  }

  // Sort by full name
  results.sort((a, b) => a.fullName.localeCompare(b.fullName));

  return results;
};

/**
 * Retrieve comprehensive details & workout plan of an assigned trainee
 */
export const getMemberDetailsForTrainer = async (trainerId, memberId) => {
  const user = await User.findById(memberId).select('-password');
  if (!user || user.role !== 'member') {
    const error = new Error('Member not found or not a valid gym trainee');
    error.statusCode = 404;
    throw error;
  }

  // Retrieve or create fitness profile - STRICT ISOLATION (PART 18 & 19)
  const profile = await FitnessProfile.findOne({ userId: memberId, trainerId });
  if (!profile) {
    const error = new Error('Access denied: This member is not assigned to your trainer profile.');
    error.statusCode = 403;
    throw error;
  }

  // Retrieve member-specific trainer-assigned workout plan (STRICT ISOLATION)
  let plan = await WorkoutPlan.findOne({
    userId: memberId,
    trainerId,
    planType: 'trainer',
    isActive: true,
  });

  if (!plan) {
    plan = await WorkoutPlan.findOne({
      userId: memberId,
      trainerId,
      planType: 'trainer',
    });
    if (plan) {
      plan.isActive = true;
      await plan.save();
    }
  }

  // Attendance metrics
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const attendances = await Attendance.find({
    userId: memberId,
    checkInTime: { $gte: startOfMonth, $lte: endOfMonth },
  }).sort({ checkInTime: -1 });

  const attendedCount = attendances.length;
  const plannedDays = profile.plannedDaysPerWeek || 5;
  const metrics = calculateConsistencyMetrics({
    expectedWorkoutDays: plannedDays,
    targetWorkoutMinutes: 60,
    sessions: attendances,
  });
  const consistencyPercentage = metrics.consistencyPercentage;

  return {
    account: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '—',
      memberSince: user.createdAt,
    },
    fitness: {
      age: profile.age,
      height: profile.height,
      weight: profile.weight,
      fitnessGoal: profile.fitnessGoal || 'muscle_gain',
      experienceLevel: profile.experienceLevel || 'intermediate',
      plannedDaysPerWeek: profile.plannedDaysPerWeek || 5,
      preferredSchedule: profile.preferredSchedule || 'morning',
      membershipPlan: profile.membershipPlan || 'FitPulse Annual Pro',
      membershipStatus: profile.membershipStatus || 'Active',
      membershipExpiry: profile.membershipExpiry,
    },
    attendance: {
      attendedThisMonth: attendedCount,
      consistencyPercentage,
      recentVisits: attendances.slice(0, 5).map((a) => ({
        date: a.dateKey || a.checkInTime.toISOString().slice(0, 10),
        durationMinutes: a.durationMinutes || 60,
      })),
    },
    workoutPlan: (plan && plan.days && plan.days.length > 0)
      ? {
          id: plan._id,
          name: plan.name,
          goal: plan.goal,
          experienceLevel: plan.experienceLevel,
          daysPerWeek: plan.daysPerWeek,
          assignedBy: plan.assignedBy,
          assignedByName: plan.assignedByName,
          isCustom: true,
          days: plan.days.map((d) => ({
            dayNumber: d.dayNumber,
            dayName: d.dayName,
            focus: d.focus,
            isCompleted: d.isCompleted,
            exercises: (d.exercises || []).map((ex) => ({
              exerciseName: ex.exerciseName,
              sets: ex.sets,
              reps: ex.reps,
              restSeconds: ex.restSeconds,
              rest: ex.rest || `${ex.restSeconds || 60}s`,
              instructions: ex.instructions || '',
              targetMuscle: ex.targetMuscle || d.focus,
            })),
          })),
        }
      : null,
  };
};

/**
 * Retrieve all workout plans / templates created by trainer or globally available
 */
export const getTrainerPlans = async (trainerId) => {
  let plans = await WorkoutPlan.find({
    $or: [{ trainerId }, { isTemplate: true }],
    userId: { $exists: false },
  }).sort({ updatedAt: -1 });

  // If no reusable plans exist, seed starter templates for the trainer
  if (plans.length === 0) {
    const starterPlans = [
      {
        name: '3-Day Full Body Conditioning',
        goal: 'general_fitness',
        experienceLevel: 'beginner',
        daysPerWeek: 3,
        isTemplate: true,
        isCustom: true,
        trainerId,
        days: [
          {
            dayNumber: 1,
            dayName: 'Day 1 - Foundation & Core',
            focus: 'Full Body',
            exercises: [
              { exerciseName: 'Barbell Back Squat', sets: 3, reps: '10', restSeconds: 60, rest: '60s' },
              { exerciseName: 'Dumbbell Bench Press', sets: 3, reps: '12', restSeconds: 60, rest: '60s' },
              { exerciseName: 'Seated Cable Row', sets: 3, reps: '12', restSeconds: 60, rest: '60s' },
              { exerciseName: 'Plank Hold', sets: 3, reps: '45s', restSeconds: 45, rest: '45s' },
            ],
          },
          {
            dayNumber: 2,
            dayName: 'Day 2 - Posterior Chain & Push',
            focus: 'Full Body',
            exercises: [
              { exerciseName: 'Romanian Deadlift', sets: 3, reps: '10', restSeconds: 75, rest: '75s' },
              { exerciseName: 'Overhead Dumbbell Press', sets: 3, reps: '10', restSeconds: 60, rest: '60s' },
              { exerciseName: 'Lat Pulldown', sets: 3, reps: '12', restSeconds: 60, rest: '60s' },
              { exerciseName: 'Hanging Knee Raise', sets: 3, reps: '15', restSeconds: 45, rest: '45s' },
            ],
          },
          {
            dayNumber: 3,
            dayName: 'Day 3 - Strength & Stability',
            focus: 'Full Body',
            exercises: [
              { exerciseName: 'Leg Press', sets: 3, reps: '12', restSeconds: 60, rest: '60s' },
              { exerciseName: 'Incline Dumbbell Press', sets: 3, reps: '10', restSeconds: 60, rest: '60s' },
              { exerciseName: 'Dumbbell Bicep Curl', sets: 3, reps: '12', restSeconds: 45, rest: '45s' },
              { exerciseName: 'Tricep Rope Pushdown', sets: 3, reps: '12', restSeconds: 45, rest: '45s' },
            ],
          },
        ],
      },
      {
        name: '4-Day Upper / Lower Split',
        goal: 'muscle_gain',
        experienceLevel: 'intermediate',
        daysPerWeek: 4,
        isTemplate: true,
        isCustom: true,
        trainerId,
        days: [
          {
            dayNumber: 1,
            dayName: 'Day 1 - Upper Body Push & Pull',
            focus: 'Upper Body',
            exercises: [
              { exerciseName: 'Barbell Bench Press', sets: 4, reps: '8-10', restSeconds: 90, rest: '90s' },
              { exerciseName: 'Bent-Over Barbell Row', sets: 4, reps: '8-10', restSeconds: 90, rest: '90s' },
              { exerciseName: 'Dumbbell Shoulder Press', sets: 3, reps: '10-12', restSeconds: 60, rest: '60s' },
              { exerciseName: 'Lateral Raises', sets: 3, reps: '15', restSeconds: 45, rest: '45s' },
            ],
          },
          {
            dayNumber: 2,
            dayName: 'Day 2 - Lower Body Quad & Hamstring',
            focus: 'Lower Body',
            exercises: [
              { exerciseName: 'Barbell Back Squat', sets: 4, reps: '8', restSeconds: 120, rest: '120s' },
              { exerciseName: 'Walking Lunges', sets: 3, reps: '12/leg', restSeconds: 60, rest: '60s' },
              { exerciseName: 'Leg Extension', sets: 3, reps: '12-15', restSeconds: 45, rest: '45s' },
              { exerciseName: 'Calf Raises', sets: 4, reps: '15', restSeconds: 45, rest: '45s' },
            ],
          },
          {
            dayNumber: 3,
            dayName: 'Day 3 - Upper Body Hypertrophy',
            focus: 'Upper Body',
            exercises: [
              { exerciseName: 'Incline Dumbbell Bench Press', sets: 4, reps: '10-12', restSeconds: 60, rest: '60s' },
              { exerciseName: 'Cable Lat Pulldown', sets: 4, reps: '10-12', restSeconds: 60, rest: '60s' },
              { exerciseName: 'Dumbbell Hammer Curls', sets: 3, reps: '12', restSeconds: 45, rest: '45s' },
              { exerciseName: 'Overhead Tricep Extension', sets: 3, reps: '12', restSeconds: 45, rest: '45s' },
            ],
          },
          {
            dayNumber: 4,
            dayName: 'Day 4 - Lower Body & Core',
            focus: 'Lower Body',
            exercises: [
              { exerciseName: 'Deadlift', sets: 3, reps: '5', restSeconds: 120, rest: '120s' },
              { exerciseName: 'Leg Press', sets: 3, reps: '12', restSeconds: 60, rest: '60s' },
              { exerciseName: 'Lying Leg Curl', sets: 3, reps: '12', restSeconds: 60, rest: '60s' },
              { exerciseName: 'Cable Woodchopper', sets: 3, reps: '15', restSeconds: 45, rest: '45s' },
            ],
          },
        ],
      },
    ];

    await WorkoutPlan.insertMany(starterPlans);
    plans = await WorkoutPlan.find({
      $or: [{ trainerId }, { isTemplate: true }],
      userId: { $exists: false },
    }).sort({ updatedAt: -1 });
  }

  return plans;
};

/**
 * Format raw days array into structured schema
 */
const formatDaysArray = (daysInput) => {
  if (!Array.isArray(daysInput) || daysInput.length === 0) {
    return [
      {
        dayNumber: 1,
        dayName: 'Day 1',
        focus: 'Workout',
        exercises: [
          {
            exerciseName: 'Push Ups',
            sets: 3,
            reps: '10-12',
            restSeconds: 60,
            rest: '60s',
          },
        ],
      },
    ];
  }

  return daysInput.map((day, idx) => {
    const dayNumber = Number(day.dayNumber) || idx + 1;
    const dayName = (day.dayName && day.dayName.trim()) || `Day ${dayNumber}`;
    const focus = (day.focus && day.focus.trim()) || dayName;
    const exercises = Array.isArray(day.exercises)
      ? day.exercises.map((ex) => ({
          exerciseName: (ex.exerciseName && ex.exerciseName.trim()) || 'Exercise',
          sets: Number(ex.sets) || 3,
          reps: ex.reps ? String(ex.reps).trim() : '10-12',
          restSeconds: Number(ex.restSeconds) || (typeof ex.rest === 'string' ? parseInt(ex.rest, 10) || 60 : 60),
          rest: ex.rest ? String(ex.rest).trim() : `${ex.restSeconds || 60}s`,
          muscleGroup: ex.muscleGroup || focus,
          instructions: ex.instructions || '',
          imageUrl: ex.imageUrl || getExerciseImageUrl(ex.exerciseName),
        }))
      : [];

    return {
      dayNumber,
      dayName,
      focus,
      exercises,
    };
  });
};

/**
 * Create a new workout plan (template) in trainer library
 */
export const createTrainerPlan = async (trainerId, planData) => {
  const { name, goal, days, daysPerWeek } = planData;

  if (!name || !name.trim()) {
    const error = new Error('Plan name is required');
    error.statusCode = 400;
    throw error;
  }

  const formattedDays = formatDaysArray(days);

  const newPlan = await WorkoutPlan.create({
    name: name.trim(),
    goal: goal || 'general_fitness',
    daysPerWeek: daysPerWeek || formattedDays.length,
    trainerId,
    isTemplate: true,
    isCustom: true,
    days: formattedDays,
  });

  return newPlan;
};

/**
 * Get plan by ID
 */
export const getTrainerPlanById = async (trainerId, planId) => {
  const plan = await WorkoutPlan.findById(planId);
  if (!plan) {
    const error = new Error('Workout plan not found');
    error.statusCode = 404;
    throw error;
  }
  return plan;
};

/**
 * Update an existing workout plan in trainer library
 */
export const updateTrainerPlan = async (trainerId, planId, updateData) => {
  const plan = await WorkoutPlan.findById(planId);
  if (!plan) {
    const error = new Error('Workout plan not found');
    error.statusCode = 404;
    throw error;
  }

  if (updateData.name && updateData.name.trim()) {
    plan.name = updateData.name.trim();
  }
  if (updateData.goal) {
    plan.goal = updateData.goal;
  }
  if (updateData.days) {
    plan.days = formatDaysArray(updateData.days);
    plan.daysPerWeek = plan.days.length;
  }

  await plan.save();
  return plan;
};

/**
 * Delete a workout plan from trainer library
 */
export const deleteTrainerPlan = async (trainerId, planId) => {
  const plan = await WorkoutPlan.findById(planId);
  if (!plan) {
    const error = new Error('Workout plan not found');
    error.statusCode = 404;
    throw error;
  }

  await WorkoutPlan.findByIdAndDelete(planId);
  return { message: 'Workout plan deleted successfully', id: planId };
};

/**
 * Assign a workout plan to an assigned trainee member
 */
export const assignPlanToMember = async (trainerId, memberId, payload) => {
  const member = await User.findById(memberId);
  if (!member || member.role !== 'member') {
    const error = new Error('Member not found');
    error.statusCode = 404;
    throw error;
  }

  // Verify member is assigned to this trainer (PART 18 & 19)
  const profile = await FitnessProfile.findOne({ userId: memberId, trainerId });
  if (!profile) {
    const error = new Error('Access denied: Member is not assigned to your trainer profile.');
    error.statusCode = 403;
    throw error;
  }

  const trainer = await User.findById(trainerId);
  const trainerName = trainer ? trainer.fullName : 'Trainer';

  let planSource = null;

  if (payload.planId) {
    const existingPlan = await WorkoutPlan.findById(payload.planId);
    if (!existingPlan) {
      const error = new Error('Selected workout plan not found');
      error.statusCode = 404;
      throw error;
    }
    planSource = {
      name: existingPlan.name,
      goal: existingPlan.goal,
      experienceLevel: existingPlan.experienceLevel,
      daysPerWeek: existingPlan.days.length,
      days: existingPlan.days,
    };
  } else if (payload.planData) {
    const formattedDays = formatDaysArray(payload.planData.days);
    planSource = {
      name: (payload.planData.name && payload.planData.name.trim()) || 'Custom Workout Plan',
      goal: payload.planData.goal || 'general_fitness',
      experienceLevel: payload.planData.experienceLevel || 'intermediate',
      daysPerWeek: formattedDays.length,
      days: formattedDays,
    };
  } else {
    const error = new Error('Either planId or planData must be provided');
    error.statusCode = 400;
    throw error;
  }

  // Deactivate any currently active plans for this member
  await WorkoutPlan.updateMany({ userId: memberId, isActive: true }, { $set: { isActive: false } });

  const schedule = buildWeeklySchedule(planSource.days.length, planSource.days);

  // Check if an existing trainer plan document for this member from this trainer exists
  let assignedPlan = await WorkoutPlan.findOne({
    userId: memberId,
    trainerId,
    planType: 'trainer',
  });

  if (assignedPlan) {
    assignedPlan.name = planSource.name;
    assignedPlan.goal = planSource.goal || 'general_fitness';
    assignedPlan.experienceLevel = planSource.experienceLevel || 'intermediate';
    assignedPlan.daysPerWeek = planSource.days.length;
    assignedPlan.days = planSource.days;
    assignedPlan.weekSchedule = schedule;
    assignedPlan.assignedBy = trainerId;
    assignedPlan.assignedByName = trainerName;
    assignedPlan.planType = 'trainer';
    assignedPlan.isActive = true;
    assignedPlan.isCustom = true;
    await assignedPlan.save();
  } else {
    assignedPlan = await WorkoutPlan.create({
      userId: memberId,
      trainerId,
      assignedBy: trainerId,
      assignedByName: trainerName,
      name: planSource.name,
      goal: planSource.goal || 'general_fitness',
      experienceLevel: planSource.experienceLevel || 'intermediate',
      daysPerWeek: planSource.days.length,
      isActive: true,
      isCustom: true,
      planType: 'trainer',
      days: planSource.days,
      weekSchedule: schedule,
    });
  }

  // Ensure member's fitness profile links to this trainer, sets activeWorkoutSource = 'trainer'
  await FitnessProfile.findOneAndUpdate(
    { userId: memberId },
    {
      $set: {
        trainerId,
        trainerRequested: true,
        wantsTrainer: true,
        activeWorkoutSource: 'trainer',
        plannedDaysPerWeek: planSource.days.length,
      },
    },
    { upsert: true }
  );

  return assignedPlan;
};

/**
 * Update the member's currently assigned workout plan directly
 */
export const updateMemberAssignedPlan = async (trainerId, memberId, updateData) => {
  // Verify member is assigned to this trainer (PART 18 & 19)
  const profile = await FitnessProfile.findOne({ userId: memberId, trainerId });
  if (!profile) {
    const error = new Error('Access denied: Member is not assigned to your trainer profile.');
    error.statusCode = 403;
    throw error;
  }

  const trainer = await User.findById(trainerId);
  const trainerName = trainer ? trainer.fullName : 'Trainer';

  const formattedDays = formatDaysArray(updateData.days);
  const schedule = buildWeeklySchedule(formattedDays.length, formattedDays);

  let plan = await WorkoutPlan.findOne({
    userId: memberId,
    trainerId,
    planType: 'trainer',
    isActive: true,
  });

  if (!plan) {
    plan = await WorkoutPlan.findOne({
      userId: memberId,
      trainerId,
      planType: 'trainer',
    });
  }

  if (!plan) {
    // If no active plan, create one
    plan = await WorkoutPlan.create({
      userId: memberId,
      trainerId,
      assignedBy: trainerId,
      assignedByName: trainerName,
      name: (updateData.name && updateData.name.trim()) || 'Custom Workout Plan',
      goal: updateData.goal || 'general_fitness',
      daysPerWeek: formattedDays.length,
      isActive: true,
      isCustom: true,
      planType: 'trainer',
      days: formattedDays,
      weekSchedule: schedule,
    });
  } else {
    if (updateData.name && updateData.name.trim()) {
      plan.name = updateData.name.trim();
    }
    if (updateData.goal) {
      plan.goal = updateData.goal;
    }
    plan.days = formattedDays;
    plan.daysPerWeek = formattedDays.length;
    plan.weekSchedule = schedule;
    plan.assignedBy = trainerId;
    plan.assignedByName = trainerName;
    plan.planType = 'trainer';
    plan.isActive = true;
    plan.isCustom = true;
    await plan.save();
  }

  // Ensure member's fitness profile is set to activeWorkoutSource: 'trainer'
  await FitnessProfile.findOneAndUpdate(
    { userId: memberId },
    {
      $set: {
        trainerId,
        activeWorkoutSource: 'trainer',
        plannedDaysPerWeek: formattedDays.length,
      },
    }
  );

  return plan;
};

