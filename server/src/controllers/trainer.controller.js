import {
  getAssignedMembers,
  getMemberProfile,
  getTrainerPlans,
  createWorkoutPlan,
  updateWorkoutPlan,
  deleteWorkoutPlan,
  assignPlanToMember,
} from '../services/trainer.service.js';

export const getMembers = async (req, res, next) => {
  try {
    const data = await getAssignedMembers(req.user.id);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getMemberDetails = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const data = await getMemberProfile(memberId);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getPlans = async (req, res, next) => {
  try {
    const data = await getTrainerPlans(req.user.id);
    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (req, res, next) => {
  try {
    const data = await createWorkoutPlan(req.user.id, req.body);
    return res.status(201).json({
      status: 'success',
      message: 'Workout plan created successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const data = await updateWorkoutPlan(req.user.id, planId, req.body);
    return res.status(200).json({
      status: 'success',
      message: 'Workout plan updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePlan = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const data = await deleteWorkoutPlan(req.user.id, planId);
    return res.status(200).json({
      status: 'success',
      message: 'Workout plan deleted successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const assignPlan = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({
        status: 'error',
        message: 'Plan ID is required to assign',
      });
    }

    const data = await assignPlanToMember(req.user.id, memberId, planId);
    return res.status(200).json({
      status: 'success',
      message: 'Workout plan successfully assigned to member',
      data,
    });
  } catch (error) {
    next(error);
  }
};
