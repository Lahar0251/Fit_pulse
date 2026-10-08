import mongoose from 'mongoose';

const fitnessProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    trainerRequested: {
      type: Boolean,
      default: false,
    },
    wantsTrainer: {
      type: Boolean,
      default: false,
    },
    age: {
      type: Number,
      default: 25,
      min: 14,
      max: 100,
    },
    height: {
      type: Number, // in cm
      default: 175,
      min: 50,
      max: 260,
    },
    weight: {
      type: Number, // in kg
      default: 72,
      min: 30,
      max: 300,
    },
    fitnessGoal: {
      type: String,
      enum: ['muscle_gain', 'fat_loss', 'strength', 'general_fitness', 'endurance'],
      default: 'muscle_gain',
      required: true,
    },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'pro'],
      default: 'beginner',
      required: true,
    },
    initialLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'pro'],
      default: 'beginner',
    },
    currentLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'pro'],
      default: 'beginner',
    },
    levelSince: {
      type: Date,
      default: Date.now,
    },
    promotionHistory: [
      {
        from: { type: String },
        to: { type: String },
        date: { type: Date, default: Date.now },
        reason: { type: String, default: 'Sustained workout consistency' },
      },
    ],
    monthlyHistory: [
      {
        yearMonth: { type: String },
        consistencyPercentage: { type: Number, default: 0 },
      },
    ],
    plannedDaysPerWeek: {
      type: Number,
      default: 5,
      min: 1,
      max: 7,
      required: true,
    },
    activeWorkoutSource: {
      type: String,
      enum: ['recommended', 'custom', 'trainer'],
      default: 'recommended',
    },
    previousPersonalSource: {
      type: String,
      enum: ['recommended', 'custom'],
      default: 'recommended',
    },
    preferredSchedule: {
      type: String,
      default: 'morning',
    },
    membershipPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipPlan',
      default: null,
    },
    membershipPlan: {
      type: String,
      default: null,
    },
    membershipStatus: {
      type: String,
      enum: ['Active', 'Pending', 'Expired', 'Frozen'],
      default: 'Pending',
    },
    membershipStartDate: {
      type: Date,
      default: null,
    },
    membershipExpiry: {
      type: Date,
      default: null,
    },
    accumulatedDurationMonths: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const FitnessProfile =
  mongoose.models.FitnessProfile || mongoose.model('FitnessProfile', fitnessProfileSchema);

export default FitnessProfile;
