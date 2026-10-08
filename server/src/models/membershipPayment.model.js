import mongoose from 'mongoose';

const membershipPaymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipPlan',
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    durationMonths: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Completed', 'Pending', 'Failed'],
      default: 'Completed',
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    startDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const MembershipPayment =
  mongoose.models.MembershipPayment || mongoose.model('MembershipPayment', membershipPaymentSchema);

export default MembershipPayment;
