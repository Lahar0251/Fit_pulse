import User from '../models/user.model.js';
import FitnessProfile from '../models/fitnessProfile.model.js';
import WorkoutPlan from '../models/workoutPlan.model.js';
import Attendance from '../models/attendance.model.js';
import GymSchedule from '../models/gymSchedule.model.js';
import GymClosure from '../models/gymClosure.model.js';
import MembershipPlan from '../models/membershipPlan.model.js';
import MembershipPayment from '../models/membershipPayment.model.js';
import { getTodayGymStatus } from './schedule.service.js';
import { getKolkataDateInfo, getKolkataClosingDate } from '../utils/time.utils.js';
import { generateRuleBasedPlan, buildWeeklySchedule, DAYS_OF_WEEK, getExerciseImageUrl } from './workoutGenerator.service.js';
import { findUserById } from './auth.service.js';
import { recordSyncEvent } from './sync.service.js';

export const LEVEL_RANKS = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  pro: 4,
};

export const RANK_TO_LEVEL = {
  1: 'beginner',
  2: 'intermediate',
  3: 'advanced',
  4: 'pro',
};

/**
 * Build 7-day calendar week schedule with dynamic statuses:
 * - scheduled: upcoming or today's pending workout
 * - completed: fulfilled workout slot
 * - missed: past scheduled workout not completed
 * - made_up: previously missed workout fulfilled via make-up session
 * - rest: scheduled rest day (NEVER missed, NEVER in consistency denominator)
 */
export const getWeeklyScheduleWithStatus = (
  plan,
  attendances = [],
  referenceDate = new Date(),
  memberJoinDate = null
) => {
  const daysCount = plan?.daysPerWeek || (plan?.days ? plan.days.length : 5);
  const now = new Date(referenceDate);
  const jsDay = now.getDay();
  const currentDayIndex = jsDay === 0 ? 6 : jsDay - 1; // 0=Mon, ..., 6=Sun

  // Current week bounds (Mon 00:00:00 to Sun 23:59:59)
  const monday = new Date(now);
  monday.setDate(now.getDate() - currentDayIndex);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Check member join date & whether current week is the first onboarding week (PART 3 & 4)
  let joinDayIndex = null;
  let isJoinWeek = false;
  let joinMidnight = null;

  if (memberJoinDate) {
    const jd = new Date(memberJoinDate);
    if (!isNaN(jd.getTime())) {
      joinMidnight = new Date(jd.getFullYear(), jd.getMonth(), jd.getDate(), 0, 0, 0);
      const jdDay = jd.getDay();
      joinDayIndex = jdDay === 0 ? 6 : jdDay - 1;

      const joinMonday = new Date(joinMidnight);
      joinMonday.setDate(joinMidnight.getDate() - joinDayIndex);
      joinMonday.setHours(0, 0, 0, 0);

      isJoinWeek = Math.abs(monday.getTime() - joinMonday.getTime()) < 86400000;
    }
  }

  // Base schedule: use saved 7-day schedule if exists, otherwise generate (with joinDayIndex if first week)
  const baseSchedule =
    plan?.weekSchedule && plan.weekSchedule.length === 7
      ? plan.weekSchedule
      : buildWeeklySchedule(daysCount, plan?.days || [], isJoinWeek ? joinDayIndex : null);

  // Filter completed attendances for this week
  const weekAttendances = (attendances || []).filter((att) => {
    if (!att.checkInTime) return false;
    const d = new Date(att.checkInTime);
    return d >= monday && d <= sunday && att.status === 'completed';
  });

  const completedDayNumbers = new Set();
  const madeUpDayNumbers = new Set();
  const daysWithSession = new Set();

  weekAttendances.forEach((att) => {
    if (att.sessionType === 'makeup' && att.makeupForDayNumber) {
      madeUpDayNumbers.add(Number(att.makeupForDayNumber));
    } else if (att.scheduleDay) {
      const match = att.scheduleDay.match(/Day\s*(\d+)/i);
      if (match) {
        completedDayNumbers.add(Number(match[1]));
      }
    }
    // Track calendar day index of this attendance
    const inTime = new Date(att.checkInTime);
    const dayOfWeek = inTime.getDay();
    const dayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    daysWithSession.add(dayIdx);
  });

  // Also check if days in plan were marked isCompleted
  if (plan?.days) {
    plan.days.forEach((d) => {
      if (d.isCompleted) {
        completedDayNumbers.add(d.dayNumber);
      }
    });
  }

  return baseSchedule.map((slot, idx) => {
    const isPast = idx < currentDayIndex;
    const isToday = idx === currentDayIndex;
    const isFuture = idx > currentDayIndex;

    const slotDate = new Date(monday);
    slotDate.setDate(monday.getDate() + idx);
    slotDate.setHours(23, 59, 59, 999);

    // Days before member joined must NEVER be marked as missed! (PART 3)
    const isBeforeJoin = joinMidnight && slotDate < joinMidnight;

    let status = 'scheduled';
    if (slot.type === 'rest' || isBeforeJoin) {
      status = (!isBeforeJoin && daysWithSession.has(idx)) ? 'completed' : 'rest';
    } else {
      const dayNum = slot.workoutDayNumber;
      if (completedDayNumbers.has(dayNum) || daysWithSession.has(idx)) {
        status = 'completed';
      } else if (madeUpDayNumbers.has(dayNum)) {
        status = 'made_up';
      } else if (isPast) {
        status = 'missed';
      } else {
        status = 'scheduled';
      }
    }

    return {
      dayOfWeek: slot.dayOfWeek,
      dayIndex: idx,
      type: slot.type,
      workoutDayNumber: slot.workoutDayNumber,
      workoutDayName: slot.workoutDayName,
      focus: slot.focus,
      status,
      workoutId: slot.workoutId,
      workoutSource: slot.workoutSource || (plan?.planType === 'custom' ? 'custom' : (plan?.planType === 'trainer' ? 'trainer' : 'recommended')),
      isToday,
      isPast,
      isFuture,
    };
  });
};

/**
 * Calculate estimated workout duration from assigned exercises:
 * 45 seconds active time per set + prescribed rest between sets
 * e.g. 3 sets, 90s rest -> 3*45 + 2*90 = 135 + 180 = 315 seconds = 5.25 mins
 */
export const calculateEstimatedWorkoutDurationMinutes = (exercises = []) => {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return 50; // default 50 mins
  }

  let totalSeconds = 0;
  for (const ex of exercises) {
    const sets = Number(ex.sets) || 3;
    const restSeconds = Number(ex.restSeconds) || 60;
    const activeSeconds = sets * 45;
    const restTotal = Math.max(0, sets - 1) * restSeconds;
    totalSeconds += activeSeconds + restTotal;
  }

  const minutes = Math.round((totalSeconds / 60) * 10) / 10;
  return Math.max(10, minutes);
};

/**
 * Calculate realism factor:
 * realismFactor = actualSessionDuration / (estimatedWorkoutDuration * 0.5)
 * Capped at: min 0, max 1.0
 */
export const calculateRealismFactor = (actualDurationMinutes, estimatedDurationMinutes = 50) => {
  const actual = Math.max(0, Number(actualDurationMinutes) || 0);
  const estimated = Math.max(10, Number(estimatedDurationMinutes) || 50);
  const halfEstimated = estimated * 0.5;

  if (halfEstimated <= 0) return 1.0;
  const factor = actual / halfEstimated;
  return Math.max(0, Math.min(1.0, factor));
};

/**
 * Calculate session score factoring in exercise completion rate and realism factor:
 * completionRate = completedExercises / assignedExercises
 * sessionScore = completionRate * realismFactor
 */
export const calculateSessionScore = (completedCount, assignedCount, actualMinutes, estimatedMinutes = 50) => {
  const assigned = Number(assignedCount) || 5;
  const completed = Number(completedCount) || 0;
  const completionRate = assigned > 0 ? completed / assigned : 0;
  const realismFactor = calculateRealismFactor(actualMinutes, estimatedMinutes);
  const scorePercent = Math.min(100, Math.round(completionRate * realismFactor * 100));

  return {
    completionRate,
    realismFactor: Math.round(realismFactor * 1000) / 1000,
    sessionScore: scorePercent,
  };
};

/**
 * Automatic Fitness Level Progression Rules:
 * BEGINNER -> INTERMEDIATE:
 *   Option A: 6 consecutive completed months >= 90%
 *   OR Option B: 8 consecutive completed months >= 80%
 * INTERMEDIATE -> ADVANCED:
 *   Option A: 8 consecutive completed months >= 90%
 *   OR Option B: 12 consecutive completed months >= 80%
 * ADVANCED -> PRO:
 *   Option A: 12 consecutive completed months >= 90%
 *   OR Option B: 18 consecutive completed months >= 80%
 * Level can ONLY move UP.
 */
export const evaluateLevelPromotion = (currentLevel = 'beginner', monthlyScores = []) => {
  const normLevel = (currentLevel || 'beginner').toLowerCase();
  const scores = (monthlyScores || []).map((s) => Number(s) || 0);

  const getMaxConsecutive = (threshold) => {
    let max = 0;
    let curr = 0;
    for (const s of scores) {
      if (s >= threshold) {
        curr++;
        if (curr > max) max = curr;
      } else {
        curr = 0;
      }
    }
    return max;
  };

  const streak90 = getMaxConsecutive(90);
  const streak80 = getMaxConsecutive(80);

  let newLevel = normLevel;
  let reason = '';

  // BEGINNER -> INTERMEDIATE
  if (normLevel === 'beginner') {
    if (streak90 >= 6 || streak80 >= 8) {
      newLevel = 'intermediate';
      reason = streak90 >= 6
        ? '6 consecutive completed months with consistency >= 90%'
        : '8 consecutive completed months with consistency >= 80%';
    }
  }

  // INTERMEDIATE -> ADVANCED
  if (newLevel === 'intermediate') {
    if (streak90 >= 8 || streak80 >= 12) {
      newLevel = 'advanced';
      reason = streak90 >= 8
        ? '8 consecutive completed months with consistency >= 90%'
        : '12 consecutive completed months with consistency >= 80%';
    }
  }

  // ADVANCED -> PRO
  if (newLevel === 'advanced') {
    if (streak90 >= 12 || streak80 >= 18) {
      newLevel = 'pro';
      reason = streak90 >= 12
        ? '12 consecutive completed months with consistency >= 90%'
        : '18 consecutive completed months with consistency >= 80%';
    }
  }

  const currentRank = LEVEL_RANKS[normLevel] || 1;
  const newRank = LEVEL_RANKS[newLevel] || 1;
  const isPromoted = newRank > currentRank;

  return {
    currentLevel: normLevel,
    newLevel: isPromoted ? newLevel : normLevel,
    promoted: isPromoted,
    reason,
    streak90,
    streak80,
  };
};

export const syncMemberFitnessLevel = async (userId, customMonthlyScores = null) => {
  let profile = await FitnessProfile.findOne({ userId });
  if (!profile) {
    profile = await FitnessProfile.create({
      userId,
      fitnessGoal: 'muscle_gain',
      initialLevel: 'beginner',
      currentLevel: 'beginner',
      experienceLevel: 'beginner',
      levelSince: new Date(),
      plannedDaysPerWeek: 5,
    });
  }

  const currentLevel = (profile.currentLevel || profile.experienceLevel || profile.initialLevel || 'beginner').toLowerCase();
  profile.currentLevel = currentLevel;
  profile.experienceLevel = currentLevel;

  let monthlyScores = [];
  if (Array.isArray(customMonthlyScores)) {
    monthlyScores = customMonthlyScores;
  } else if (Array.isArray(profile.monthlyHistory) && profile.monthlyHistory.length > 0) {
    monthlyScores = profile.monthlyHistory.map((m) => m.consistencyPercentage);
  } else {
    // Gather from Attendance records grouped by calendar month
    const allCompleted = await Attendance.find({ userId, status: 'completed' }).sort({ checkInTime: 1 }).lean();
    if (allCompleted.length > 0) {
      const monthMap = new Map();
      allCompleted.forEach((s) => {
        const ym = new Date(s.checkInTime).toISOString().slice(0, 7);
        if (!monthMap.has(ym)) monthMap.set(ym, []);
        monthMap.get(ym).push(s);
      });
      for (const [ym, sessions] of monthMap.entries()) {
        const mMetrics = calculateConsistencyMetrics({
          expectedWorkoutDays: profile.plannedDaysPerWeek || 5,
          sessions,
        });
        monthlyScores.push(mMetrics.consistencyPercentage);
      }
    }
  }

  const evalResult = evaluateLevelPromotion(currentLevel, monthlyScores);

  if (evalResult.promoted) {
    const fromLevel = currentLevel;
    const toLevel = evalResult.newLevel;
    profile.promotionHistory = profile.promotionHistory || [];
    profile.promotionHistory.push({
      from: fromLevel,
      to: toLevel,
      date: new Date(),
      reason: evalResult.reason,
    });
    profile.currentLevel = toLevel;
    profile.experienceLevel = toLevel;
    profile.levelSince = new Date();
    await profile.save();

    // Automatically regenerate recommended plan with new level
    let plan = await WorkoutPlan.findOne({ userId, planType: 'recommended' });
    if (plan) {
      const generated = generateRuleBasedPlan({
        fitnessGoal: profile.fitnessGoal,
        experienceLevel: toLevel,
        plannedDaysPerWeek: profile.plannedDaysPerWeek,
      });
      plan.name = generated.name;
      plan.experienceLevel = toLevel;
      plan.days = generated.days;
      await plan.save();
    }
  }

  return {
    currentLevel: profile.currentLevel,
    initialLevel: profile.initialLevel || 'beginner',
    levelSince: profile.levelSince,
    promotionHistory: profile.promotionHistory || [],
    promoted: evalResult.promoted,
    reason: evalResult.reason,
  };
};

export const getMemberDashboardData = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new Error('User not found');
  }

  // 1. Fetch or initialize FitnessProfile
  let profile = await FitnessProfile.findOne({ userId });
  if (!profile) {
    profile = await FitnessProfile.create({
      userId,
      fitnessGoal: 'muscle_gain',
      initialLevel: 'intermediate',
      currentLevel: 'intermediate',
      experienceLevel: 'intermediate',
      levelSince: new Date(),
      promotionHistory: [],
      plannedDaysPerWeek: 5,
      preferredSchedule: 'evening',
    });
  }

  const currentLevel = profile.currentLevel || profile.experienceLevel || profile.initialLevel || 'beginner';
  profile.currentLevel = currentLevel;
  profile.experienceLevel = currentLevel;

  // Synchronize membership status against expiry date
  const now = new Date();
  let membershipStatus = profile.membershipStatus || 'Pending';
  if (profile.membershipExpiry && new Date(profile.membershipExpiry) <= now) {
    if (membershipStatus === 'Active') {
      profile.membershipStatus = 'Expired';
      await profile.save();
      membershipStatus = 'Expired';
    }
  }

  const isActive = membershipStatus === 'Active';

  // 2. Fetch WorkoutPlan based on activeWorkoutSource only if member is active
  const activeSource = profile.activeWorkoutSource || (profile.trainerId ? 'trainer' : 'recommended');
  let plan = null;
  let weekSchedule = [];
  let todaySlot = null;
  let isRestDay = false;

  if (isActive) {
    if (activeSource === 'trainer' && profile.trainerId) {
      plan = await WorkoutPlan.findOne({
        userId,
        trainerId: profile.trainerId,
        planType: 'trainer',
        isActive: true,
      });
    } else if (activeSource === 'custom') {
      plan = await WorkoutPlan.findOne({ userId, planType: 'custom' });
    }
    if (!plan && activeSource !== 'trainer') {
      plan = await WorkoutPlan.findOne({ userId, planType: 'recommended' });
    }
    if ((!plan || !plan.days || plan.days.length === 0) && activeSource !== 'trainer') {
      const generated = generateRuleBasedPlan({
        fitnessGoal: profile.fitnessGoal,
        experienceLevel: currentLevel,
        plannedDaysPerWeek: profile.plannedDaysPerWeek || 5,
      });
      plan = await WorkoutPlan.create({
        userId,
        planType: 'recommended',
        ...generated,
      });
    }

    if (plan && (!plan.weekSchedule || plan.weekSchedule.length !== 7)) {
      plan.weekSchedule = buildWeeklySchedule(plan.daysPerWeek || plan.days.length, plan.days);
      await plan.save();
    }
  }

  // 3. Fetch this month's attendance records
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Authoritatively check and auto-checkout if closing time passed
  const activeDashboardRecord = await checkAndAutoCheckoutSession(userId, now);

  let attendances = await Attendance.find({
    userId,
    status: 'completed',
    checkInTime: { $gte: startOfMonth, $lte: endOfMonth },
  });

  const attendedDaysCount = attendances.length;
  const plannedDays = profile.plannedDaysPerWeek || 5;

  let consistencyPercentage = null;
  let todaysWorkout = null;

  if (isActive && plan) {
    const metrics = calculateConsistencyMetrics({
      expectedWorkoutDays: plannedDays,
      sessions: attendances,
    });
    consistencyPercentage = attendedDaysCount > 0 ? metrics.consistencyPercentage : 0;

    // 4. Select Today's Workout from Weekly Schedule (NOT hardcoded Day 3, NOT modulo)
    weekSchedule = getWeeklyScheduleWithStatus(plan, attendances, now);
    todaySlot = weekSchedule.find((s) => s.isToday);
    isRestDay = todaySlot?.type === 'rest';

    if (!isRestDay && todaySlot) {
      const currentDay = plan.days.find((d) => d.dayNumber === todaySlot.workoutDayNumber) || plan.days[0];
      if (currentDay) {
        todaysWorkout = {
          dayNumber: currentDay.dayNumber,
          workoutName: currentDay.dayName,
          focus: currentDay.focus,
          exercises: currentDay.exercises.map((ex) => ({
            exerciseName: ex.exerciseName,
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.restSeconds,
          })),
        };
      }
    }
  }

  const kolkataDateInfo = getKolkataDateInfo(now);
  const todayDateKey = kolkataDateInfo.dateKey;
  const todayCompletedSession = attendances.find((r) => (r.dateKey === todayDateKey || r.checkInTime?.toISOString().slice(0, 10) === todayDateKey) && r.status === 'completed') || null;
  const hasCompletedWorkoutToday = Boolean(todayCompletedSession);
  const hasWorkoutToday = Boolean(activeDashboardRecord || todayCompletedSession);

  return {
    member: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
    membership: {
      status: membershipStatus,
    },
    currentGoal: profile.fitnessGoal,
    fitnessLevel: currentLevel,
    currentLevel: currentLevel,
    initialLevel: profile.initialLevel || 'beginner',
    levelSince: profile.levelSince || user.createdAt,
    promotionHistory: profile.promotionHistory || [],
    plannedWorkoutDays: plannedDays,
    thisMonthsAttendance: attendedDaysCount,
    consistencyPercentage,
    activeWorkoutSource: activeSource,
    isRestDay,
    todaySchedule: todaySlot,
    weekSchedule,
    todaysWorkout,
    activeCheckIn: activeDashboardRecord || null,
    todayCompletedSession: todayCompletedSession ? (todayCompletedSession.toObject ? todayCompletedSession.toObject() : todayCompletedSession) : null,
    hasCompletedWorkoutToday,
    hasWorkoutToday,
  };
};

export const getMemberWorkoutPlan = async (userId) => {
  let profile = await FitnessProfile.findOne({ userId });
  if (!profile) {
    profile = await FitnessProfile.create({
      userId,
      fitnessGoal: 'muscle_gain',
      initialLevel: 'beginner',
      currentLevel: 'beginner',
      experienceLevel: 'beginner',
      levelSince: new Date(),
      promotionHistory: [],
      plannedDaysPerWeek: 5,
      preferredSchedule: 'evening',
    });
  }

  const currentLevel = (profile.currentLevel || profile.experienceLevel || profile.initialLevel || 'beginner').toLowerCase();
  profile.currentLevel = currentLevel;
  profile.experienceLevel = currentLevel;

  const userDoc = await User.findById(userId).select('createdAt').lean();
  const joinDate = profile?.membershipStartDate || userDoc?.createdAt || profile?.createdAt || new Date();
  const isActive = profile?.membershipStatus === 'Active';

  if (!isActive) {
    const previewGenerated = generateRuleBasedPlan({
      fitnessGoal: profile.fitnessGoal || 'muscle_gain',
      experienceLevel: currentLevel,
      plannedDaysPerWeek: profile.plannedDaysPerWeek || 5,
    });
    const previewPlan = {
      _id: 'preview_plan',
      name: `Preview: ${previewGenerated.name}`,
      planType: 'recommended',
      ...previewGenerated,
    };
    previewPlan.weekSchedule = getWeeklyScheduleWithStatus(previewPlan, [], new Date(), joinDate);
    return {
      isPreview: true,
      recommendedPlan: previewPlan,
      customPlan: null,
      activeWorkoutSource: profile.activeWorkoutSource || (profile.trainerId ? 'trainer' : 'recommended'),
      profile,
    };
  }

  const rawJoinDate = profile?.membershipStartDate || userDoc?.createdAt || profile?.createdAt || new Date();
  const dObj = new Date(rawJoinDate);
  const joinDayIndex = !isNaN(dObj.getTime()) ? (dObj.getDay() === 0 ? 6 : dObj.getDay() - 1) : 0;

  let recommendedPlan = await WorkoutPlan.findOne({ userId, planType: 'recommended' });
  if (!recommendedPlan) {
    const generated = generateRuleBasedPlan({
      fitnessGoal: profile.fitnessGoal || 'muscle_gain',
      experienceLevel: currentLevel,
      plannedDaysPerWeek: profile.plannedDaysPerWeek || 5,
      joinDayIndex,
    });
    recommendedPlan = await WorkoutPlan.create({
      userId,
      planType: 'recommended',
      ...generated,
    });
  }

  // Ensure no duplicate recommended plans exist for this member
  await WorkoutPlan.deleteMany({
    userId,
    planType: 'recommended',
    _id: { $ne: recommendedPlan._id },
  });

  let customPlan = await WorkoutPlan.findOne({ userId, planType: 'custom' });

  if (recommendedPlan && (!recommendedPlan.weekSchedule || recommendedPlan.weekSchedule.length !== 7)) {
    recommendedPlan.weekSchedule = buildWeeklySchedule(recommendedPlan.daysPerWeek || recommendedPlan.days.length, recommendedPlan.days);
    await recommendedPlan.save();
  }

  if (customPlan && (!customPlan.weekSchedule || customPlan.weekSchedule.length !== 7)) {
    customPlan.weekSchedule = buildWeeklySchedule(customPlan.daysPerWeek || customPlan.days.length, customPlan.days);
    await customPlan.save();
  }

  // Synchronize activeWorkoutSource consistency with trainerId
  if (profile.trainerId && profile.activeWorkoutSource !== 'trainer') {
    profile.activeWorkoutSource = 'trainer';
    await profile.save();
  } else if (!profile.trainerId && profile.activeWorkoutSource === 'trainer') {
    profile.activeWorkoutSource = profile.previousPersonalSource === 'custom' ? 'custom' : 'recommended';
    await profile.save();
  }

  // Trainer Assigned Plan logic - STRICT CONDITIONAL FETCH (PART 10)
  // ONLY fetch trainer plan and trainer info if trainerId exists AND activeWorkoutSource === 'trainer'
  let trainerPlan = null;
  let trainerUser = null;
  if (profile.trainerId && profile.activeWorkoutSource === 'trainer') {
    trainerUser = await User.findById(profile.trainerId).select('fullName email specialization').lean();
    trainerPlan = await WorkoutPlan.findOne({
      userId,
      trainerId: profile.trainerId,
      planType: 'trainer',
      isActive: true,
    });
    if (!trainerPlan) {
      trainerPlan = await WorkoutPlan.findOne({
        userId,
        trainerId: profile.trainerId,
        planType: 'trainer',
      });
      if (trainerPlan) {
        trainerPlan.isActive = true;
        await trainerPlan.save();
      }
    }
    if (trainerPlan) {
      if (!trainerPlan.weekSchedule || trainerPlan.weekSchedule.length !== 7) {
        trainerPlan.weekSchedule = buildWeeklySchedule(
          trainerPlan.daysPerWeek || (trainerPlan.days ? trainerPlan.days.length : 5),
          trainerPlan.days || []
        );
        await trainerPlan.save();
      }
    }
  }

  const attendances = await Attendance.find({ userId }).lean();

  const recObj = recommendedPlan.toObject ? recommendedPlan.toObject() : recommendedPlan;
  recObj.weekSchedule = getWeeklyScheduleWithStatus(recommendedPlan, attendances, new Date(), joinDate);

  let custObj = null;
  if (customPlan) {
    custObj = customPlan.toObject ? customPlan.toObject() : customPlan;
    custObj.weekSchedule = getWeeklyScheduleWithStatus(customPlan, attendances, new Date(), joinDate);
  }

  let trainObj = null;
  if (trainerPlan) {
    trainObj = trainerPlan.toObject ? trainerPlan.toObject() : trainerPlan;
    trainObj.weekSchedule = getWeeklyScheduleWithStatus(trainerPlan, attendances, new Date(), joinDate);
  }

  return {
    isPreview: false,
    recommendedPlan: recObj,
    customPlan: custObj,
    trainerPlan: trainObj,
    hasTrainerPlan: Boolean(trainerPlan && trainerPlan.days && trainerPlan.days.length > 0),
    trainerInfo: trainerUser
      ? {
          id: trainerUser._id,
          _id: trainerUser._id,
          fullName: trainerUser.fullName,
          email: trainerUser.email,
          specialization: trainerUser.specialization || 'General Fitness & Conditioning',
        }
      : null,
    activeWorkoutSource: profile.activeWorkoutSource || (profile.trainerId ? 'trainer' : 'recommended'),
    profile,
    activeCheckIn: (await checkAndAutoCheckoutSession(userId, new Date())) || null,
    todayCompletedSession: (() => {
      const { dateKey: todayDateKey } = getKolkataDateInfo(new Date());
      return attendances.find((r) => (r.dateKey === todayDateKey || r.checkInTime?.toISOString().slice(0, 10) === todayDateKey) && r.status === 'completed') || null;
    })(),
    hasCompletedWorkoutToday: Boolean((() => {
      const { dateKey: todayDateKey } = getKolkataDateInfo(new Date());
      return attendances.find((r) => (r.dateKey === todayDateKey || r.checkInTime?.toISOString().slice(0, 10) === todayDateKey) && r.status === 'completed');
    })()),
  };
};

export const updateActiveWorkoutSourceService = async (userId, activeWorkoutSource) => {
  let profile = await FitnessProfile.findOne({ userId });
  if (!profile) {
    profile = await FitnessProfile.create({ userId });
  }

  if (profile.trainerId) {
    if (activeWorkoutSource !== 'trainer') {
      const error = new Error('Trainer Assigned Workout is active while a personal trainer is assigned. To switch to self-guided workouts, remove your trainer in Profile.');
      error.statusCode = 400;
      throw error;
    }
    profile.activeWorkoutSource = 'trainer';
    await profile.save();
    return { activeWorkoutSource: 'trainer' };
  }

  const source = activeWorkoutSource === 'custom' ? 'custom' : 'recommended';
  profile.activeWorkoutSource = source;
  profile.previousPersonalSource = source;
  await profile.save();

  await WorkoutPlan.updateMany({ userId, planType: { $in: ['recommended', 'custom'] } }, { $set: { isActive: false } });
  await WorkoutPlan.updateOne({ userId, planType: source }, { $set: { isActive: true } });

  return { activeWorkoutSource: source };
};

export const updateMemberWeeklyScheduleService = async (userId, weekSchedule) => {
  if (!Array.isArray(weekSchedule) || weekSchedule.length !== 7) {
    const error = new Error('Weekly schedule must contain exactly 7 calendar days.');
    error.statusCode = 400;
    throw error;
  }

  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const cleanedSchedule = weekSchedule.map((item, idx) => {
    const expectedDay = validDays[idx] || item.dayOfWeek;
    const type = item.type === 'rest' ? 'rest' : 'workout';
    const workoutSource = item.workoutSource === 'custom' ? 'custom' : 'recommended';
    return {
      dayOfWeek: expectedDay,
      dayIndex: idx,
      type,
      workoutSource,
      workoutDayNumber: type === 'workout' ? (Number(item.workoutDayNumber) || idx + 1) : null,
      workoutDayName: type === 'workout' ? (item.workoutDayName || `Day ${item.workoutDayNumber || idx + 1}`) : 'Rest Day',
      focus: item.focus || (type === 'workout' ? 'Workout' : 'Rest & Recovery'),
      status: type === 'workout' ? (item.status || 'scheduled') : 'rest',
      completedAt: item.completedAt || null,
      workoutId: item.workoutId ? String(item.workoutId) : null,
      routineDayId: item.routineDayId ? String(item.routineDayId) : null,
    };
  });

  const profile = await FitnessProfile.findOne({ userId });
  const activeSource = profile?.activeWorkoutSource || 'recommended';

  if (activeSource === 'trainer') {
    const error = new Error('Cannot modify trainer-assigned weekly routine directly. Routine is managed by your trainer.');
    error.statusCode = 403;
    throw error;
  }

  let plan = null;
  if (activeSource === 'custom') {
    plan = await WorkoutPlan.findOne({ userId, planType: 'custom' });
  }
  if (!plan) {
    plan = await WorkoutPlan.findOne({ userId, planType: 'recommended' });
  }
  if (!plan) {
    plan = await WorkoutPlan.findOne({ userId, isActive: true });
  }

  if (!plan) {
    const error = new Error('Workout plan not found for this member.');
    error.statusCode = 404;
    throw error;
  }

  plan.weekSchedule = cleanedSchedule;
  const workoutCount = cleanedSchedule.filter((d) => d.type === 'workout').length;
  if (workoutCount > 0) {
    plan.daysPerWeek = workoutCount;
    if (profile) {
      profile.plannedDaysPerWeek = workoutCount;
      await profile.save();
    }
  }

  await plan.save();

  // If both plans exist, keep weekSchedule synchronized across both
  const otherPlanType = activeSource === 'custom' ? 'recommended' : 'custom';
  const otherPlan = await WorkoutPlan.findOne({ userId, planType: otherPlanType });
  if (otherPlan) {
    otherPlan.weekSchedule = cleanedSchedule;
    otherPlan.daysPerWeek = workoutCount;
    await otherPlan.save();
  }

  return {
    weekSchedule: plan.weekSchedule,
    plannedDaysPerWeek: plan.daysPerWeek,
  };
};

export const updateMemberFitnessProfile = async (userId, updateData = {}) => {
  let profile = await FitnessProfile.findOne({ userId });
  if (!profile) {
    profile = new FitnessProfile({ userId });
  }

  // System-calculated level MUST NOT be manually overwritten by user updates
  const currentLevel = (profile.currentLevel || profile.experienceLevel || profile.initialLevel || 'beginner').toLowerCase();
  profile.currentLevel = currentLevel;
  profile.experienceLevel = currentLevel;

  const validGoals = ['muscle_gain', 'fat_loss', 'strength', 'general_fitness', 'endurance'];
  if (updateData.fitnessGoal && validGoals.includes(updateData.fitnessGoal)) {
    profile.fitnessGoal = updateData.fitnessGoal;
  }
  const daysVal = updateData.plannedDaysPerWeek !== undefined ? updateData.plannedDaysPerWeek : updateData.plannedWorkoutDays;
  if (daysVal !== undefined && daysVal !== null) {
    const parsedDays = Number(daysVal);
    if (!isNaN(parsedDays) && parsedDays >= 1 && parsedDays <= 7) {
      profile.plannedDaysPerWeek = parsedDays;
    }
  }
  if (updateData.preferredSchedule) profile.preferredSchedule = updateData.preferredSchedule;

  await profile.save();

  const userDoc = await User.findById(userId).select('createdAt').lean();
  const joinDate = profile?.membershipStartDate || userDoc?.createdAt || profile?.createdAt || new Date();
  const dObj = new Date(joinDate);
  const joinDayIndex = !isNaN(dObj.getTime()) ? (dObj.getDay() === 0 ? 6 : dObj.getDay() - 1) : 0;

  // Generate new rule-based workout plan based on the updated profile and system currentLevel
  const generated = generateRuleBasedPlan({
    fitnessGoal: profile.fitnessGoal,
    experienceLevel: currentLevel,
    plannedDaysPerWeek: profile.plannedDaysPerWeek,
    joinDayIndex,
  });

  let plan = await WorkoutPlan.findOne({ userId, planType: 'recommended' });
  if (plan) {
    plan.name = generated.name;
    plan.goal = generated.goal;
    plan.experienceLevel = currentLevel;
    plan.daysPerWeek = generated.daysPerWeek;
    plan.days = generated.days;
    plan.weekSchedule = generated.weekSchedule;
    plan.isActive = true;
    await plan.save();
  } else {
    plan = await WorkoutPlan.create({
      userId,
      planType: 'recommended',
      ...generated,
    });
  }

  // Prevent duplicate recommended plans for this user in MongoDB
  await WorkoutPlan.deleteMany({
    userId,
    planType: 'recommended',
    _id: { $ne: plan._id },
  });

  const attendances = await Attendance.find({ userId }).lean();
  const planObj = plan.toObject ? plan.toObject() : { ...plan };
  planObj.weekSchedule = getWeeklyScheduleWithStatus(plan, attendances, new Date(), joinDate);

  return { plan: planObj, profile };
};

export const regenerateMemberWorkoutPlan = async (userId, overrides = {}) => {
  return await updateMemberFitnessProfile(userId, overrides);
};

export const toggleWorkoutDayCompletion = async (userId, dayNumber, planId) => {
  const now = new Date();
  const { dateKey } = getKolkataDateInfo(now);

  // One workout session per calendar day check
  let existingCompletedToday = null;
  try {
    existingCompletedToday = await Attendance.findOne({
      userId,
      dateKey,
      status: 'completed',
    });
  } catch (err) {
    existingCompletedToday = inMemoryAttendance.find(
      (r) => String(r.userId) === String(userId) && r.dateKey === dateKey && r.status === 'completed'
    );
  }

  if (existingCompletedToday) {
    const error = new Error('Workout completed for today. Only one workout session is permitted per calendar day.');
    error.status = 400;
    error.statusCode = 400;
    error.code = 'WORKOUT_ALREADY_COMPLETED_TODAY';
    throw error;
  }

  const query = { userId };
  if (planId) {
    query._id = planId;
  } else {
    query.isActive = true; // fallback
  }
  const plan = await WorkoutPlan.findOne(query);
  if (!plan) {
    throw new Error('Active workout plan not found');
  }

  const dayIndex = plan.days.findIndex((d) => d.dayNumber === Number(dayNumber));
  if (dayIndex === -1) {
    throw new Error(`Workout day ${dayNumber} not found in plan`);
  }

  // Permanent one-way completion
  plan.days[dayIndex].isCompleted = true;
  plan.days[dayIndex].completedAt = plan.days[dayIndex].completedAt || now;

  // Also update exercises in day
  if (plan.days[dayIndex].exercises) {
    plan.days[dayIndex].exercises.forEach((ex) => {
      ex.isCompleted = true;
      if (!ex.imageUrl) {
        ex.imageUrl = getExerciseImageUrl(ex.exerciseName);
      }
    });
  }

  if (plan.weekSchedule) {
    const slot = plan.weekSchedule.find((s) => s.workoutDayNumber === Number(dayNumber));
    if (slot) {
      slot.status = 'completed';
      slot.completedAt = slot.completedAt || now;
    }
  }

  await plan.save();

  // Also create completed Attendance record to synchronize today's completed workout across attendance & consistency
  const targetDay = plan.days[dayIndex];
  const assignedExercises = (targetDay.exercises || []).map((ex, idx) => ({
    exerciseId: ex._id ? ex._id.toString() : `ex_${idx + 1}`,
    exerciseName: ex.exerciseName,
    sets: Number(ex.sets) || 3,
    reps: ex.reps || '10-12',
    restSeconds: Number(ex.restSeconds) || 60,
    isCompleted: true,
    completedAt: now,
    imageUrl: ex.imageUrl || getExerciseImageUrl(ex.exerciseName),
  }));

  try {
    await Attendance.create({
      userId,
      checkInTime: new Date(now.getTime() - 45 * 60000),
      checkOutTime: now,
      durationMinutes: 45,
      estimatedDurationMinutes: 45,
      realismFactor: 1.0,
      status: 'completed',
      dateKey,
      workoutPlanId: plan._id,
      workoutDayName: targetDay.dayName || `Day ${targetDay.dayNumber}`,
      scheduleDay: targetDay.dayName || `Day ${targetDay.dayNumber}`,
      workoutSource: plan.planType || 'recommended',
      sessionType: 'scheduled',
      totalAssigned: assignedExercises.length,
      totalCompleted: assignedExercises.length,
      sessionScore: 100,
      exercises: assignedExercises,
    });
  } catch (err) {
    // Attendance creation fallback
  }

  recordSyncEvent('attendance', { userId: String(userId), status: 'completed' });
  recordSyncEvent('workoutPlan', { memberId: String(userId) });

  return {
    dayNumber: Number(dayNumber),
    isCompleted: true,
    completedAt: plan.days[dayIndex].completedAt,
    plan,
  };
};

// In-memory attendance cache fallback if db is offline
const inMemoryAttendance = [];

/**
 * Auto-checks and finalizes any active gym session whose gym closing time or closure has arrived.
 * Strict authority on MongoDB database.
 * If currentTime >= closingTime (in Asia/Kolkata), marks status = 'completed',
 * checkOutTime = configured closingTime, calculates duration & session score,
 * updates WorkoutPlan if assigned, and emits sync events.
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {Date} [referenceDate=new Date()]
 * @returns {Promise<object|null>} Returns the remaining active session, or null if none/auto-closed.
 */
export const checkAndAutoCheckoutSession = async (userId, referenceDate = new Date()) => {
  const now = referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();
  const currentKolkataInfo = getKolkataDateInfo(now);

  let activeRecords = [];
  try {
    activeRecords = await Attendance.find({
      userId,
      status: 'active',
    }).sort({ checkInTime: 1 });
  } catch (err) {
    activeRecords = inMemoryAttendance.filter(
      (r) => String(r.userId) === String(userId) && r.status === 'active'
    );
  }

  if (!activeRecords || activeRecords.length === 0) {
    return null;
  }

  // Fetch gym schedule to determine official closing time
  let schedule = null;
  try {
    schedule = await GymSchedule.findOne().lean();
  } catch (e) {
    schedule = null;
  }

  let remainingActive = null;

  for (const record of activeRecords) {
    const sessionDateKey = record.dateKey || currentKolkataInfo.dateKey;
    const checkInTime = new Date(record.checkInTime);
    const sessionKolkataInfo = getKolkataDateInfo(checkInTime);
    const sessionDayOfWeek = sessionKolkataInfo.dayOfWeek;

    // Resolve configured hours for the session's day
    let sessionHours = null;
    if (schedule && Array.isArray(schedule.dailyHours)) {
      sessionHours = schedule.dailyHours.find(
        (d) => d.day && d.day.toLowerCase() === sessionDayOfWeek.toLowerCase()
      );
    }
    const closingTimeStr = (sessionHours?.closingTime || schedule?.closingTime || '10:00 PM').trim();
    const sessionClosingDate = getKolkataClosingDate(sessionDateKey, closingTimeStr);

    // Check if date-specific closure was scheduled for sessionDateKey
    let dateClosure = null;
    try {
      dateClosure = await GymClosure.findOne({ date: sessionDateKey, isClosed: true }).lean();
    } catch (e) {}

    const isPastClosingTime = now.getTime() >= sessionClosingDate.getTime();
    const isPastSessionDate = sessionDateKey < currentKolkataInfo.dateKey;
    const isClosureDay = Boolean(dateClosure && dateClosure.isClosed);

    if (isPastClosingTime || isPastSessionDate || isClosureDay) {
      // AUTO CHECK-OUT: Finalize this session in MongoDB!
      // PART 14: Use configured gym closing time as the official checkout time.
      const officialCheckOutTime = sessionClosingDate;
      const durationMs = Math.max(0, officialCheckOutTime.getTime() - checkInTime.getTime());
      const durationMinutes = Math.max(0, Math.round(durationMs / 60000));
      const estimatedDurationMinutes = record.estimatedDurationMinutes || calculateEstimatedWorkoutDurationMinutes(record.exercises);

      const totalAssigned = record.totalAssigned || (record.exercises?.length || 5);
      const totalCompleted = record.exercises?.filter((e) => e.isCompleted).length || 0;
      const scoreResult = calculateSessionScore(totalCompleted, totalAssigned, durationMinutes, estimatedDurationMinutes);

      // Sync completed session with WorkoutPlan in MongoDB
      if (record.workoutPlanId) {
        try {
          const plan = await WorkoutPlan.findById(record.workoutPlanId);
          if (plan) {
            let targetDayNum = record.makeupForDayNumber;
            if (!targetDayNum && record.scheduleDay) {
              const match = record.scheduleDay.match(/Day\s*(\d+)/i);
              if (match) targetDayNum = Number(match[1]);
            }
            if (targetDayNum && plan.days) {
              const d = plan.days.find((day) => day.dayNumber === targetDayNum);
              if (d) {
                d.isCompleted = true;
                d.completedAt = officialCheckOutTime;
              }
            }
            if (targetDayNum && plan.weekSchedule) {
              const slot = plan.weekSchedule.find((s) => s.workoutDayNumber === targetDayNum);
              if (slot) {
                slot.status = record.sessionType === 'makeup' ? 'made_up' : 'completed';
                slot.completedAt = officialCheckOutTime;
              }
            }
            await plan.save();
          }
        } catch (e) {
          console.warn('Could not update WorkoutPlan on auto check-out:', e.message);
        }
      }

      if (record.save) {
        record.checkOutTime = officialCheckOutTime;
        record.durationMinutes = durationMinutes;
        record.estimatedDurationMinutes = estimatedDurationMinutes;
        record.realismFactor = scoreResult.realismFactor;
        record.status = 'completed';
        record.totalCompleted = totalCompleted;
        record.sessionScore = scoreResult.sessionScore;
        await record.save();
      } else {
        record.checkOutTime = officialCheckOutTime;
        record.durationMinutes = durationMinutes;
        record.estimatedDurationMinutes = estimatedDurationMinutes;
        record.realismFactor = scoreResult.realismFactor;
        record.status = 'completed';
        record.totalCompleted = totalCompleted;
        record.sessionScore = scoreResult.sessionScore;
        record.updatedAt = officialCheckOutTime;
      }

      recordSyncEvent('attendance', { userId: String(userId), status: 'completed', checkOutTime: officialCheckOutTime });
      recordSyncEvent('workoutPlan', { memberId: String(userId) });
    } else {
      if (!remainingActive) {
        remainingActive = record;
      }
    }
  }

  return remainingActive ? (remainingActive.toObject ? remainingActive.toObject() : remainingActive) : null;
};

export const getCurrentSessionService = async (userId) => {
  const now = new Date();
  const activeRecord = await checkAndAutoCheckoutSession(userId, now);
  const gymStatus = await getTodayGymStatus(now);
  return {
    activeCheckIn: activeRecord || null,
    gymStatus,
  };
};

export const getMemberAttendance = async (userId) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  let profile = await FitnessProfile.findOne({ userId });
  const isActive = profile?.membershipStatus === 'Active';

  // Preview mode for non-active members: return clean empty state
  if (!isActive) {
    return {
      records: [],
      thisMonthVisits: 0,
      activeCheckIn: null,
      weekSchedule: [],
      todaySchedule: null,
      todaysWorkout: null,
      isRestDay: false,
      missedWorkouts: [],
      activeWorkoutSource: 'recommended',
      plannedWorkoutDays: profile?.plannedDaysPerWeek || 5,
      isPreview: true,
    };
  }

  // 1. Authoritatively verify active sessions & auto-checkout if closing time passed
  const activeRecord = await checkAndAutoCheckoutSession(userId, now);

  let records = [];
  try {
    records = await Attendance.find({ userId, status: 'completed' })
      .sort({ checkInTime: -1 })
      .lean();
  } catch (err) {
    records = inMemoryAttendance
      .filter((r) => String(r.userId) === String(userId) && r.status === 'completed')
      .sort((a, b) => new Date(b.checkInTime) - new Date(a.checkInTime));
  }

  // Calculate this month's visits
  const thisMonthVisits = records.filter((r) => {
    const d = new Date(r.checkInTime);
    return d >= startOfMonth && d <= endOfMonth;
  }).length;

  // Determine active workout source and plan
  const activeSource = profile.activeWorkoutSource || (profile.trainerId ? 'trainer' : 'recommended');
  let plan = null;
  if (activeSource === 'trainer' && profile.trainerId) {
    plan = await WorkoutPlan.findOne({
      userId,
      trainerId: profile.trainerId,
      planType: 'trainer',
      isActive: true,
    });
  } else if (activeSource === 'custom') {
    plan = await WorkoutPlan.findOne({ userId, planType: 'custom' });
  }
  if (!plan && activeSource !== 'trainer') {
    plan = await WorkoutPlan.findOne({ userId, planType: 'recommended' });
  }
  if (!plan && activeSource !== 'trainer') {
    const generated = generateRuleBasedPlan({
      fitnessGoal: profile.fitnessGoal || 'muscle_gain',
      experienceLevel: profile.currentLevel || profile.experienceLevel || 'beginner',
      plannedDaysPerWeek: profile.plannedDaysPerWeek || 5,
    });
    plan = await WorkoutPlan.create({
      userId,
      planType: 'recommended',
      ...generated,
    });
  }

  let weekSchedule = [];
  let todaySlot = null;
  let isRestDay = false;
  let todaysWorkout = null;

  if (plan) {
    if (!plan.weekSchedule || plan.weekSchedule.length !== 7) {
      plan.weekSchedule = buildWeeklySchedule(plan.daysPerWeek || plan.days.length, plan.days);
      await plan.save();
    }

    weekSchedule = getWeeklyScheduleWithStatus(plan, records, now);
    todaySlot = weekSchedule.find((s) => s.isToday);
    isRestDay = todaySlot?.type === 'rest';

    if (!isRestDay && todaySlot) {
      const workoutDay = plan.days.find((d) => d.dayNumber === todaySlot.workoutDayNumber) || plan.days[0];
      if (workoutDay) {
        todaysWorkout = {
          dayNumber: workoutDay.dayNumber,
          workoutName: workoutDay.dayName,
          focus: workoutDay.focus,
          isCompleted: workoutDay.isCompleted || todaySlot.status === 'completed',
          exercises: (workoutDay.exercises || []).map((ex) => ({
            exerciseId: ex._id ? ex._id.toString() : ex.exerciseName,
            exerciseName: ex.exerciseName,
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.restSeconds,
            instructions: ex.instructions,
          })),
        };
      }
    }
  }

  const kolkataDateInfo = getKolkataDateInfo(now);
  const todayDateKey = kolkataDateInfo.dateKey;
  const todayCompletedSession = records.find(
    (r) => (r.dateKey === todayDateKey || r.checkInTime?.toISOString().slice(0, 10) === todayDateKey) && r.status === 'completed'
  ) || null;
  const hasCompletedWorkoutToday = Boolean(todayCompletedSession);
  const hasWorkoutToday = Boolean(activeRecord || todayCompletedSession);

  // Filter missed workouts from earlier in this week (slots marked missed)
  // If today already had a workout session (active or completed), NO make-up workouts can be selected today (Rules 10 & 11)
  const missedWorkouts = (hasCompletedWorkoutToday || activeRecord)
    ? []
    : weekSchedule
        .filter((s) => s.status === 'missed' && s.type === 'workout')
        .map((s) => {
          const workoutDay = plan?.days ? plan.days.find((d) => d.dayNumber === s.workoutDayNumber) : null;
          return {
            dayOfWeek: s.dayOfWeek,
            workoutDayNumber: s.workoutDayNumber,
            workoutDayName: s.workoutDayName,
            focus: s.focus,
            exercises: (workoutDay?.exercises || []).map((ex) => ({
              exerciseId: ex._id ? ex._id.toString() : ex.exerciseName,
              exerciseName: ex.exerciseName,
              sets: ex.sets,
              reps: ex.reps,
              restSeconds: ex.restSeconds,
              imageUrl: ex.imageUrl || getExerciseImageUrl(ex.exerciseName),
            })),
          };
        });

  return {
    records,
    thisMonthVisits,
    activeCheckIn: activeRecord,
    todayCompletedSession: todayCompletedSession ? (todayCompletedSession.toObject ? todayCompletedSession.toObject() : todayCompletedSession) : null,
    hasCompletedWorkoutToday,
    hasWorkoutToday,
    weekSchedule,
    todaySchedule: todaySlot,
    todaysWorkout,
    isRestDay,
    missedWorkouts,
    activeWorkoutSource: activeSource,
    plannedWorkoutDays: profile.plannedDaysPerWeek || 5,
    isPreview: false,
  };
};

export const memberCheckIn = async (userId, sessionOptions = {}) => {
  const now = new Date();
  const kolkataDateInfo = getKolkataDateInfo(now);
  const dateKey = kolkataDateInfo.dateKey;

  // 1. Authoritatively auto-checkout any session past closing time before evaluating check-in
  await checkAndAutoCheckoutSession(userId, now);

  // 2. Membership validation: check-in requires active membership
  let profile = await FitnessProfile.findOne({ userId });
  if (!profile || profile.membershipStatus !== 'Active') {
    const error = new Error('Active membership required to check in.');
    error.statusCode = 403;
    throw error;
  }

  // 3. Server-side gym hours & closure validation in Asia/Kolkata
  const gymStatus = await getTodayGymStatus(now);
  if (!gymStatus.isOpen) {
    const error = new Error(
      gymStatus.isClosure
        ? `Gym is closed today due to ${gymStatus.reason || 'a scheduled closure'}. Normal gym timings resume tomorrow.`
        : `Gym is currently closed. Today's hours: ${gymStatus.openingTime || '06:00 AM'} – ${gymStatus.closingTime || '10:00 PM'}.`
    );
    error.statusCode = gymStatus.isClosure ? 403 : 400;
    error.code = 'GYM_CLOSED';
    throw error;
  }

  // 4. Prevent duplicate check-in: if active session exists, return existing session (server-side enforced)
  let existingActive = null;
  try {
    existingActive = await Attendance.findOne({
      userId,
      status: 'active',
    });
  } catch (err) {
    existingActive = inMemoryAttendance.find(
      (r) => String(r.userId) === String(userId) && r.status === 'active'
    );
  }

  if (existingActive) {
    return existingActive.toObject ? existingActive.toObject() : existingActive;
  }

  // 4b. ONE WORKOUT SESSION PER CALENDAR DAY ENFORCEMENT (Rules 8, 9, 13)
  // Check if member already has a completed workout session for today (userId + dateKey)
  let existingCompletedToday = null;
  try {
    existingCompletedToday = await Attendance.findOne({
      userId,
      dateKey,
      status: 'completed',
    });
  } catch (err) {
    existingCompletedToday = inMemoryAttendance.find(
      (r) => String(r.userId) === String(userId) && r.dateKey === dateKey && r.status === 'completed'
    );
  }

  if (existingCompletedToday) {
    const error = new Error('Workout completed for today. Only one workout session is permitted per calendar day.');
    error.status = 400;
    error.statusCode = 400;
    error.code = 'WORKOUT_ALREADY_COMPLETED_TODAY';
    throw error;
  }

  // 5. Look up workout plan across recommended, custom, or trainer assigned source
  const source = sessionOptions.workoutSource || profile.activeWorkoutSource || (profile.trainerId ? 'trainer' : 'recommended');

  let plan = null;
  if (source === 'trainer' && profile.trainerId) {
    plan = await WorkoutPlan.findOne({
      userId,
      trainerId: profile.trainerId,
      planType: 'trainer',
      isActive: true,
    });
  } else if (source === 'custom') {
    plan = await WorkoutPlan.findOne({ userId, planType: 'custom' });
  }
  if (!plan && source !== 'trainer') {
    plan = await WorkoutPlan.findOne({ userId, planType: 'recommended' });
  }
  if (!plan) {
    plan = await WorkoutPlan.findOne({ userId, isActive: true });
  }

  let weekSchedule = [];
  if (plan) {
    if (!plan.weekSchedule || plan.weekSchedule.length !== 7) {
      plan.weekSchedule = buildWeeklySchedule(plan.daysPerWeek || plan.days.length, plan.days);
      await plan.save();
    }
    weekSchedule = getWeeklyScheduleWithStatus(plan, [], now);
  }

  const todaySlot = weekSchedule.find((s) => s.isToday);
  const isMakeup = sessionOptions.sessionType === 'makeup' || !!sessionOptions.makeupForDayNumber;
  const sessionType = isMakeup ? 'makeup' : 'scheduled';
  const makeupForDayNumber = isMakeup
    ? Number(sessionOptions.makeupForDayNumber || sessionOptions.dayNumber)
    : null;

  let targetDay = null;
  if (isMakeup && makeupForDayNumber && plan?.days) {
    targetDay = plan.days.find((d) => d.dayNumber === makeupForDayNumber);
  } else if (sessionOptions.dayNumber && plan?.days) {
    targetDay = plan.days.find((d) => d.dayNumber === Number(sessionOptions.dayNumber));
  } else if (todaySlot && todaySlot.type === 'workout' && plan?.days) {
    targetDay = plan.days.find((d) => d.dayNumber === todaySlot.workoutDayNumber);
  } else if (plan?.days && plan.days.length > 0) {
    targetDay = plan.days[0];
  }

  let assignedExercises = [];
  let workoutDayName = isMakeup ? 'Make-Up Workout' : 'Workout Session';
  let scheduleDay = todaySlot?.dayOfWeek || 'Today';

  if (targetDay) {
    workoutDayName = targetDay.dayName || targetDay.focus || workoutDayName;
    scheduleDay = targetDay.dayName || `Day ${targetDay.dayNumber}`;
    assignedExercises = (targetDay.exercises || []).map((ex, idx) => ({
      exerciseId: ex._id ? ex._id.toString() : `ex_${idx + 1}`,
      exerciseName: ex.exerciseName,
      sets: Number(ex.sets) || 3,
      reps: ex.reps || '10-12',
      restSeconds: Number(ex.restSeconds) || 60,
      isCompleted: false,
      completedAt: null,
      imageUrl: ex.imageUrl || getExerciseImageUrl(ex.exerciseName),
    }));
  }

  // Default fallback 5 exercises if member has no assigned plan
  if (assignedExercises.length === 0) {
    workoutDayName = 'General Gym Session';
    scheduleDay = 'General Gym Session';
    assignedExercises = [
      { exerciseId: 'ex_1', exerciseName: 'Barbell Flat Bench Press', sets: 4, reps: '8-10', restSeconds: 90, isCompleted: false, completedAt: null, imageUrl: '/exercises/bench-press.svg' },
      { exerciseId: 'ex_2', exerciseName: 'Incline Dumbbell Press', sets: 3, reps: '10-12', restSeconds: 60, isCompleted: false, completedAt: null, imageUrl: '/exercises/incline-press.svg' },
      { exerciseId: 'ex_3', exerciseName: 'Cable Chest Flyes', sets: 3, reps: '12-15', restSeconds: 60, isCompleted: false, completedAt: null, imageUrl: '/exercises/bench-press.svg' },
      { exerciseId: 'ex_4', exerciseName: 'Overhead Dumbbell Press', sets: 3, reps: '10-12', restSeconds: 60, isCompleted: false, completedAt: null, imageUrl: '/exercises/shoulder-press.svg' },
      { exerciseId: 'ex_5', exerciseName: 'Cable Triceps Rope Pushdown', sets: 3, reps: '12-15', restSeconds: 60, isCompleted: false, completedAt: null, imageUrl: '/exercises/tricep-pushdown.svg' },
    ];
  }

  const estimatedDurationMinutes = calculateEstimatedWorkoutDurationMinutes(assignedExercises);

  const newRecordData = {
    userId,
    checkInTime: now,
    checkOutTime: null,
    durationMinutes: 0,
    estimatedDurationMinutes,
    realismFactor: 1.0,
    status: 'active',
    dateKey,
    workoutPlanId: plan?._id || null,
    workoutDayName,
    scheduleDay,
    workoutSource: source,
    sessionType,
    makeupForDayNumber,
    totalAssigned: assignedExercises.length,
    totalCompleted: 0,
    sessionScore: 0,
    exercises: assignedExercises,
  };

  let savedRecord = null;
  try {
    savedRecord = await Attendance.create(newRecordData);
    savedRecord = savedRecord.toObject ? savedRecord.toObject() : savedRecord;
  } catch (err) {
    savedRecord = {
      _id: 'att_' + Date.now(),
      ...newRecordData,
      createdAt: now,
      updatedAt: now,
    };
    inMemoryAttendance.unshift(savedRecord);
  }

  recordSyncEvent('attendance', { userId: String(userId), status: 'active' });
  recordSyncEvent('workoutPlan', { memberId: String(userId) });

  return savedRecord;
};

export const memberCheckOut = async (userId) => {
  const now = new Date();

  let activeRecord = null;
  try {
    activeRecord = await Attendance.findOne({
      userId,
      status: 'active',
    }).sort({ checkInTime: -1 });
  } catch (err) {
    activeRecord = inMemoryAttendance.find(
      (r) => String(r.userId) === String(userId) && r.status === 'active'
    );
  }

  if (!activeRecord) {
    const error = new Error('No active check-in found to check out.');
    error.statusCode = 400;
    throw error;
  }

  // Determine official checkOutTime (capped at closing time if already reached)
  const sessionDateKey = activeRecord.dateKey;
  let schedule = null;
  try {
    schedule = await GymSchedule.findOne().lean();
  } catch (e) {}

  let sessionHours = null;
  if (schedule && Array.isArray(schedule.dailyHours)) {
    const dayOfWeek = getKolkataDateInfo(new Date(activeRecord.checkInTime)).dayOfWeek;
    sessionHours = schedule.dailyHours.find((d) => d.day && d.day.toLowerCase() === dayOfWeek.toLowerCase());
  }
  const closingTimeStr = (sessionHours?.closingTime || schedule?.closingTime || '10:00 PM').trim();
  const sessionClosingDate = getKolkataClosingDate(sessionDateKey, closingTimeStr);

  let checkOutTime = now;
  if (now.getTime() >= sessionClosingDate.getTime()) {
    checkOutTime = sessionClosingDate;
  }

  const checkInTime = new Date(activeRecord.checkInTime);
  // Calculate duration strictly from timestamps
  const durationMinutes = Math.max(0, Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000));
  const estimatedDurationMinutes = activeRecord.estimatedDurationMinutes || calculateEstimatedWorkoutDurationMinutes(activeRecord.exercises);

  const totalAssigned = activeRecord.totalAssigned || (activeRecord.exercises?.length || 5);
  const totalCompleted = activeRecord.exercises?.filter((e) => e.isCompleted).length || 0;
  const scoreResult = calculateSessionScore(totalCompleted, totalAssigned, durationMinutes, estimatedDurationMinutes);

  // Synchronize completion with the member's WorkoutPlan in MongoDB
  if (activeRecord.workoutPlanId) {
    try {
      const plan = await WorkoutPlan.findById(activeRecord.workoutPlanId);
      if (plan) {
        let targetDayNum = activeRecord.makeupForDayNumber;
        if (!targetDayNum && activeRecord.scheduleDay) {
          const match = activeRecord.scheduleDay.match(/Day\s*(\d+)/i);
          if (match) targetDayNum = Number(match[1]);
        }
        if (targetDayNum && plan.days) {
          const d = plan.days.find((day) => day.dayNumber === targetDayNum);
          if (d) {
            d.isCompleted = true;
            d.completedAt = checkOutTime;
          }
        }
        if (targetDayNum && plan.weekSchedule) {
          const slot = plan.weekSchedule.find((s) => s.workoutDayNumber === targetDayNum);
          if (slot) {
            slot.status = activeRecord.sessionType === 'makeup' ? 'made_up' : 'completed';
            slot.completedAt = checkOutTime;
          }
        }
        await plan.save();
      }
    } catch (e) {
      console.warn('Could not update WorkoutPlan on check-out:', e.message);
    }
  }

  if (activeRecord.save) {
    activeRecord.checkOutTime = checkOutTime;
    activeRecord.durationMinutes = durationMinutes;
    activeRecord.estimatedDurationMinutes = estimatedDurationMinutes;
    activeRecord.realismFactor = scoreResult.realismFactor;
    activeRecord.status = 'completed';
    activeRecord.totalCompleted = totalCompleted;
    activeRecord.sessionScore = scoreResult.sessionScore;
    await activeRecord.save();
  } else {
    activeRecord.checkOutTime = checkOutTime;
    activeRecord.durationMinutes = durationMinutes;
    activeRecord.estimatedDurationMinutes = estimatedDurationMinutes;
    activeRecord.realismFactor = scoreResult.realismFactor;
    activeRecord.status = 'completed';
    activeRecord.totalCompleted = totalCompleted;
    activeRecord.sessionScore = scoreResult.sessionScore;
    activeRecord.updatedAt = checkOutTime;
  }

  recordSyncEvent('attendance', { userId: String(userId), status: 'completed', checkOutTime });
  recordSyncEvent('workoutPlan', { memberId: String(userId) });

  return activeRecord.toObject ? activeRecord.toObject() : activeRecord;
};

export const toggleSessionExerciseService = async (userId, exerciseId) => {
  let activeRecord = await Attendance.findOne({
    userId,
    status: 'active',
  });

  if (!activeRecord) {
    const error = new Error('No active workout session found. Please check in first.');
    error.statusCode = 400;
    throw error;
  }

  const exercise = (activeRecord.exercises || []).find(
    (e) => e.exerciseId === exerciseId || (e._id && e._id.toString() === exerciseId)
  );

  if (!exercise) {
    const error = new Error('Exercise not found in current workout session.');
    error.statusCode = 404;
    throw error;
  }

  // Permanent one-way completion: cannot be undone or reversed
  exercise.isCompleted = true;
  exercise.completedAt = exercise.completedAt || new Date();

  activeRecord.totalCompleted = activeRecord.exercises.filter((e) => e.isCompleted).length;
  const totalAssigned = activeRecord.totalAssigned || activeRecord.exercises.length;

  const now = new Date();
  const checkInTime = new Date(activeRecord.checkInTime);
  const currentDurationMinutes = Math.max(0, Math.round((now.getTime() - checkInTime.getTime()) / 60000));
  const estimatedDurationMinutes = activeRecord.estimatedDurationMinutes || calculateEstimatedWorkoutDurationMinutes(activeRecord.exercises);
  const scoreResult = calculateSessionScore(activeRecord.totalCompleted, totalAssigned, currentDurationMinutes, estimatedDurationMinutes);

  activeRecord.durationMinutes = currentDurationMinutes;
  activeRecord.estimatedDurationMinutes = estimatedDurationMinutes;
  activeRecord.realismFactor = scoreResult.realismFactor;
  activeRecord.sessionScore = scoreResult.sessionScore;

  await activeRecord.save();
  return {
    attendance: activeRecord,
    activeCheckIn: activeRecord,
    exercise,
    totalCompleted: activeRecord.totalCompleted,
    totalAssigned,
    sessionScore: activeRecord.sessionScore,
    realismFactor: activeRecord.realismFactor,
    estimatedDurationMinutes,
  };
};

/**
 * Consistency Calculation Driven by Exercise Completion:
 * For each expected workout day:
 * daily session score = (completed assigned exercises / total assigned exercises) * 100
 * Example: 5 assigned exercises -> 5/5 = 100%, 4/5 = 80%, 3/5 = 60%, no workout = 0%
 * Monthly Consistency % = sum of daily session scores / expected workout days
 */
export const calculateConsistencyMetrics = ({
  expectedWorkoutDays = 5,
  sessions = [],
}) => {
  const completedSessions = (sessions || []).filter(
    (s) => s.status === 'completed' && s.checkInTime && s.checkOutTime
  );

  let totalGymMinutes = 0;
  let totalAssignedExercises = 0;
  let totalCompletedExercises = 0;

  // Track scores mapped by workout slot to fulfill missed slots via makeups
  const slotScoresMap = new Map();

  completedSessions.forEach((s) => {
    const inTime = new Date(s.checkInTime);
    const outTime = new Date(s.checkOutTime);
    const duration = Math.max(0, Math.round((outTime.getTime() - inTime.getTime()) / 60000));
    totalGymMinutes += duration;

    const assigned = s.totalAssigned || (s.exercises ? s.exercises.length : 5);
    const completed =
      s.totalCompleted !== undefined
        ? s.totalCompleted
        : (s.exercises ? s.exercises.filter((e) => e.isCompleted).length : 0);
    totalAssignedExercises += assigned;
    totalCompletedExercises += completed;

    // Daily score calculated using completion rate and realism factor
    const estimatedDuration = s.estimatedDurationMinutes || calculateEstimatedWorkoutDurationMinutes(s.exercises);
    const scoreResult = calculateSessionScore(completed, assigned, duration, estimatedDuration);
    let score = scoreResult.sessionScore;
    if (s.sessionScore !== undefined && s.realismFactor !== undefined) {
      score = s.sessionScore;
    }

    let slotKey = null;
    if (s.sessionType === 'makeup' && s.makeupForDayNumber) {
      slotKey = `day_slot_${s.makeupForDayNumber}`;
    } else if (s.scheduleDay) {
      const match = s.scheduleDay.match(/Day\s*(\d+)/i);
      if (match) {
        slotKey = `day_slot_${match[1]}`;
      }
    }
    if (!slotKey) {
      slotKey = s.dateKey || inTime.toISOString().slice(0, 10);
    }

    const current = slotScoresMap.get(slotKey);
    if (!current || score > current.score) {
      slotScoresMap.set(slotKey, {
        slotKey,
        dateKey: s.dateKey || inTime.toISOString().slice(0, 10),
        score,
        assigned,
        completed,
        duration,
        sessionType: s.sessionType || 'scheduled',
      });
    }
  });

  // Expected workout days is strictly the planned workout slots (e.g. 5, NOT 7!)
  // REST DAYS ARE NEVER IN THE DENOMINATOR!
  const expectedDays = Math.max(1, Number(expectedWorkoutDays) || 5);

  let sumDailyScores = 0;
  const dayBreakdown = [];
  for (const slot of slotScoresMap.values()) {
    sumDailyScores += slot.score;
    dayBreakdown.push(slot);
  }

  // Monthly consistency = sum of daily session scores / expectedWorkoutDays
  // Example: 5 slots completed at 100% (or 4 + 1 makeup) -> 500 / 5 = 100% (NOT 71%!)
  const consistencyPercentage = completedSessions.length > 0
    ? Math.min(100, Math.round(sumDailyScores / expectedDays))
    : 0;

  // Format Total Gym Time (e.g. 319m -> "5h 19m")
  const totalHours = Math.floor(totalGymMinutes / 60);
  const remainingMins = totalGymMinutes % 60;
  const totalGymTime = totalHours > 0 ? `${totalHours}h ${remainingMins}m` : `${remainingMins}m`;

  // Average session duration
  const sessionCount = completedSessions.length;
  const avgMinutes = sessionCount > 0 ? Math.round(totalGymMinutes / sessionCount) : 0;
  const avgHours = Math.floor(avgMinutes / 60);
  const avgRemMins = avgMinutes % 60;
  const averageSessionDuration =
    avgHours > 0 ? `${avgHours}h ${avgRemMins < 10 ? '0' : ''}${avgRemMins}m` : `${avgMinutes}m`;

  // Average exercise completion display (e.g. 3.4 / 5 average)
  const avgAssignedPerSession = sessionCount > 0 ? Math.round(totalAssignedExercises / sessionCount) : 5;
  const avgCompletedPerSession = sessionCount > 0 ? (totalCompletedExercises / sessionCount).toFixed(1) : '0';
  const exerciseCompletion = sessionCount > 0 ? `${avgCompletedPerSession} / ${avgAssignedPerSession} average` : '0 / 5';

  // Feedback message
  let feedback = '';
  if (consistencyPercentage >= 80) {
    feedback = 'Outstanding consistency! You are completing almost all planned exercises during each session.';
  } else if (consistencyPercentage >= 60) {
    feedback = 'Good consistency. Try completing more of your planned exercises during each session.';
  } else if (consistencyPercentage >= 40) {
    feedback = 'Fair start. Aim to complete all assigned exercises in each workout.';
  } else {
    feedback = 'Every workout counts. Complete more exercises during your sessions to build habits.';
  }

  return {
    consistencyPercentage,
    expectedWorkoutDays: expectedDays,
    completedWorkoutDays: slotScoresMap.size,
    completedSessionScore: Math.round((sumDailyScores / 100) * 100) / 100,
    exerciseCompletion,
    totalGymMinutes,
    totalGymTime,
    averageSessionMinutes: avgMinutes,
    averageSessionDuration,
    feedback,
    dayScores: dayBreakdown,
  };
};

export const getMemberConsistencyReport = async (userId, customParams = {}) => {
  let profile = await FitnessProfile.findOne({ userId });
  const isActive = profile?.membershipStatus === 'Active';

  const expectedDays = customParams.expectedDays
    ? Number(customParams.expectedDays)
    : profile?.plannedDaysPerWeek || 5;

  const explanationNotice =
    'Your consistency considers both completed exercises and the actual duration of your workout session. Longer sessions are not required, but extremely short sessions receive a lower session score.';

  // Feature Preview for non-active members: return clean empty state
  if (!isActive) {
    return {
      isPreview: true,
      consistencyPercentage: 0,
      expectedWorkoutDays: expectedDays,
      completedWorkoutDays: 0,
      completedSessionScore: 0,
      exerciseCompletion: '0 / 5',
      totalGymTime: '0m',
      averageSessionDuration: '0m',
      feedback: 'Your consistency report will appear here after you begin recording workouts.',
      explanationNotice,
      records: [],
      monthName: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    };
  }

  const now = new Date();
  const year = customParams.year ? Number(customParams.year) : now.getFullYear();
  const month = customParams.month !== undefined ? Number(customParams.month) : now.getMonth();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

  const startOfMonthStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const endOfMonthStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

  const monthClosures = await GymClosure.find({
    isClosed: true,
    date: { $gte: startOfMonthStr, $lte: endOfMonthStr },
  }).lean();

  // Exclude gym-wide closures from the expected workout days denominator (PART 17)
  const closureCount = monthClosures ? monthClosures.length : 0;
  const adjustedExpectedDays = Math.max(1, expectedDays - closureCount);

  let records = [];
  if (Array.isArray(customParams.sessions)) {
    records = customParams.sessions;
  } else {
    records = await Attendance.find({
      userId,
      checkInTime: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ checkInTime: -1 }).lean();
  }

  const metrics = calculateConsistencyMetrics({
    expectedWorkoutDays: adjustedExpectedDays,
    sessions: records,
  });

  return {
    ...metrics,
    originalExpectedDays: expectedDays,
    gymClosuresDeducted: closureCount,
    closures: monthClosures || [],
    explanationNotice,
    isPreview: false,
    monthName: new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    records,
  };
};

export const getMemberFullProfile = async (userId) => {
  let user = null;
  try {
    user = await User.findById(userId).select('-password');
  } catch (err) {
    // fallback
  }

  if (!user) {
    user = await findUserById(userId);
  }

  if (!user) {
    const error = new Error('Member account not found');
    error.statusCode = 404;
    throw error;
  }

  // Find or create fitness profile with default values if not present
  let profile = await FitnessProfile.findOne({ userId });
  if (!profile) {
    profile = await FitnessProfile.create({
      userId,
      age: 25,
      height: 175,
      weight: 72,
      fitnessGoal: 'muscle_gain',
      experienceLevel: 'intermediate',
      plannedDaysPerWeek: 5,
      preferredSchedule: 'morning',
      trainerRequested: false,
      wantsTrainer: false,
      membershipPlan: null,
      membershipPlanId: null,
      membershipStatus: 'Pending',
      membershipStartDate: null,
      membershipExpiry: null,
    });
  }

  // Synchronize membership expiry against current date
  const now = new Date();
  let currentStatus = profile.membershipStatus || 'Pending';
  if (profile.membershipExpiry && new Date(profile.membershipExpiry) <= now) {
    if (currentStatus === 'Active') {
      profile.membershipStatus = 'Expired';
      await profile.save();
      currentStatus = 'Expired';
    }
  }

  // Ensure accumulatedDurationMonths is set and accurate
  let accumulatedMonths = profile.accumulatedDurationMonths || 0;
  if (accumulatedMonths <= 0 && currentStatus === 'Active') {
    const payments = await MembershipPayment.find({ userId: user._id, paymentStatus: 'Completed' });
    if (payments.length > 0) {
      accumulatedMonths = payments.reduce((acc, p) => acc + (p.durationMonths || 0), 0);
    } else if (profile.membershipPlan) {
      const match = profile.membershipPlan.match(/\d+/);
      accumulatedMonths = match ? parseInt(match[0], 10) : 12;
    } else {
      accumulatedMonths = 12;
    }
    profile.accumulatedDurationMonths = accumulatedMonths;
    if (!profile.membershipStartDate) {
      profile.membershipStartDate = user.createdAt;
    }
    await profile.save();
  }

  const isTrainerWanted = Boolean(profile.trainerRequested ?? profile.wantsTrainer ?? false);

  let trainerInfo = null;
  if (profile.trainerId) {
    const tr = await User.findById(profile.trainerId).select('fullName email specialization phone role');
    if (tr && tr.role === 'trainer') {
      trainerInfo = {
        id: tr._id.toString(),
        _id: tr._id.toString(),
        fullName: tr.fullName,
        email: tr.email,
        phone: tr.phone || '',
        specialization: tr.specialization || 'General Fitness & Conditioning',
      };
    } else {
      // If trainer was deleted or changed role, clean up reference
      profile.trainerId = null;
      profile.trainerRequested = false;
      profile.wantsTrainer = false;
      await profile.save();
    }
  }

  // Ensure activeWorkoutSource consistency: if no trainer, cannot be 'trainer'
  if (!profile.trainerId && profile.activeWorkoutSource === 'trainer') {
    profile.activeWorkoutSource = profile.previousPersonalSource === 'custom' ? 'custom' : 'recommended';
    await profile.save();
  } else if (profile.trainerId && profile.activeWorkoutSource !== 'trainer') {
    profile.activeWorkoutSource = 'trainer';
    await profile.save();
  }

  return {
    account: {
      id: user._id || user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      memberSince: user.createdAt,
    },
    membership: {
      plan: profile.membershipPlan || 'None',
      planId: profile.membershipPlanId || null,
      status: currentStatus,
      startDate: profile.membershipStartDate || user.createdAt,
      expiryDate: profile.membershipExpiry || null,
      accumulatedDurationMonths: profile.accumulatedDurationMonths || (currentStatus === 'Active' ? 12 : 0),
    },
    fitness: {
      age: profile.age !== undefined && profile.age !== null ? profile.age : 25,
      height: profile.height !== undefined && profile.height !== null ? profile.height : 175,
      weight: profile.weight !== undefined && profile.weight !== null ? profile.weight : 72,
      fitnessGoal: profile.fitnessGoal || 'muscle_gain',
      experienceLevel: profile.currentLevel || profile.experienceLevel || profile.initialLevel || 'beginner',
      currentLevel: profile.currentLevel || profile.experienceLevel || profile.initialLevel || 'beginner',
      initialLevel: profile.initialLevel || 'beginner',
      levelSince: profile.levelSince || user.createdAt,
      promotionHistory: profile.promotionHistory || [],
      plannedDaysPerWeek: profile.plannedDaysPerWeek || 5,
      preferredSchedule: profile.preferredSchedule || 'morning',
      activeWorkoutSource: profile.trainerId ? 'trainer' : (profile.activeWorkoutSource === 'custom' ? 'custom' : 'recommended'),
      trainerRequested: isTrainerWanted,
      wantsTrainer: isTrainerWanted,
      trainerId: profile.trainerId ? profile.trainerId.toString() : null,
      trainer: trainerInfo,
    },
  };
};

export const updateMemberFullProfile = async (userId, data) => {
  let user = null;
  try {
    user = await User.findById(userId);
  } catch (err) {
    // fallback
  }
  if (!user) {
    user = await findUserById(userId);
  }

  // Update user basic info
  if (user) {
    if (data.fullName && typeof data.fullName === 'string' && data.fullName.trim()) {
      user.fullName = data.fullName.trim();
    }
    if (data.phone && typeof data.phone === 'string' && data.phone.trim()) {
      if (!/^\d{10}$/.test(data.phone.trim())) {
        const error = new Error('Phone number must be exactly 10 digits (numbers only)');
        error.statusCode = 400;
        throw error;
      }
      user.phone = data.phone.trim();
    }
    await user.save();
  }

  // Update fitness profile
  let profile = await FitnessProfile.findOne({ userId });
  if (!profile) {
    profile = await FitnessProfile.create({ userId });
  }

  if (data.age !== undefined && data.age !== null) {
    const ageNum = Number(data.age);
    if (!isNaN(ageNum) && ageNum >= 14 && ageNum <= 100) {
      profile.age = ageNum;
    }
  }

  if (data.height !== undefined && data.height !== null) {
    const hNum = Number(data.height);
    if (!isNaN(hNum) && hNum >= 50 && hNum <= 260) {
      profile.height = hNum;
    }
  }

  if (data.weight !== undefined && data.weight !== null) {
    const wNum = Number(data.weight);
    if (!isNaN(wNum) && wNum >= 30 && wNum <= 300) {
      profile.weight = wNum;
    }
  }

  if (data.fitnessGoal && ['muscle_gain', 'fat_loss', 'strength', 'general_fitness', 'endurance'].includes(data.fitnessGoal)) {
    profile.fitnessGoal = data.fitnessGoal;
  }

  if (data.experienceLevel && ['beginner', 'intermediate', 'advanced'].includes(data.experienceLevel)) {
    profile.experienceLevel = data.experienceLevel;
  }

  if (data.plannedDaysPerWeek !== undefined && data.plannedDaysPerWeek !== null) {
    const pDays = Number(data.plannedDaysPerWeek);
    if (!isNaN(pDays) && pDays >= 1 && pDays <= 7) {
      profile.plannedDaysPerWeek = pDays;
    }
  }

  if (data.preferredSchedule && typeof data.preferredSchedule === 'string') {
    profile.preferredSchedule = data.preferredSchedule;
  }

  if (data.trainerId !== undefined) {
    if (data.trainerId) {
      const tr = await User.findOne({ _id: data.trainerId, role: 'trainer' });
      if (tr) {
        profile.trainerId = tr._id;
        profile.trainerRequested = true;
        profile.wantsTrainer = true;
      }
    } else {
      profile.trainerId = null;
      profile.trainerRequested = false;
      profile.wantsTrainer = false;
    }
  } else if (data.trainerRequested !== undefined || data.wantsTrainer !== undefined) {
    const reqFlag = data.trainerRequested !== undefined ? Boolean(data.trainerRequested) : Boolean(data.wantsTrainer);
    profile.trainerRequested = reqFlag;
    profile.wantsTrainer = reqFlag;
    if (!reqFlag) {
      profile.trainerId = null;
    }
  }

  await profile.save();

  // Keep recommended workout plan in sync if fitnessGoal or plannedDaysPerWeek changed
  if (data.fitnessGoal || (data.plannedDaysPerWeek !== undefined && data.plannedDaysPerWeek !== null)) {
    const currentLevel = (profile.currentLevel || profile.experienceLevel || profile.initialLevel || 'beginner').toLowerCase();
    const userDoc = await User.findById(userId).select('createdAt').lean();
    const joinDate = profile?.membershipStartDate || userDoc?.createdAt || profile?.createdAt || new Date();
    const dObj = new Date(joinDate);
    const joinDayIndex = !isNaN(dObj.getTime()) ? (dObj.getDay() === 0 ? 6 : dObj.getDay() - 1) : 0;

    const generated = generateRuleBasedPlan({
      fitnessGoal: profile.fitnessGoal,
      experienceLevel: currentLevel,
      plannedDaysPerWeek: profile.plannedDaysPerWeek || 5,
      joinDayIndex,
    });

    let recPlan = await WorkoutPlan.findOne({ userId, planType: 'recommended' });
    if (recPlan) {
      recPlan.name = generated.name;
      recPlan.goal = generated.goal;
      recPlan.experienceLevel = currentLevel;
      recPlan.daysPerWeek = generated.daysPerWeek;
      recPlan.days = generated.days;
      recPlan.weekSchedule = generated.weekSchedule;
      recPlan.isActive = true;
      await recPlan.save();
    }
  }

  return await getMemberFullProfile(userId);
};

export const getAvailableTrainersService = async () => {
  // Sort by email ascending: trainer1 (Rahul), trainer2 (Priya), trainer3 (Arjun)
  const trainers = await User.find({ role: 'trainer' })
    .select('_id fullName email phone specialization')
    .sort({ email: 1 })
    .lean();

  return trainers.map((t) => ({
    id: t._id.toString(),
    _id: t._id.toString(),
    fullName: t.fullName,
    email: t.email,
    phone: t.phone || '',
    specialization: t.specialization || 'General Fitness & Conditioning',
  }));
};

export const updateTrainerPreferenceService = async (userId, data, userRole = 'member') => {
  // Validate role = member
  if (userRole && userRole !== 'member') {
    const error = new Error('Only members can select or update personal trainer preferences.');
    error.statusCode = 403;
    throw error;
  }

  let profile = await FitnessProfile.findOne({ userId });
  if (!profile) {
    profile = await FitnessProfile.create({ userId });
  }

  let wantsTrainer = false;
  let trainerId = null;

  if (typeof data === 'boolean') {
    wantsTrainer = data;
    if (wantsTrainer && profile.trainerId) {
      trainerId = profile.trainerId.toString();
    } else if (wantsTrainer) {
      const firstTrainer = await User.findOne({ role: 'trainer' }).sort({ email: 1 });
      if (firstTrainer) trainerId = firstTrainer._id.toString();
    }
  } else if (typeof data === 'object' && data !== null) {
    if (data.trainerId !== undefined) {
      if (data.trainerId && typeof data.trainerId === 'string' && data.trainerId.trim() !== '') {
        trainerId = data.trainerId.trim();
        wantsTrainer = true;
      } else {
        trainerId = null;
        wantsTrainer = false;
      }
    } else {
      wantsTrainer = Boolean(data.wantsTrainer ?? data.trainerRequested ?? false);
      if (wantsTrainer && profile.trainerId) {
        trainerId = profile.trainerId.toString();
      } else if (wantsTrainer) {
        const firstTrainer = await User.findOne({ role: 'trainer' }).sort({ email: 1 });
        if (firstTrainer) trainerId = firstTrainer._id.toString();
      }
    }
  }

  // Handle "No Trainer" (mutually exclusive with any trainer selection)
  if (!wantsTrainer || !trainerId) {
    profile.trainerRequested = false;
    profile.wantsTrainer = false;
    profile.trainerId = null;

    const restoredSource = profile.previousPersonalSource === 'custom' ? 'custom' : 'recommended';
    profile.activeWorkoutSource = restoredSource;

    // Restore personal plannedDaysPerWeek if member personal plan exists
    const restoredPlan = await WorkoutPlan.findOne({ userId, planType: restoredSource });
    if (restoredPlan && restoredPlan.days && restoredPlan.days.length > 0) {
      profile.plannedDaysPerWeek = restoredPlan.daysPerWeek || restoredPlan.days.length;
    }

    // Deactivate trainer plans
    await WorkoutPlan.updateMany(
      { userId, planType: 'trainer' },
      { $set: { isActive: false } }
    );

    // Reactivate restored personal plan
    await WorkoutPlan.updateOne(
      { userId, planType: restoredSource },
      { $set: { isActive: true } }
    );

    await profile.save();
    return {
      trainerRequested: false,
      wantsTrainer: false,
      trainerId: null,
      trainer: null,
      activeWorkoutSource: restoredSource,
    };
  }

  // Validate trainer exists in MongoDB with role 'trainer'
  let trainer = null;
  try {
    trainer = await User.findOne({ _id: trainerId, role: 'trainer' });
  } catch (err) {
    const error = new Error('Invalid trainer ID provided.');
    error.statusCode = 400;
    throw error;
  }

  if (!trainer) {
    const error = new Error('Selected trainer does not exist or is not an active trainer.');
    error.statusCode = 400;
    throw error;
  }

  // Preserve previous personal source if currently personal
  if (profile.activeWorkoutSource === 'recommended' || profile.activeWorkoutSource === 'custom') {
    profile.previousPersonalSource = profile.activeWorkoutSource;
  }

  // Save selected trainer preference to database
  profile.trainerRequested = true;
  profile.wantsTrainer = true;
  profile.trainerId = trainer._id;
  profile.activeWorkoutSource = 'trainer';

  // Deactivate existing personal plans and any other trainers' plans
  await WorkoutPlan.updateMany(
    { userId },
    { $set: { isActive: false } }
  );

  // Check if a trainer-assigned plan already exists for this member with this trainer
  let memberTrainerPlan = await WorkoutPlan.findOne({
    userId,
    trainerId: trainer._id,
    planType: 'trainer',
  });

  if (memberTrainerPlan) {
    memberTrainerPlan.isActive = true;
    await memberTrainerPlan.save();
    profile.plannedDaysPerWeek = memberTrainerPlan.days?.length || profile.plannedDaysPerWeek || 5;
  }

  await profile.save();

  return {
    trainerRequested: true,
    wantsTrainer: true,
    trainerId: trainer._id.toString(),
    activeWorkoutSource: 'trainer',
    trainer: {
      id: trainer._id.toString(),
      _id: trainer._id.toString(),
      fullName: trainer.fullName,
      email: trainer.email,
      phone: trainer.phone || '',
      specialization: trainer.specialization || 'General Fitness & Conditioning',
    },
    plan: memberTrainerPlan || null,
  };
};

export const getActivePlansService = async () => {
  return await MembershipPlan.find({ isActive: true }).sort({ durationMonths: 1, price: 1 }).lean();
};

export const simulatePaymentService = async (userId, data) => {
  const { planId } = data;
  if (!planId) {
    const error = new Error('A valid Membership Plan ID is required.');
    error.statusCode = 400;
    throw error;
  }

  // Fetch plan from MongoDB - do NOT trust frontend price
  const plan = await MembershipPlan.findById(planId);
  if (!plan || !plan.isActive) {
    const error = new Error('Selected membership plan is inactive or no longer available.');
    error.statusCode = 400;
    throw error;
  }

  let profile = await FitnessProfile.findOne({ userId });
  if (!profile) {
    profile = await FitnessProfile.create({ userId });
  }

  const now = new Date();
  let startDate = now;
  let newExpiry;
  let accumulatedDurationMonths = 0;

  // Extension rule: If currently Active and expiry is strictly in the future
  const isCurrentlyActive =
    profile.membershipStatus === 'Active' &&
    profile.membershipExpiry &&
    new Date(profile.membershipExpiry) > now;

  if (isCurrentlyActive) {
    // Keep historical start date
    startDate = profile.membershipStartDate || now;
    // Extend consecutively from existing expiry
    newExpiry = new Date(profile.membershipExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + plan.durationMonths);

    // Accumulate duration:
    let prevAccumulated = profile.accumulatedDurationMonths || 0;
    if (prevAccumulated <= 0) {
      if (profile.membershipPlan) {
        const match = profile.membershipPlan.match(/\d+/);
        prevAccumulated = match ? parseInt(match[0], 10) : 12;
      } else {
        prevAccumulated = 12;
      }
    }
    accumulatedDurationMonths = prevAccumulated + plan.durationMonths;

    // Retain initial plan tier if present, or set to current
    if (!profile.membershipPlan) {
      profile.membershipPlan = plan.name;
    }
  } else {
    // Expired or new membership: start cycle from current date
    startDate = now;
    newExpiry = new Date(now);
    newExpiry.setMonth(newExpiry.getMonth() + plan.durationMonths);
    accumulatedDurationMonths = plan.durationMonths;
    profile.membershipPlan = plan.name;
  }

  profile.membershipPlanId = plan._id;
  profile.membershipStatus = 'Active';
  profile.membershipStartDate = startDate;
  profile.membershipExpiry = newExpiry;
  profile.accumulatedDurationMonths = accumulatedDurationMonths;
  await profile.save();

  // Create payment record in MongoDB
  const payment = await MembershipPayment.create({
    userId,
    planId: plan._id,
    planName: plan.name,
    durationMonths: plan.durationMonths,
    amount: plan.price,
    paymentStatus: 'Completed',
    paymentDate: now,
    startDate,
    expiryDate: newExpiry,
  });

  return {
    membershipPlan: profile.membershipPlan,
    membershipPlanId: profile.membershipPlanId,
    membershipStatus: profile.membershipStatus,
    status: profile.membershipStatus,
    membershipStartDate: profile.membershipStartDate,
    startDate: profile.membershipStartDate,
    membershipExpiry: profile.membershipExpiry,
    expiryDate: profile.membershipExpiry,
    accumulatedDurationMonths: profile.accumulatedDurationMonths,
    amountPaid: plan.price,
    paymentId: payment._id,
  };
};

export const createMemberCustomWorkoutPlan = async (userId, planData) => {
  const { name, daysPerWeek, days } = planData;
  const count = daysPerWeek || (days ? days.length : 5);

  const formattedDays = (days || []).map((day, dIdx) => ({
    dayNumber: Number(day.dayNumber) || dIdx + 1,
    dayName: day.dayName || `Day ${dIdx + 1}`,
    focus: day.focus || 'Workout',
    isCompleted: Boolean(day.isCompleted),
    exercises: (day.exercises || []).map((ex) => ({
      ...ex,
      imageUrl: ex.imageUrl || getExerciseImageUrl(ex.exerciseName),
    })),
  }));

  const weekSchedule = buildWeeklySchedule(count, formattedDays);

  let plan = await WorkoutPlan.findOne({ userId, planType: 'custom' });
  if (plan) {
    plan.name = name || 'My Custom Plan';
    plan.goal = 'custom';
    plan.experienceLevel = 'custom';
    plan.daysPerWeek = count;
    plan.days = formattedDays;
    plan.weekSchedule = weekSchedule;
    plan.isCustom = true;
    plan.planType = 'custom';
    plan.assignedBy = null;
    await plan.save();
  } else {
    plan = await WorkoutPlan.create({
      userId,
      name: name || 'My Custom Plan',
      goal: 'custom',
      experienceLevel: 'custom',
      daysPerWeek: count,
      days: formattedDays,
      weekSchedule,
      isCustom: true,
      planType: 'custom',
    });
  }

  // Update profile activeWorkoutSource to custom
  let profile = await FitnessProfile.findOne({ userId });
  if (profile) {
    profile.activeWorkoutSource = 'custom';
    await profile.save();
  }

  return { plan };
};
