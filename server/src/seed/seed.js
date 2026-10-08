import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import FitnessProfile from '../models/fitnessProfile.model.js';
import WorkoutPlan from '../models/workoutPlan.model.js';
import Attendance from '../models/attendance.model.js';
import GymSchedule from '../models/gymSchedule.model.js';
import GymClosure from '../models/gymClosure.model.js';
import MembershipPlan from '../models/membershipPlan.model.js';
import { generateRuleBasedPlan } from '../services/workoutGenerator.service.js';

export const seedDatabase = async () => {
  try {
    const demoPassword = 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(demoPassword, salt);

    // 0. Seed default Membership Plans if not present
    const existingPlans = await MembershipPlan.countDocuments();
    let defaultPlan = null;
    if (existingPlans === 0) {
      const plans = await MembershipPlan.insertMany([
        {
          name: '1 Month',
          durationMonths: 1,
          price: 999,
          description: 'Standard 1-month gym membership pass',
          isActive: true,
        },
        {
          name: '3 Months',
          durationMonths: 3,
          price: 2499,
          description: 'Quarterly fitness training commitment',
          isActive: true,
        },
        {
          name: '6 Months',
          durationMonths: 6,
          price: 4499,
          description: 'Semi-annual membership with full facility access',
          isActive: true,
        },
        {
          name: '12 Months',
          durationMonths: 12,
          price: 7999,
          description: 'Annual Pro unlimited membership with maximum savings',
          isActive: true,
        },
      ]);
      defaultPlan = plans[3]; // 12 Months
      console.log('💳 [Seed] Default database membership plans created.');
    } else {
      defaultPlan = await MembershipPlan.findOne({ name: '12 Months' });
    }

    // 1. Seed default Gym Operating Schedule if not present
    let schedule = await GymSchedule.findOne();
    if (!schedule) {
      schedule = await GymSchedule.create({
        openDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        closedDays: ['Sunday'],
        openingTime: '06:00 AM',
        closingTime: '10:00 PM',
        targetWorkoutMinutes: 60,
        notes: 'Standard facility operating schedule',
      });
      console.log('🗓️ [Seed] Default gym operating schedule created.');
    }

    // 1b. Seed default facility closure (2026-10-08) if not present
    const existingClosure = await GymClosure.findOne({ date: '2026-10-08' });
    if (!existingClosure) {
      await GymClosure.create({
        date: '2026-10-08',
        reason: 'xyz',
        announcement: 'xyzzz',
        isClosed: true,
      });
      console.log('🚧 [Seed] Facility closure for 2026-10-08 created.');
    }

    // 1. Seed exactly 3 distinct Demo Trainers (PART 8 & 9)
    const demoTrainers = [
      {
        fullName: 'Rahul Sharma',
        email: 'trainer1@fitpulse.local',
        phone: '9876543201',
        password: hashedPassword,
        role: 'trainer',
        specialization: 'Strength Training',
      },
      {
        fullName: 'Priya Patel',
        email: 'trainer2@fitpulse.local',
        phone: '9876543202',
        password: hashedPassword,
        role: 'trainer',
        specialization: 'Fat Loss & Conditioning',
      },
      {
        fullName: 'Arjun Mehta',
        email: 'trainer3@fitpulse.local',
        phone: '9876543203',
        password: hashedPassword,
        role: 'trainer',
        specialization: 'Muscle Gain & Hypertrophy',
      },
    ];

    for (const t of demoTrainers) {
      await User.findOneAndUpdate(
        { email: t.email },
        {
          $set: {
            fullName: t.fullName,
            password: t.password,
            phone: t.phone,
            role: 'trainer',
            specialization: t.specialization,
          },
        },
        { upsert: true, new: true }
      );
    }

    // Clean up duplicate legacy trainer accounts (e.g. trainer@fitpulse.local)
    const duplicateTrainers = await User.find({ email: 'trainer@fitpulse.local' });
    if (duplicateTrainers.length > 0) {
      const duplicateIds = duplicateTrainers.map((t) => t._id);
      const canonicalTrainer1 = await User.findOne({ email: 'trainer1@fitpulse.local' });
      if (canonicalTrainer1) {
        await FitnessProfile.updateMany(
          { trainerId: { $in: duplicateIds } },
          { $set: { trainerId: canonicalTrainer1._id } }
        );
      }
      await User.deleteMany({ _id: { $in: duplicateIds } });
      console.log('🧹 [Seed] Cleaned up duplicate legacy trainer account: trainer@fitpulse.local');
    }
    console.log('🏋️‍♂️ [Seed] Exactly 3 Demo Trainers confirmed: Rahul Sharma, Priya Patel, Arjun Mehta');

    let admin = await User.findOne({ email: 'admin@fitpulse.local' });
    if (!admin) {
      admin = await User.create({
        fullName: 'FitPulse Admin',
        email: 'admin@fitpulse.local',
        phone: '9876543212',
        password: hashedPassword,
        role: 'admin',
      });
      console.log('🛡️ [Seed] Demo admin created: admin@fitpulse.local');
    }

    // 2. Cleanup obsolete demo trainees from previous setups
    const obsoleteEmails = ['jordan@fitpulse.local', 'sam@fitpulse.local'];
    const obsoleteUsers = await User.find({ email: { $in: obsoleteEmails } });
    if (obsoleteUsers.length > 0) {
      const obsoleteIds = obsoleteUsers.map((u) => u._id);
      await FitnessProfile.deleteMany({ userId: { $in: obsoleteIds } });
      await WorkoutPlan.deleteMany({ userId: { $in: obsoleteIds } });
      await Attendance.deleteMany({ userId: { $in: obsoleteIds } });
      await User.deleteMany({ _id: { $in: obsoleteIds } });
      console.log('🧹 [Seed] Obsolete demo accounts removed: Jordan Reed, Sam Rivera');
    }

    // 3. ONLY ONE clearly identified demo account: Alex Morgan
    const demoTrainee = {
      fullName: 'Alex Morgan',
      email: 'member@fitpulse.local',
      phone: '9876543210',
      age: 26,
      height: 178,
      weight: 75,
      fitnessGoal: 'muscle_gain',
      experienceLevel: 'intermediate',
      plannedDaysPerWeek: 5,
      preferredSchedule: 'morning',
    };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    let member = await User.findOne({ email: demoTrainee.email });
    if (!member) {
      member = await User.create({
        fullName: demoTrainee.fullName,
        email: demoTrainee.email,
        phone: demoTrainee.phone,
        password: hashedPassword,
        role: 'member',
      });
      console.log(`👤 [Seed] Demo trainee created: ${demoTrainee.email}`);
    }

    const comHashedPassword = await bcrypt.hash('Member@12345!', 10);
    await User.findOneAndUpdate(
      { email: 'member@fitpulse.com' },
      {
        $set: {
          fullName: 'John Member',
          phone: '5551234567',
          password: comHashedPassword,
          role: 'member',
        },
      },
      { upsert: true, new: true }
    );

    // Ensure fitness profile for demo member
    let profile = await FitnessProfile.findOne({ userId: member._id });
    const memStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const memExpiryDate = new Date(Date.now() + 335 * 24 * 60 * 60 * 1000);
    const trainerRahul = await User.findOne({ email: 'trainer1@fitpulse.local' });

    if (!profile) {
      profile = await FitnessProfile.create({
        userId: member._id,
        trainerId: trainerRahul?._id || null,
        age: demoTrainee.age,
        height: demoTrainee.height,
        weight: demoTrainee.weight,
        fitnessGoal: demoTrainee.fitnessGoal,
        experienceLevel: demoTrainee.experienceLevel,
        plannedDaysPerWeek: demoTrainee.plannedDaysPerWeek,
        preferredSchedule: demoTrainee.preferredSchedule,
        trainerRequested: true,
        wantsTrainer: true,
        membershipPlan: defaultPlan ? defaultPlan.name : '12 Months',
        membershipPlanId: defaultPlan ? defaultPlan._id : null,
        membershipStatus: 'Active',
        membershipStartDate: memStartDate,
        membershipExpiry: memExpiryDate,
      });
    } else {
      profile.trainerId = trainerRahul?._id || null;
      if (!profile.membershipPlanId && defaultPlan) {
        profile.membershipPlanId = defaultPlan._id;
        profile.membershipPlan = defaultPlan.name;
      }
      profile.membershipStatus = 'Active';
      profile.trainerRequested = true;
      await profile.save();
    }

    // Ensure workout plan for demo member
    let plan = await WorkoutPlan.findOne({ userId: member._id, isActive: true });
    if (!plan || !plan.days || plan.days.length === 0) {
      const generated = generateRuleBasedPlan({
        fitnessGoal: demoTrainee.fitnessGoal,
        experienceLevel: demoTrainee.experienceLevel,
        plannedDaysPerWeek: demoTrainee.plannedDaysPerWeek,
      });
      plan = await WorkoutPlan.create({
        userId: member._id,
        ...generated,
      });
    }

    // Clean existing attendance for demo member to ensure fresh realistic sessions
    await Attendance.deleteMany({ userId: member._id });

    // Seed realistic attendance sessions with varied timestamps and exercise completion
    // Day 1: Oct 1, 08:20 AM -> 09:32 AM (72 mins), 5/5 completed -> 100%
    // Day 2: Oct 3, 06:10 PM -> 07:45 PM (95 mins), 4/5 completed -> 80%
    // Day 3: Oct 5, 07:05 AM -> 08:22 AM (77 mins), 5/5 completed -> 100%
    // Day 4: Oct 7, 05:40 PM -> 06:55 PM (75 mins), 3/5 completed -> 60%
    // Expected Days = 5 -> (100 + 80 + 100 + 60 + 0) / 5 = 68% consistency!
    const sampleExercises = [
      { exerciseId: 'ex_1', exerciseName: 'Barbell Flat Bench Press', sets: 4, reps: '8-10' },
      { exerciseId: 'ex_2', exerciseName: 'Incline Dumbbell Press', sets: 3, reps: '10-12' },
      { exerciseId: 'ex_3', exerciseName: 'Cable Chest Flyes', sets: 3, reps: '12-15' },
      { exerciseId: 'ex_4', exerciseName: 'Overhead Dumbbell Press', sets: 3, reps: '10-12' },
      { exerciseId: 'ex_5', exerciseName: 'Cable Triceps Rope Pushdown', sets: 3, reps: '12-15' },
    ];

    const demoSessions = [
      { day: 1, inH: 8, inM: 20, outH: 9, outM: 32, completedCount: 5 }, // 72 mins, 100%
      { day: 3, inH: 18, inM: 10, outH: 19, outM: 45, completedCount: 4 }, // 95 mins, 80%
      { day: 5, inH: 7, inM: 5, outH: 8, outM: 22, completedCount: 5 }, // 77 mins, 100%
      { day: 7, inH: 17, inM: 40, outH: 18, outM: 55, completedCount: 3 }, // 75 mins, 60%
    ];

    const records = demoSessions.map((s) => {
      const checkIn = new Date(now.getFullYear(), now.getMonth(), s.day, s.inH, s.inM, 0);
      const checkOut = new Date(now.getFullYear(), now.getMonth(), s.day, s.outH, s.outM, 0);
      const duration = Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / 60000));
      const score = Math.round((s.completedCount / 5) * 100);

      const sessionExercises = sampleExercises.map((ex, idx) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        sets: ex.sets,
        reps: ex.reps,
        isCompleted: idx < s.completedCount,
        completedAt: idx < s.completedCount ? new Date(checkIn.getTime() + (idx + 1) * 12 * 60000) : null,
      }));

      return {
        userId: member._id,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        durationMinutes: duration,
        status: 'completed',
        dateKey: checkIn.toISOString().slice(0, 10),
        workoutPlanId: plan._id,
        workoutDayName: 'Push (Chest, Shoulders & Triceps)',
        totalAssigned: 5,
        totalCompleted: s.completedCount,
        sessionScore: score,
        exercises: sessionExercises,
      };
    });

    await Attendance.insertMany(records);
    console.log('✅ [Seed] Database seeded with 1 Demo Member (Alex Morgan) and verified exercise sessions.');
  } catch (err) {
    console.error('[Seed Error]', err.message);
  }
};
