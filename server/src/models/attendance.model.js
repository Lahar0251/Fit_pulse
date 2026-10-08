import mongoose from 'mongoose';

const exerciseCompletionItemSchema = new mongoose.Schema({
  exerciseId: {
    type: String,
    required: true,
  },
  exerciseName: {
    type: String,
    required: true,
  },
  sets: {
    type: Number,
    default: 3,
  },
  reps: {
    type: String,
    default: '10-12',
  },
  restSeconds: {
    type: Number,
    default: 60,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  imageUrl: {
    type: String,
    default: '',
  },
});

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    checkInTime: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: 0,
    },
    estimatedDurationMinutes: {
      type: Number,
      default: 45,
    },
    realismFactor: {
      type: Number,
      default: 1.0,
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    dateKey: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    workoutPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutPlan',
      default: null,
    },
    workoutDayName: {
      type: String,
      default: 'Daily Workout',
    },
    scheduleDay: {
      type: String,
      default: '',
    },
    workoutSource: {
      type: String,
      enum: ['recommended', 'custom', 'trainer'],
      default: 'recommended',
    },
    sessionType: {
      type: String,
      enum: ['scheduled', 'makeup'],
      default: 'scheduled',
    },
    makeupForDayNumber: {
      type: Number,
      default: null,
    },
    totalAssigned: {
      type: Number,
      default: 0,
    },
    totalCompleted: {
      type: Number,
      default: 0,
    },
    sessionScore: {
      type: Number,
      default: 0,
    },
    exercises: [exerciseCompletionItemSchema],
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ userId: 1, status: 1 });
attendanceSchema.index({ userId: 1, dateKey: 1 });
attendanceSchema.index({ userId: 1, checkInTime: -1 });

const Attendance =
  mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

export default Attendance;

