import mongoose from 'mongoose';

const exerciseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    muscleGroup: {
      type: String,
      required: true,
      enum: ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'],
      index: true,
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner',
      index: true,
    },
    equipment: {
      type: String,
      required: true,
      default: 'Bodyweight',
    },
    instructions: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Text search index for efficient searching across name, muscleGroup, equipment, and instructions
exerciseSchema.index({
  name: 'text',
  muscleGroup: 'text',
  equipment: 'text',
  instructions: 'text',
});

const Exercise =
  mongoose.models.Exercise || mongoose.model('Exercise', exerciseSchema);

export default Exercise;
