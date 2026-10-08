import express from 'express';
import mongoose from 'mongoose';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import User from '../models/user.model.js';
import FitnessProfile from '../models/fitnessProfile.model.js';
import Attendance from '../models/attendance.model.js';
import GymSchedule, { ALL_DAYS, getDefaultDailyHours } from '../models/gymSchedule.model.js';
import GymClosure from '../models/gymClosure.model.js';
import MembershipPlan from '../models/membershipPlan.model.js';
import WorkoutPlan from '../models/workoutPlan.model.js';
import MembershipPayment from '../models/membershipPayment.model.js';
import { recordSyncEvent } from '../services/sync.service.js';

const router = express.Router();

// Strict Admin-only access
router.use(protect);
router.use(restrictTo('admin'));

// Admin System Overview statistics
router.get('/system-overview', async (req, res, next) => {
  try {
    const totalMembers = await User.countDocuments({ role: 'member' });
    const totalTrainers = await User.countDocuments({ role: 'trainer' });

    // Active memberships from FitnessProfile
    const activeProfilesCount = await FitnessProfile.countDocuments({
      membershipStatus: { $regex: /^active$/i },
    });
    const activeMemberships = activeProfilesCount > 0 ? activeProfilesCount : totalMembers;

    // Today's attendance check-ins from Attendance
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const todaysAttendance = await Attendance.countDocuments({
      $or: [
        { dateKey: todayKey },
        { checkInTime: { $gte: startOfToday, $lte: endOfToday } },
      ],
    });

    return res.status(200).json({
      status: 'success',
      data: {
        totalMembers,
        totalTrainers,
        activeMemberships,
        todaysAttendance,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Admin Users list with membership status (passwords strictly excluded)
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
    const userIds = users.map((u) => u._id);
    const stringIds = users.map((u) => String(u._id));
    const profiles = await FitnessProfile.find({
      $or: [{ userId: { $in: userIds } }, { userId: { $in: stringIds } }],
    }).lean();

    const profileMap = new Map();
    profiles.forEach((p) => {
      profileMap.set(String(p.userId), p);
    });

    const usersData = users.map((u) => {
      const p = profileMap.get(String(u._id));
      let status = 'Active';
      if (u.role === 'member') {
        status = p?.membershipStatus || 'Active';
      } else {
        status = 'Staff';
      }

      return {
        id: u._id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone || '—',
        role: u.role,
        membershipStatus: status,
        membershipStartDate: p?.membershipStartDate || (u.role === 'member' ? u.createdAt : null),
        membershipExpiry: p?.membershipExpiry || null,
        membershipPlan: p?.membershipPlan || (u.role === 'member' ? '12 Months Plan' : null),
        accumulatedDurationMonths: p?.accumulatedDurationMonths || (u.role === 'member' ? 12 : 0),
        createdAt: u.createdAt,
      };
    });

    return res.status(200).json({
      status: 'success',
      count: usersData.length,
      data: usersData,
    });
  } catch (err) {
    next(err);
  }
});

// Admin update user status / role according to intended application permissions
router.patch('/users/:userId/status', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { membershipStatus, role } = req.body;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found in system',
      });
    }

    if (role && ['member', 'trainer', 'admin'].includes(role)) {
      const previousRole = user.role;
      user.role = role;
      await user.save();

      // If user was previously a trainer and role changed to non-trainer, reassign members safely
      if (previousRole === 'trainer' && role !== 'trainer') {
        const assignedProfiles = await FitnessProfile.find({ trainerId: user._id });
        for (const ap of assignedProfiles) {
          ap.trainerId = null;
          ap.trainerRequested = false;
          ap.wantsTrainer = false;
          ap.activeWorkoutSource = 'recommended';
          ap.previousPersonalSource = 'recommended';
          await ap.save();

          await WorkoutPlan.updateMany(
            { userId: ap.userId, trainerId: user._id },
            { $set: { isActive: false } }
          );
          await WorkoutPlan.updateOne(
            { userId: ap.userId, planType: 'recommended' },
            { $set: { isActive: true } }
          );

          recordSyncEvent('workoutPlan', { memberId: String(ap.userId) });
          recordSyncEvent('profile', { memberId: String(ap.userId) });
        }

        // Deactivate trainer's templates
        await WorkoutPlan.updateMany(
          { trainerId: user._id, isTemplate: true },
          { $set: { isActive: false } }
        );
      }

      // If user became a member, ensure a valid fitness profile exists
      if (role === 'member') {
        const objId = mongoose.Types.ObjectId.isValid(userId)
          ? new mongoose.Types.ObjectId(userId)
          : userId;
        const existingProfile = await FitnessProfile.findOne({
          $or: [{ userId: objId }, { userId: String(userId) }],
        });
        if (!existingProfile) {
          const oneYear = new Date();
          oneYear.setFullYear(oneYear.getFullYear() + 1);
          await FitnessProfile.create({
            userId: objId,
            membershipStatus: 'Active',
            membershipStartDate: new Date(),
            membershipExpiry: oneYear,
            membershipPlan: '12 Months Plan',
            accumulatedDurationMonths: 12,
          });
        }
      }
    }

    let updatedProfile = null;
    const objId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    if (membershipStatus) {
      updatedProfile = await FitnessProfile.findOneAndUpdate(
        { $or: [{ userId: objId }, { userId: String(userId) }] },
        { $set: { membershipStatus, userId: objId } },
        { upsert: true, new: true }
      );
    } else {
      updatedProfile = await FitnessProfile.findOne({
        $or: [{ userId: objId }, { userId: String(userId) }],
      }).lean();
    }

    recordSyncEvent('userMembership', { targetUserId: String(user._id) }, req.headers['x-tab-session-id']);

    return res.status(200).json({
      status: 'success',
      message: `User status updated successfully`,
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || '—',
        role: user.role,
        membershipStatus: user.role === 'member' ? (updatedProfile?.membershipStatus || 'Active') : 'Staff',
        membershipStartDate: updatedProfile?.membershipStartDate || (user.role === 'member' ? user.createdAt : null),
        membershipExpiry: updatedProfile?.membershipExpiry || null,
        membershipPlan: updatedProfile?.membershipPlan || (user.role === 'member' ? '12 Months Plan' : null),
        accumulatedDurationMonths: updatedProfile?.accumulatedDurationMonths || (user.role === 'member' ? 12 : 0),
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Admin delete user permanently from system and MongoDB
router.delete('/users/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Safety guard: prevent deleting the currently authenticated admin account
    const currentAdminId = String(req.user._id || req.user.id);
    if (currentAdminId === String(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete your own active administrator account.',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found in system',
      });
    }

    const targetRole = user.role;
    const targetUserId = user._id;

    // If deleting a trainer, safely reassign all assigned members to No Trainer & Recommended
    if (targetRole === 'trainer') {
      const assignedProfiles = await FitnessProfile.find({ trainerId: targetUserId });
      for (const ap of assignedProfiles) {
        ap.trainerId = null;
        ap.trainerRequested = false;
        ap.wantsTrainer = false;
        ap.activeWorkoutSource = 'recommended';
        ap.previousPersonalSource = 'recommended';
        await ap.save();

        await WorkoutPlan.updateMany(
          { userId: ap.userId, trainerId: targetUserId },
          { $set: { isActive: false } }
        );
        await WorkoutPlan.updateOne(
          { userId: ap.userId, planType: 'recommended' },
          { $set: { isActive: true } }
        );

        recordSyncEvent('workoutPlan', { memberId: String(ap.userId) });
        recordSyncEvent('profile', { memberId: String(ap.userId) });
      }

      // Delete trainer template plans
      await WorkoutPlan.deleteMany({ trainerId: targetUserId, isTemplate: true });
    }

    // Clean up user's own profile and plans
    await FitnessProfile.deleteMany({ userId: targetUserId });
    await WorkoutPlan.deleteMany({ userId: targetUserId });

    if (targetRole === 'member') {
      await Attendance.deleteMany({ userId: targetUserId });
      await MembershipPayment.deleteMany({ userId: targetUserId });
    }

    // Permanently remove user from MongoDB
    await User.findByIdAndDelete(targetUserId);

    recordSyncEvent('userMembership', { targetUserId: String(targetUserId), action: 'deleted' }, req.headers['x-tab-session-id']);

    return res.status(200).json({
      status: 'success',
      message: `${user.fullName} (${user.role}) has been permanently deleted from FitPulse.`,
    });
  } catch (err) {
    next(err);
  }
});

// Admin Gym Operating Schedule - GET active schedule and upcoming closures from MongoDB
router.get('/schedule', async (req, res, next) => {
  try {
    let schedule = await GymSchedule.findOne().lean();
    if (!schedule) {
      schedule = await GymSchedule.create({
        openDays: ALL_DAYS,
        closedDays: [],
        openingTime: '06:00 AM',
        closingTime: '10:00 PM',
        dailyHours: getDefaultDailyHours(),
        notes: 'Standard facility operating schedule (7 Days Available)',
      });
      schedule = schedule.toObject();
    } else if (!schedule.dailyHours || schedule.dailyHours.length === 0) {
      const migratedDailyHours = ALL_DAYS.map((day) => ({
        day,
        openingTime: schedule.openingTime || '06:00 AM',
        closingTime: schedule.closingTime || '10:00 PM',
      }));
      await GymSchedule.updateOne(
        { _id: schedule._id },
        {
          $set: {
            dailyHours: migratedDailyHours,
            openDays: ALL_DAYS,
            closedDays: [],
          },
        }
      );
      schedule.dailyHours = migratedDailyHours;
      schedule.openDays = ALL_DAYS;
      schedule.closedDays = [];
    }

    // Ensure all 7 days exist in dailyHours
    const currentDays = (schedule.dailyHours || []).map((d) => d.day);
    const missingDays = ALL_DAYS.filter((d) => !currentDays.includes(d));
    if (missingDays.length > 0) {
      for (const d of missingDays) {
        schedule.dailyHours.push({
          day: d,
          openingTime: schedule.openingTime || '06:00 AM',
          closingTime: schedule.closingTime || '10:00 PM',
        });
      }
      await GymSchedule.updateOne(
        { _id: schedule._id },
        { $set: { dailyHours: schedule.dailyHours } }
      );
    }

    // Sort dailyHours Monday to Sunday
    schedule.dailyHours.sort(
      (a, b) => ALL_DAYS.indexOf(a.day) - ALL_DAYS.indexOf(b.day)
    );

    const closures = await GymClosure.find({ isClosed: true }).sort({ date: 1 }).lean();

    return res.status(200).json({
      status: 'success',
      data: {
        ...schedule,
        closures: closures || [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// Admin Gym Operating Schedule - PUT / UPDATE schedule in MongoDB
router.put('/schedule', async (req, res, next) => {
  try {
    const { dailyHours, day, openingTime, closingTime, notes } = req.body;

    let schedule = await GymSchedule.findOne();
    if (!schedule) {
      schedule = await GymSchedule.create({
        openDays: ALL_DAYS,
        closedDays: [],
        openingTime: '06:00 AM',
        closingTime: '10:00 PM',
        dailyHours: getDefaultDailyHours(),
        notes: 'Standard facility operating schedule (7 Days Available)',
      });
    }

    let updatedDailyHours = Array.isArray(schedule.dailyHours)
      ? [...schedule.dailyHours.map((h) => (h.toObject ? h.toObject() : { ...h }))]
      : getDefaultDailyHours();

    // Ensure all 7 days exist in array
    for (const d of ALL_DAYS) {
      if (!updatedDailyHours.some((h) => h.day === d)) {
        updatedDailyHours.push({
          day: d,
          openingTime: '06:00 AM',
          closingTime: '10:00 PM',
        });
      }
    }

    // Case 1: Bulk update of dailyHours
    if (Array.isArray(dailyHours) && dailyHours.length > 0) {
      for (const item of dailyHours) {
        if (!item || !item.day || !ALL_DAYS.includes(item.day)) continue;
        const targetIdx = updatedDailyHours.findIndex((h) => h.day === item.day);
        const newOpen = (item.openingTime && String(item.openingTime).trim()) || '06:00 AM';
        const newClose = (item.closingTime && String(item.closingTime).trim()) || '10:00 PM';
        if (targetIdx >= 0) {
          updatedDailyHours[targetIdx] = {
            day: item.day,
            openingTime: newOpen,
            closingTime: newClose,
          };
        } else {
          updatedDailyHours.push({
            day: item.day,
            openingTime: newOpen,
            closingTime: newClose,
          });
        }
      }
    }
    // Case 2: Single-day update: { day, openingTime, closingTime }
    else if (day && ALL_DAYS.includes(day)) {
      const targetIdx = updatedDailyHours.findIndex((h) => h.day === day);
      const newOpen = (openingTime && String(openingTime).trim()) || '06:00 AM';
      const newClose = (closingTime && String(closingTime).trim()) || '10:00 PM';
      if (targetIdx >= 0) {
        updatedDailyHours[targetIdx] = {
          day,
          openingTime: newOpen,
          closingTime: newClose,
        };
      } else {
        updatedDailyHours.push({
          day,
          openingTime: newOpen,
          closingTime: newClose,
        });
      }
    }

    // Sort dailyHours Monday to Sunday
    updatedDailyHours.sort(
      (a, b) => ALL_DAYS.indexOf(a.day) - ALL_DAYS.indexOf(b.day)
    );

    const mondayHours = updatedDailyHours.find((h) => h.day === 'Monday');
    const finalOpeningTime = mondayHours?.openingTime || (openingTime && String(openingTime).trim()) || schedule.openingTime || '06:00 AM';
    const finalClosingTime = mondayHours?.closingTime || (closingTime && String(closingTime).trim()) || schedule.closingTime || '10:00 PM';
    const finalNotes = typeof notes === 'string' ? notes.trim() : schedule.notes;

    schedule.openDays = ALL_DAYS;
    schedule.closedDays = [];
    schedule.dailyHours = updatedDailyHours;
    schedule.openingTime = finalOpeningTime;
    schedule.closingTime = finalClosingTime;
    schedule.notes = finalNotes;
    schedule.lastUpdatedBy = req.user?._id || null;

    schedule.markModified('dailyHours');
    const saved = await schedule.save();

    recordSyncEvent('schedule', {}, req.headers['x-tab-session-id']);

    return res.status(200).json({
      status: 'success',
      message: 'Gym operating schedule saved successfully.',
      data: saved,
    });
  } catch (err) {
    next(err);
  }
});

// Admin Gym Closures Management
// GET /api/admin/closures - List all scheduled closures
router.get('/closures', async (req, res, next) => {
  try {
    const closures = await GymClosure.find().sort({ date: 1 }).lean();
    return res.status(200).json({
      status: 'success',
      data: closures || [],
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/closures - Schedule a date-specific closure
router.post('/closures', async (req, res, next) => {
  try {
    const { date, reason, announcement, isClosed } = req.body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date).trim())) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid date in YYYY-MM-DD format is required for closure.',
      });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Closure reason is required.',
      });
    }

    const cleanDate = String(date).trim();
    const cleanReason = String(reason).trim();
    const cleanAnnouncement = typeof announcement === 'string' ? announcement.trim() : '';
    const cleanIsClosed = isClosed === undefined ? true : Boolean(isClosed);

    const closure = await GymClosure.findOneAndUpdate(
      { date: cleanDate },
      {
        $set: {
          date: cleanDate,
          reason: cleanReason,
          announcement: cleanAnnouncement,
          isClosed: cleanIsClosed,
          createdBy: req.user?._id || null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    recordSyncEvent('closure', { date: cleanDate }, req.headers['x-tab-session-id']);

    return res.status(201).json({
      status: 'success',
      message: 'Gym closure scheduled successfully.',
      data: closure,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/closures/:id - Edit an existing closure
router.put('/closures/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, reason, announcement, isClosed } = req.body;

    const updateFields = {};
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date).trim())) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid date in YYYY-MM-DD format is required.',
        });
      }
      updateFields.date = String(date).trim();
    }
    if (reason !== undefined) {
      if (!String(reason).trim()) {
        return res.status(400).json({
          status: 'error',
          message: 'Closure reason cannot be empty.',
        });
      }
      updateFields.reason = String(reason).trim();
    }
    if (announcement !== undefined) {
      updateFields.announcement = String(announcement).trim();
    }
    if (isClosed !== undefined) {
      updateFields.isClosed = Boolean(isClosed);
    }

    const updated = await GymClosure.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        status: 'error',
        message: 'Closure not found.',
      });
    }

    recordSyncEvent('closure', { date: updated.date }, req.headers['x-tab-session-id']);

    return res.status(200).json({
      status: 'success',
      message: 'Gym closure updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/closures/:id - Cancel/Delete a closure
router.delete('/closures/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await GymClosure.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: 'Closure not found.',
      });
    }

    recordSyncEvent('closure', {}, req.headers['x-tab-session-id']);

    return res.status(200).json({
      status: 'success',
      message: 'Gym closure cancelled successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Admin Membership Plans Management
// 1. GET /api/admin/plans - List all plans
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await MembershipPlan.find().sort({ durationMonths: 1, createdAt: 1 });
    return res.status(200).json({
      status: 'success',
      count: plans.length,
      data: plans,
    });
  } catch (err) {
    next(err);
  }
});

// 2. POST /api/admin/plans - Create a new plan
router.post('/plans', async (req, res, next) => {
  try {
    const { name, durationMonths, price, description, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Plan name is required.',
      });
    }
    const duration = Number(durationMonths);
    if (isNaN(duration) || duration < 1) {
      return res.status(400).json({
        status: 'error',
        message: 'Duration must be at least 1 month.',
      });
    }
    const cost = Number(price);
    if (isNaN(cost) || cost < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid price (INR) is required.',
      });
    }

    const plan = await MembershipPlan.create({
      name: name.trim(),
      durationMonths: duration,
      price: cost,
      description: typeof description === 'string' ? description.trim() : '',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    recordSyncEvent('membershipPlans', { planId: plan._id }, req.headers['x-tab-session-id']);

    return res.status(201).json({
      status: 'success',
      message: 'Membership plan created successfully.',
      data: plan,
    });
  } catch (err) {
    next(err);
  }
});

// 3. PUT /api/admin/plans/:planId - Edit plan
router.put('/plans/:planId', async (req, res, next) => {
  try {
    const { planId } = req.params;
    const { name, durationMonths, price, description, isActive } = req.body;

    const plan = await MembershipPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        status: 'error',
        message: 'Membership plan not found.',
      });
    }

    if (name && name.trim()) plan.name = name.trim();
    if (durationMonths !== undefined) {
      const d = Number(durationMonths);
      if (!isNaN(d) && d >= 1) plan.durationMonths = d;
    }
    if (price !== undefined) {
      const p = Number(price);
      if (!isNaN(p) && p >= 0) plan.price = p;
    }
    if (description !== undefined) {
      plan.description = String(description).trim();
    }
    if (isActive !== undefined) {
      plan.isActive = Boolean(isActive);
    }

    await plan.save();

    recordSyncEvent('membershipPlans', { planId: plan._id }, req.headers['x-tab-session-id']);

    return res.status(200).json({
      status: 'success',
      message: 'Membership plan updated successfully.',
      data: plan,
    });
  } catch (err) {
    next(err);
  }
});

// 4. PATCH /api/admin/plans/:planId/toggle-status - Toggle active/inactive
router.patch('/plans/:planId/toggle-status', async (req, res, next) => {
  try {
    const { planId } = req.params;
    const plan = await MembershipPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        status: 'error',
        message: 'Membership plan not found.',
      });
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    recordSyncEvent('membershipPlans', { planId: plan._id }, req.headers['x-tab-session-id']);

    return res.status(200).json({
      status: 'success',
      message: `Plan ${plan.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: plan,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
