import express from 'express';
import {
  getDashboard,
  getWorkoutPlan,
  updateFitnessProfile,
  generateWorkoutPlan,
  toggleDayCompletion,
  getAttendanceHistory,
  getCurrentSession,
  checkIn,
  checkOut,
  toggleActiveSessionExercise,
  getConsistencyReport,
  getMemberProfile,
  updateMemberProfile,
  simulateMembershipPayment,
  createCustomWorkoutPlan,
  getActiveMembershipPlans,
  updateTrainerPreference,
  getFitnessLevel,
  checkFitnessLevelPromotion,
  updateActiveWorkoutSource,
  getAvailableTrainers,
  updateWeeklySchedule,
} from '../controllers/member.controller.js';
import { protect, restrictTo, requireActiveMembership } from '../middleware/auth.middleware.js';
import { getTodayGymStatus } from '../services/schedule.service.js';

import FitnessProfile from '../models/fitnessProfile.model.js';
import WorkoutPlan from '../models/workoutPlan.model.js';

const router = express.Router();

router.use(protect);

router.get('/db-inspect', async (req, res) => {
  const profile = await FitnessProfile.findOne({ userId: req.user.id }).lean();
  const plans = await WorkoutPlan.find({ userId: req.user.id }).lean();
  return res.status(200).json({ status: 'success', data: { profile, plans } });
});

// Live Gym Operating Status in Asia/Kolkata
router.get('/gym-status', async (req, res, next) => {
  try {
    const queryDate = req.query.date ? new Date(req.query.date) : new Date();
    const status = await getTodayGymStatus(queryDate);
    return res.status(200).json({
      status: 'success',
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

// Fitness Level Progression routes
router.get('/fitness-level', getFitnessLevel);
router.post('/fitness-level/check-promotion', checkFitnessLevelPromotion);

// Member Dashboard summary
router.get('/dashboard', getDashboard);

// Member Profile & Trainer Support routes
router.get('/profile', getMemberProfile);
router.put('/profile', updateMemberProfile);
router.get('/trainers', getAvailableTrainers);
router.patch('/trainer-preference', restrictTo('member'), updateTrainerPreference);
router.put('/trainer-preference', restrictTo('member'), updateTrainerPreference);

// Membership Routes
router.get('/membership/plans', getActiveMembershipPlans);
router.post('/membership/pay', simulateMembershipPayment);

// Member Consistency Report route (GET is readable for Feature Preview mode)
router.get('/consistency', getConsistencyReport);

// Member Attendance routes (GET is readable for Feature Preview mode, actions are protected)
router.get('/attendance', getAttendanceHistory);
router.get('/attendance/current-session', getCurrentSession);
router.post('/attendance/check-in', requireActiveMembership, checkIn);
router.post('/attendance/check-out', requireActiveMembership, checkOut);
router.patch('/attendance/active/exercise/:exerciseId/toggle', requireActiveMembership, toggleActiveSessionExercise);

// Member Workout Plan routes (GET is readable for Feature Preview mode, actions are protected)
router.get('/workout-plan', getWorkoutPlan);
router.put('/weekly-schedule', requireActiveMembership, updateWeeklySchedule);
router.patch('/workout-source', updateActiveWorkoutSource);
router.post('/workout-plan', requireActiveMembership, createCustomWorkoutPlan);
router.post('/workout-plan/generate', generateWorkoutPlan);
router.patch('/workout-plan/day/:dayNumber/toggle-complete', requireActiveMembership, toggleDayCompletion);
router.put('/fitness-profile', updateFitnessProfile);

export default router;
