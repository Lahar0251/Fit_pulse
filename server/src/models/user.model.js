import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
    },
    role: {
      type: String,
      enum: ['member', 'trainer', 'admin'],
      default: 'member',
      required: true,
      index: true,
    },
    specialization: {
      type: String,
      default: '',
      trim: true,
    },
    hasLoggedInBefore: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// email already has unique: true which creates the index
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
