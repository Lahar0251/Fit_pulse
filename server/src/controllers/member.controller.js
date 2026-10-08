import {
  getMemberDashboardData,
  getMemberWorkoutPlan,
  updateMemberFitnessProfile,
  regenerateMemberWorkoutPlan,
  toggleWorkoutDayCompletion,
  getMemberAttendance,
  getCurrentSessionService,
  memberCheckIn,
  memberCheckOut,
  getMemberConsistencyReport,
  getMemberFullProfile,
  updateMemberFullProfile,
  simulatePaymentService,
  createMemberCustomWorkoutPlan,
  getActivePlansService,
  updateTrainerPreferenceService,
  toggleSessionExerciseService,
  syncMemberFitnessLevel,
  updateActiveWorkoutSourceService,
  getAvailableTrainersService,
  updateMemberWeeklyScheduleService,
} from '../services/member.service.js';
import { recordSyncEvent } from '../services/sync.service.js';

export const getDashboard = async (req, res, next) => {
  try {
    const data = await getMemberDashboardData(req.user.id);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkoutPlan = async (req, res, next) => {
  try {
    const data = await getMemberWorkoutPlan(req.user.id);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFitnessProfile = async (req, res, next) => {
  try {
    const { fitnessGoal, experienceLevel, plannedDaysPerWeek, plannedWorkoutDays, preferredSchedule } = req.body;
    const days = plannedDaysPerWeek !== undefined ? plannedDaysPerWeek : plannedWorkoutDays;
    const data = await updateMemberFitnessProfile(req.user.id, {
      fitnessGoal,
      experienceLevel,
      plannedDaysPerWeek: days,
      preferredSchedule,
    });
    recordSyncEvent('workoutPlan', { memberId: req.user.id }, req.headers['x-tab-session-id']);
    return res.status(200).json({
      status: 'success',
      message: 'Fitness profile and workout plan updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const generateWorkoutPlan = async (req, res, next) => {
  try {
    const { fitnessGoal, experienceLevel, plannedDaysPerWeek, plannedWorkoutDays } = req.body;
    const days = plannedDaysPerWeek !== undefined ? plannedDaysPerWeek : plannedWorkoutDays;
    const data = await regenerateMemberWorkoutPlan(req.user.id, {
      fitnessGoal,
      experienceLevel,
      plannedDaysPerWeek: days,
    });
    recordSyncEvent('workoutPlan', { memberId: req.user.id }, req.headers['x-tab-session-id']);
    return res.status(200).json({
      status: 'success',
      message: 'Workout plan regenerated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleDayCompletion = async (req, res, next) => {
  try {
    const { dayNumber } = req.params;
    const data = await toggleWorkoutDayCompletion(req.user.id, dayNumber, req.body?.planId);
    return res.status(200).json({
      status: 'success',
      message: `Workout Day ${dayNumber} marked as completed`,
      data,
    });
  } catch (error) {
    if (error.statusCode || error.status) {
      return res.status(error.statusCode || error.status).json({
        status: 'error',
        code: error.code,
        message: error.message,
      });
    }
    next(error);
  }
};

export const getAttendanceHistory = async (req, res, next) => {
  try {
    const data = await getMemberAttendance(req.user.id);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentSession = async (req, res, next) => {
  try {
    const data = await getCurrentSessionService(req.user.id);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const checkIn = async (req, res, next) => {
  try {
    const record = await memberCheckIn(req.user.id, req.body);
    recordSyncEvent('attendance', { userId: req.user.id, status: 'active' }, req.headers['x-tab-session-id']);
    recordSyncEvent('workoutPlan', { memberId: req.user.id }, req.headers['x-tab-session-id']);
    return res.status(201).json({
      status: 'success',
      message: 'Checked in successfully',
      data: record,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
      });
    }
    next(error);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    const record = await memberCheckOut(req.user.id);
    recordSyncEvent('attendance', { userId: req.user.id, status: 'completed' }, req.headers['x-tab-session-id']);
    recordSyncEvent('workoutPlan', { memberId: req.user.id }, req.headers['x-tab-session-id']);
    return res.status(200).json({
      status: 'success',
      message: 'Checked out successfully',
      data: record,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
      });
    }
    next(error);
  }
};

export const toggleActiveSessionExercise = async (req, res, next) => {
  try {
    const data = await toggleSessionExerciseService(req.user.id, req.params.exerciseId);
    return res.status(200).json({
      status: 'success',
      message: 'Exercise status toggled',
      data,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
      });
    }
    next(error);
  }
};

export const getConsistencyReport = async (req, res, next) => {
  try {
    const data = await getMemberConsistencyReport(req.user.id, req.query);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getMemberProfile = async (req, res, next) => {
  try {
    const data = await getMemberFullProfile(req.user.id);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMemberProfile = async (req, res, next) => {
  try {
    const data = await updateMemberFullProfile(req.user.id, req.body);
    recordSyncEvent('userData', { userId: req.user.id }, req.headers['x-tab-session-id']);
    return res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const simulateMembershipPayment = async (req, res, next) => {
  try {
    const data = await simulatePaymentService(req.user.id, req.body);
    recordSyncEvent('userMembership', { targetUserId: req.user.id }, req.headers['x-tab-session-id']);
    return res.status(200).json({
      status: 'success',
      message: 'Payment simulated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomWorkoutPlan = async (req, res, next) => {
  try {
    const data = await createMemberCustomWorkoutPlan(req.user.id, req.body);
    recordSyncEvent('workoutPlan', { memberId: req.user.id }, req.headers['x-tab-session-id']);
    return res.status(201).json({
      status: 'success',
      message: 'Custom workout plan created successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveMembershipPlans = async (req, res, next) => {
  try {
    const plans = await getActivePlansService();
    return res.status(200).json({
      status: 'success',
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

export const getAvailableTrainers = async (req, res, next) => {
  try {
    const data = await getAvailableTrainersService();
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTrainerPreference = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'member') {
      return res.status(403).json({
        status: 'error',
        message: 'Only members can select or update personal trainer preferences.',
      });
    }
    const data = await updateTrainerPreferenceService(req.user.id, req.body, req.user.role);
    recordSyncEvent(
      'trainerAssignment',
      {
        memberId: req.user.id,
        trainerId: req.body?.trainerId || null,
      },
      req.headers['x-tab-session-id']
    );
    return res.status(200).json({
      status: 'success',
      message: 'Trainer preference updated successfully',
      data,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
      });
    }
    next(error);
  }
};

export const updateWeeklySchedule = async (req, res, next) => {
  try {
    const { weekSchedule } = req.body;
    const data = await updateMemberWeeklyScheduleService(req.user.id, weekSchedule);
    recordSyncEvent('workoutPlan', { memberId: req.user.id }, req.headers['x-tab-session-id']);
    return res.status(200).json({
      status: 'success',
      message: 'Weekly routine schedule saved successfully',
      data,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
      });
    }
    next(error);
  }
};

export const getFitnessLevel = async (req, res, next) => {
  try {
    const data = await syncMemberFitnessLevel(req.user.id);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const checkFitnessLevelPromotion = async (req, res, next) => {
  try {
    const { monthlyScores } = req.body;
    const data = await syncMemberFitnessLevel(req.user.id, monthlyScores);
    return res.status(200).json({
      status: 'success',
      message: data.promoted ? `Promoted to ${data.currentLevel}!` : 'Fitness level evaluated',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const updateActiveWorkoutSource = async (req, res, next) => {
  try {
    const { activeWorkoutSource } = req.body;
    const data = await updateActiveWorkoutSourceService(req.user.id, activeWorkoutSource);
    recordSyncEvent('workoutPlan', { memberId: req.user.id }, req.headers['x-tab-session-id']);
    return res.status(200).json({
      status: 'success',
      message: 'Active workout source updated successfully',
      data,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message,
      });
    }
    next(error);
  }
};

