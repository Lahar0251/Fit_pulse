import mongoose from 'mongoose';

const gymClosureSchema = new mongoose.Schema(
  {
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    isClosed: {
      type: Boolean,
      default: true,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    announcement: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const GymClosure = mongoose.model('GymClosure', gymClosureSchema);
export default GymClosure;
