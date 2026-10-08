import mongoose from 'mongoose';

const membershipPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    durationMonths: {
      type: Number,
      required: [true, 'Duration in months is required'],
      min: [1, 'Duration must be at least 1 month'],
    },
    price: {
      type: Number,
      required: [true, 'Price in INR is required'],
      min: [0, 'Price cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const MembershipPlan =
  mongoose.models.MembershipPlan || mongoose.model('MembershipPlan', membershipPlanSchema);

export default MembershipPlan;
