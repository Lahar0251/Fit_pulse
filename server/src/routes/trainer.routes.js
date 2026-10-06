import express from 'express';
import {
  getMembers,
  getMemberDetails,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  assignPlan,
} from '../controllers/trainer.controller.js';
import { protect, requireTrainer } from '../middleware/auth.middleware.js';

const router = express.Router();

// All trainer endpoints require authentication and trainer role
router.use(protect);
router.use(requireTrainer);

// Member selection & fitness profile viewing
router.get('/members', getMembers);
router.get('/members/:memberId/profile', getMemberDetails);

// Plan CRUD
router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.put('/plans/:planId', updatePlan);
router.delete('/plans/:planId', deletePlan);

// Plan assignment
router.post('/members/:memberId/assign-plan', assignPlan);

export default router;
