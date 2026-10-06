import Exercise from '../models/exercise.model.js';

/**
 * Get all exercises from MongoDB with optional search and filtering
 * Query params:
 * - search: string (matches name, muscleGroup, equipment, instructions)
 * - muscleGroup: string ('All' or 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core')
 * - difficulty: string ('All' or 'Beginner', 'Intermediate', 'Advanced')
 */
export const getAllExercises = async (req, res, next) => {
  try {
    const { search, muscleGroup, difficulty } = req.query;

    const filter = {};

    // Filter by Muscle Group
    if (muscleGroup && muscleGroup !== 'All') {
      filter.muscleGroup = { $regex: new RegExp(`^${muscleGroup.trim()}$`, 'i') };
    }

    // Filter by Difficulty
    if (difficulty && difficulty !== 'All') {
      filter.difficulty = { $regex: new RegExp(`^${difficulty.trim()}$`, 'i') };
    }

    // Search query matching name, muscle group, equipment, or instructions
    if (search && search.trim() !== '') {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { muscleGroup: searchRegex },
        { equipment: searchRegex },
        { instructions: searchRegex },
      ];
    }

    const exercises = await Exercise.find(filter).sort({ name: 1 });

    return res.status(200).json({
      status: 'success',
      count: exercises.length,
      data: exercises,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single exercise by ID
 */
export const getExerciseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exercise = await Exercise.findById(id);

    if (!exercise) {
      return res.status(404).json({
        status: 'error',
        message: 'Exercise not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: exercise,
    });
  } catch (error) {
    next(error);
  }
};
