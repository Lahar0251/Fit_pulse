import GymSchedule, { ALL_DAYS, getDefaultDailyHours } from '../models/gymSchedule.model.js';
import GymClosure from '../models/gymClosure.model.js';
import { getKolkataDateInfo, computeGymOperatingStatus } from '../utils/time.utils.js';

/**
 * Returns today's live gym operating status in Asia/Kolkata
 * Validates against both GymSchedule and date-specific GymClosure
 * @param {Date} [date=new Date()]
 * @returns {Promise<object>}
 */
export const getTodayGymStatus = async (date = new Date()) => {
  const dateObj = date instanceof Date && !isNaN(date.getTime()) ? date : new Date(date);
  const effectiveDate = !isNaN(dateObj.getTime()) ? dateObj : new Date();
  const { dateKey } = getKolkataDateInfo(effectiveDate);

  // Exact calendar tomorrow in Asia/Kolkata
  const [y, m, d] = dateKey.split('-').map(Number);
  const tomorrowDateObj = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
  const tomorrowInfo = getKolkataDateInfo(tomorrowDateObj);
  const tomorrowDateKey = tomorrowInfo.dateKey;

  // Performance rule: Fetch schedule, today's closure, tomorrow's closure, and next upcoming closures using index
  const [schedule, todayClosure, tomorrowClosure, upcomingClosures] = await Promise.all([
    GymSchedule.findOne().lean(),
    GymClosure.findOne({ date: dateKey, isClosed: true }).lean(),
    GymClosure.findOne({ date: tomorrowDateKey, isClosed: true }).lean(),
    GymClosure.find({ date: { $gt: dateKey }, isClosed: true })
      .sort({ date: 1 })
      .limit(5)
      .lean(),
  ]);

  const baseStatus = computeGymOperatingStatus({
    schedule: schedule || {
      openDays: ALL_DAYS,
      closedDays: [],
      openingTime: '06:00 AM',
      closingTime: '10:00 PM',
      dailyHours: getDefaultDailyHours(),
    },
    closure: todayClosure,
    date: effectiveDate,
  });

  const nextUpcoming = upcomingClosures && upcomingClosures.length > 0 ? upcomingClosures[0] : null;
  let nextUpcomingFormatted = null;
  if (nextUpcoming) {
    const [ny, nm, nd] = nextUpcoming.date.split('-').map(Number);
    const diffDays = Math.round((Date.UTC(ny, nm - 1, nd) - Date.UTC(y, m - 1, d)) / (24 * 60 * 60 * 1000));
    nextUpcomingFormatted = {
      id: nextUpcoming._id,
      _id: nextUpcoming._id,
      date: nextUpcoming.date,
      reason: nextUpcoming.reason,
      announcement: nextUpcoming.announcement || '',
      daysUntil: diffDays,
      isTomorrow: diffDays === 1,
    };
  }

  const upcomingList = (upcomingClosures || []).map((c) => {
    const [cy, cm, cd] = c.date.split('-').map(Number);
    const diffDays = Math.round((Date.UTC(cy, cm - 1, cd) - Date.UTC(y, m - 1, d)) / (24 * 60 * 60 * 1000));
    return {
      id: c._id,
      _id: c._id,
      date: c.date,
      reason: c.reason,
      announcement: c.announcement || '',
      daysUntil: diffDays,
      isTomorrow: diffDays === 1,
    };
  });

  return {
    ...baseStatus,
    todayClosure: todayClosure
      ? {
          id: todayClosure._id,
          date: todayClosure.date,
          reason: todayClosure.reason,
          announcement: todayClosure.announcement || '',
        }
      : null,
    hasTomorrowClosure: Boolean(tomorrowClosure),
    tomorrowClosure: tomorrowClosure
      ? {
          id: tomorrowClosure._id,
          date: tomorrowClosure.date,
          reason: tomorrowClosure.reason,
          announcement: tomorrowClosure.announcement || '',
          message: `The gym will be closed tomorrow due to ${tomorrowClosure.reason || 'a scheduled closure'}.`,
        }
      : null,
    nextUpcomingClosure: nextUpcomingFormatted,
    upcomingClosures: upcomingList,
  };
};
