import mongoose from 'mongoose';

export const ALL_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const getDefaultDailyHours = () =>
  ALL_DAYS.map((day) => ({
    day,
    openingTime: '06:00 AM',
    closingTime: '10:00 PM',
  }));

const gymScheduleSchema = new mongoose.Schema(
  {
    openDays: {
      type: [String],
      default: ALL_DAYS,
      required: true,
    },
    closedDays: {
      type: [String],
      default: [],
      required: true,
    },
    openingTime: {
      type: String,
      default: '06:00 AM',
      required: true,
      trim: true,
    },
    closingTime: {
      type: String,
      default: '10:00 PM',
      required: true,
      trim: true,
    },
    dailyHours: {
      type: [
        {
          day: {
            type: String,
            required: true,
          },
          openingTime: {
            type: String,
            default: '06:00 AM',
            trim: true,
          },
          closingTime: {
            type: String,
            default: '10:00 PM',
            trim: true,
          },
        },
      ],
      default: () => getDefaultDailyHours(),
    },
    notes: {
      type: String,
      default: 'Standard facility operating schedule (7 Days Available)',
      trim: true,
    },
    targetWorkoutMinutes: {
      type: Number,
      default: 60,
      min: 10,
      max: 300,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const GymSchedule = mongoose.model('GymSchedule', gymScheduleSchema);
export default GymSchedule;
