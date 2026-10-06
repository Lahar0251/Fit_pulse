import mongoose from 'mongoose';

const exerciseItemSchema = new mongoose.Schema({
  exerciseName: {
    type: String,
    required: true,
  },
  muscleGroup: {
    type: String,
    default: 'Full Body',
  },
  sets: {
    type: Number,
    required: true,
    default: 3,
  },
  reps: {
    type: String,
    required: true,
    default: '10-12',
  },
  restSeconds: {
    type: Number,
    default: 60,
  },
  instructions: {
    type: String,
    default: '',
  },
  imageUrl: {
    type: String,
    default: '',
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
});

const workoutDaySchema = new mongoose.Schema({
  dayNumber: {
    type: Number,
    required: true,
  },
  dayName: {
    type: String,
    required: true,
  },
  focus: {
    type: String,
    required: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  exercises: [exerciseItemSchema],
});

const workoutPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      required: true,
      default: 'Personalized Workout Plan',
    },
    goal: {
      type: String,
      default: 'muscle_gain',
    },
    experienceLevel: {
      type: String,
      default: 'intermediate',
    },
    daysPerWeek: {
      type: Number,
      default: 5,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    days: [workoutDaySchema],
  },
  {
    timestamps: true,
  }
);

const WorkoutPlan =
  mongoose.models.WorkoutPlan || mongoose.model('WorkoutPlan', workoutPlanSchema);

export default WorkoutPlan;
