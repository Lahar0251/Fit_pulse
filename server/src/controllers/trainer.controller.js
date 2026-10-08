import {
  getAssignedMembers as fetchAssignedMembers,
  getMemberDetailsForTrainer as fetchMemberDetails,
  getTrainerPlans as fetchTrainerPlans,
  createTrainerPlan as saveTrainerPlan,
  getTrainerPlanById as fetchTrainerPlanById,
  updateTrainerPlan as modifyTrainerPlan,
  deleteTrainerPlan as removeTrainerPlan,
  assignPlanToMember as assignWorkoutPlan,
  updateMemberAssignedPlan as modifyMemberAssignedPlan,
} from '../services/trainer.service.js';
import { recordSyncEvent } from '../services/sync.service.js';

export const getAssignedMembers = async (req, res, next) => {
  try {
    const members = await fetchAssignedMembers(req.user.id);
    return res.status(200).json({
      status: 'success',
      count: members.length,
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

export const getMemberDetails = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const details = await fetchMemberDetails(req.user.id, memberId);
    return res.status(200).json({
      status: 'success',
      data: details,
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

export const getTrainerPlans = async (req, res, next) => {
  try {
    const plans = await fetchTrainerPlans(req.user.id);
    return res.status(200).json({
      status: 'success',
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

export const createTrainerPlan = async (req, res, next) => {
  try {
    const plan = await saveTrainerPlan(req.user.id, req.body);
    return res.status(201).json({
      status: 'success',
      message: 'Workout plan created successfully',
      data: plan,
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

export const getTrainerPlanById = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const plan = await fetchTrainerPlanById(req.user.id, planId);
    return res.status(200).json({
      status: 'success',
      data: plan,
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

export const updateTrainerPlan = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const plan = await modifyTrainerPlan(req.user.id, planId, req.body);
    return res.status(200).json({
      status: 'success',
      message: 'Workout plan updated successfully',
      data: plan,
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

export const deleteTrainerPlan = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const result = await removeTrainerPlan(req.user.id, planId);
    return res.status(200).json({
      status: 'success',
      message: result.message,
      data: { id: planId },
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

export const assignPlanToMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const assignedPlan = await assignWorkoutPlan(req.user.id, memberId, req.body);
    recordSyncEvent(
      'workoutPlan',
      { memberId, trainerId: req.user.id },
      req.headers['x-tab-session-id']
    );
    return res.status(200).json({
      status: 'success',
      message: 'Workout plan successfully assigned to member',
      data: assignedPlan,
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

export const updateMemberAssignedPlan = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const updatedPlan = await modifyMemberAssignedPlan(req.user.id, memberId, req.body);
    recordSyncEvent(
      'workoutPlan',
      { memberId, trainerId: req.user.id },
      req.headers['x-tab-session-id']
    );
    return res.status(200).json({
      status: 'success',
      message: 'Member workout plan updated successfully',
      data: updatedPlan,
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

