import User from '../models/user.model.js';
import FitnessProfile from '../models/fitnessProfile.model.js';
import WorkoutPlan from '../models/workoutPlan.model.js';

/**
 * Get all members assigned to the trainer
 * If none explicitly assigned yet, fallback to all members for smooth usability
 */
export const getAssignedMembers = async (trainerId) => {
  let members = await User.find({ role: 'member', assignedTrainer: trainerId })
    .select('-password')
    .lean();

  if (!members || members.length === 0) {
    // Fallback: fetch all members
    members = await User.find({ role: 'member' }).select('-password').lean();
  }

  // Populate fitness profiles and active workout plans for each member
  const memberDetails = await Promise.all(
    members.map(async (m) => {
      const [profile, activePlan] = await Promise.all([
        FitnessProfile.findOne({ userId: m._id }).lean(),
        WorkoutPlan.findOne({ userId: m._id, isActive: true })
          .populate('assignedBy', 'fullName email')
          .lean(),
      ]);

      return {
        ...m,
        fitnessProfile: profile || {
          fitnessGoal: 'muscle_gain',
          experienceLevel: 'intermediate',
          plannedDaysPerWeek: 5,
          preferredSchedule: 'morning',
        },
        activePlan: activePlan || null,
      };
    })
  );

  return memberDetails;
};

/**
 * Get detailed profile and workout status for a specific member
 */
export const getMemberProfile = async (memberId) => {
  const member = await User.findById(memberId).select('-password').lean();
  if (!member) {
    throw new Error('Member not found');
  }

  const [profile, activePlan] = await Promise.all([
    FitnessProfile.findOne({ userId: memberId }).lean(),
    WorkoutPlan.findOne({ userId: memberId, isActive: true })
      .populate('assignedBy', 'fullName email')
      .lean(),
  ]);

  return {
    member,
    profile: profile || null,
    activePlan: activePlan || null,
  };
};

/**
 * Get workout plans created by this trainer or templates
 */
export const getTrainerPlans = async (trainerId) => {
  const plans = await WorkoutPlan.find({
    $or: [{ creatorId: trainerId }, { assignedBy: trainerId }, { userId: null }],
  })
    .populate('userId', 'fullName email')
    .populate('assignedBy', 'fullName email')
    .sort({ updatedAt: -1 })
    .lean();

  return plans;
};

/**
 * Create a simple workout plan
 * Supports Day, Exercise, Sets, Reps, Rest fields
 */
export const createWorkoutPlan = async (trainerId, planData) => {
  const { name, goal, experienceLevel, days, assignToMemberId } = planData;

  if (!name || !name.trim()) {
    throw new Error('Plan name is required');
  }

  if (!days || !Array.isArray(days) || days.length === 0) {
    throw new Error('At least one workout day is required');
  }

  // Validate and normalize days structure
  const formattedDays = days.map((day, index) => {
    const dayNumber = Number(day.dayNumber) || index + 1;
    const dayName = day.dayName?.trim() || `Day ${dayNumber}`;
    const focus = day.focus?.trim() || 'General Conditioning';

    const exercises = (day.exercises || []).map((ex) => {
      if (!ex.exerciseName || !ex.exerciseName.trim()) {
        throw new Error(`Exercise name is required for Day ${dayNumber}`);
      }

      return {
        exerciseName: ex.exerciseName.trim(),
        muscleGroup: ex.muscleGroup?.trim() || 'Full Body',
        sets: Number(ex.sets) || 3,
        reps: String(ex.reps || '10-12').trim(),
        restSeconds: Number(ex.restSeconds) || 60,
        instructions: ex.instructions?.trim() || '',
        imageUrl: ex.imageUrl || '',
        isCompleted: false,
      };
    });

    if (exercises.length === 0) {
      throw new Error(`Day ${dayNumber} must have at least one exercise`);
    }

    return {
      dayNumber,
      dayName,
      focus,
      isCompleted: false,
      exercises,
    };
  });

  // If assignToMemberId is specified, deactivate prior active plans and assign
  if (assignToMemberId) {
    await WorkoutPlan.updateMany(
      { userId: assignToMemberId, isActive: true },
      { $set: { isActive: false } }
    );

    const newPlan = await WorkoutPlan.create({
      userId: assignToMemberId,
      assignedBy: trainerId,
      creatorId: trainerId,
      name: name.trim(),
      goal: goal || 'general_fitness',
      experienceLevel: experienceLevel || 'intermediate',
      daysPerWeek: formattedDays.length,
      isActive: true,
      days: formattedDays,
    });

    return await WorkoutPlan.findById(newPlan._id)
      .populate('userId', 'fullName email')
      .populate('assignedBy', 'fullName email');
  }

  // Otherwise, create plan as reusable template
  const templatePlan = await WorkoutPlan.create({
    userId: null,
    creatorId: trainerId,
    assignedBy: null,
    name: name.trim(),
    goal: goal || 'general_fitness',
    experienceLevel: experienceLevel || 'intermediate',
    daysPerWeek: formattedDays.length,
    isActive: false,
    days: formattedDays,
  });

  return templatePlan;
};

/**
 * Edit an existing workout plan
 */
export const updateWorkoutPlan = async (trainerId, planId, updateData) => {
  const plan = await WorkoutPlan.findById(planId);
  if (!plan) {
    throw new Error('Workout plan not found');
  }

  if (updateData.name) plan.name = updateData.name.trim();
  if (updateData.goal) plan.goal = updateData.goal;
  if (updateData.experienceLevel) plan.experienceLevel = updateData.experienceLevel;

  if (updateData.days && Array.isArray(updateData.days)) {
    plan.days = updateData.days.map((day, index) => {
      const dayNumber = Number(day.dayNumber) || index + 1;
      const dayName = day.dayName?.trim() || `Day ${dayNumber}`;
      const focus = day.focus?.trim() || 'General Conditioning';

      const exercises = (day.exercises || []).map((ex) => ({
        exerciseName: ex.exerciseName?.trim() || 'Exercise',
        muscleGroup: ex.muscleGroup?.trim() || 'Full Body',
        sets: Number(ex.sets) || 3,
        reps: String(ex.reps || '10-12').trim(),
        restSeconds: Number(ex.restSeconds) || 60,
        instructions: ex.instructions?.trim() || '',
        imageUrl: ex.imageUrl || '',
        isCompleted: false,
      }));

      return {
        dayNumber,
        dayName,
        focus,
        isCompleted: false,
        exercises,
      };
    });
    plan.daysPerWeek = plan.days.length;
  }

  await plan.save();

  return await WorkoutPlan.findById(plan._id)
    .populate('userId', 'fullName email')
    .populate('assignedBy', 'fullName email');
};

/**
 * Delete a workout plan
 */
export const deleteWorkoutPlan = async (trainerId, planId) => {
  const plan = await WorkoutPlan.findById(planId);
  if (!plan) {
    throw new Error('Workout plan not found');
  }

  await WorkoutPlan.findByIdAndDelete(planId);
  return { id: planId, deleted: true };
};

/**
 * Assign an existing plan to an assigned member
 */
export const assignPlanToMember = async (trainerId, memberId, planId) => {
  const member = await User.findById(memberId);
  if (!member) {
    throw new Error('Member not found');
  }

  const sourcePlan = await WorkoutPlan.findById(planId);
  if (!sourcePlan) {
    throw new Error('Workout plan to assign was not found');
  }

  // Deactivate any currently active plan for this member
  await WorkoutPlan.updateMany(
    { userId: memberId, isActive: true },
    { $set: { isActive: false } }
  );

  // If the sourcePlan is already associated with this member, simply activate it
  if (sourcePlan.userId && sourcePlan.userId.toString() === memberId.toString()) {
    sourcePlan.isActive = true;
    sourcePlan.assignedBy = trainerId;
    await sourcePlan.save();

    return await WorkoutPlan.findById(sourcePlan._id)
      .populate('userId', 'fullName email')
      .populate('assignedBy', 'fullName email');
  }

  // Otherwise, clone the plan as an active plan assigned to this member
  const cleanDays = (sourcePlan.days || []).map((d) => ({
    dayNumber: d.dayNumber,
    dayName: d.dayName,
    focus: d.focus,
    isCompleted: false,
    exercises: (d.exercises || []).map((e) => ({
      exerciseName: e.exerciseName,
      muscleGroup: e.muscleGroup,
      sets: e.sets,
      reps: e.reps,
      restSeconds: e.restSeconds,
      instructions: e.instructions,
      imageUrl: e.imageUrl,
      isCompleted: false,
    })),
  }));

  const assignedPlan = await WorkoutPlan.create({
    userId: memberId,
    assignedBy: trainerId,
    creatorId: trainerId,
    name: sourcePlan.name,
    goal: sourcePlan.goal,
    experienceLevel: sourcePlan.experienceLevel,
    daysPerWeek: cleanDays.length,
    isActive: true,
    days: cleanDays,
  });

  return await WorkoutPlan.findById(assignedPlan._id)
    .populate('userId', 'fullName email')
    .populate('assignedBy', 'fullName email');
};
