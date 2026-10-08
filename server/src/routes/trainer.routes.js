import express from 'express';
import {
  getAssignedMembers,
  getMemberDetails,
  getTrainerPlans,
  createTrainerPlan,
  getTrainerPlanById,
  updateTrainerPlan,
  deleteTrainerPlan,
  assignPlanToMember,
  updateMemberAssignedPlan,
} from '../controllers/trainer.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { getTodayGymStatus } from '../services/schedule.service.js';

const router = express.Router();

// Role-based protection: only authenticated users with role 'trainer' or 'admin' can access
router.use(protect);
router.use(restrictTo('trainer', 'admin'));

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

// Assigned members list
router.get('/members', getAssignedMembers);

// Trainee details with workout plan
router.get('/members/:memberId', getMemberDetails);

// Assign a plan to a member
router.post('/members/:memberId/assign-plan', assignPlanToMember);

// Direct update of member's assigned workout plan
router.put('/members/:memberId/workout-plan', updateMemberAssignedPlan);

// Workout Plans CRUD for trainer library
router.get('/plans', getTrainerPlans);
router.post('/plans', createTrainerPlan);
router.get('/plans/:planId', getTrainerPlanById);
router.put('/plans/:planId', updateTrainerPlan);
router.delete('/plans/:planId', deleteTrainerPlan);

export default router;

