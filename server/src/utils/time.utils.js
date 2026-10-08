/**
 * Time and Schedule Utilities
 * Standard application timezone: Asia/Kolkata
 */

const APPLICATION_TIMEZONE = 'Asia/Kolkata';



/**
 * Returns date and time breakdown for a given Date in Asia/Kolkata
 * @param {Date|string|number} [date=new Date()]
 * @returns {{ dateKey: string, dayOfWeek: string, hours: number, minutes: number, currentMinutes: number, timeString: string }}
 */
export const getKolkataDateInfo = (date = new Date()) => {
  const parsedDate = date instanceof Date ? date : new Date(date);
  const d = !isNaN(parsedDate.getTime()) ? parsedDate : new Date();

  // Use Intl.DateTimeFormat for robust Asia/Kolkata timezone resolution
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APPLICATION_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const partMap = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const dateKey = `${partMap.year}-${partMap.month}-${partMap.day}`;
  const dayOfWeek = partMap.weekday; // e.g. "Thursday"
  const hours = parseInt(partMap.hour, 10) % 24;
  const minutes = parseInt(partMap.minute, 10);
  const currentMinutes = hours * 60 + minutes;

  return {
    dateKey,
    dayOfWeek,
    hours,
    minutes,
    currentMinutes,
    timeString: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
  };
};

/**
 * Parses time string into minutes from midnight (0 - 1439).
 * Supports:
 * - 12-hour format: "12:20 AM", "00:20 AM", "0:20 AM", "6:00 AM", "10:00 PM", "10:00PM"
 * - 24-hour format: "00:20", "0:20", "22:00", "06:00", "00:00", "23:59"
 * - with optional seconds: "00:20:00", "10:00:00 PM"
 * @param {string} timeStr
 * @returns {number|null}
 */
export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const trimmed = timeStr.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const meridian = match[3] ? match[3].toUpperCase() : null;

  if (isNaN(hours) || isNaN(mins) || mins < 0 || mins > 59) return null;

  if (meridian) {
    if (meridian === 'AM') {
      // Midnight representations: 12:xx AM or 00:xx AM / 0:xx AM are all 00:xx
      if (hours === 12 || hours === 0) {
        hours = 0;
      } else if (hours < 1 || hours > 11) {
        return null;
      }
    } else if (meridian === 'PM') {
      // Noon / afternoon representations: 12:xx PM or 00:xx PM are 12:xx
      if (hours === 12 || hours === 0) {
        hours = 12;
      } else if (hours >= 1 && hours <= 11) {
        hours += 12;
      } else {
        return null;
      }
    }
  } else {
    // 24-hour format
    if (hours < 0 || hours > 23) return null;
  }

  return hours * 60 + mins;
};



/**
 * Determines real-time operating status based on today's schedule, active closure, and current Asia/Kolkata time
 * @param {object} params
 * @param {object} params.schedule - GymSchedule object
 * @param {object|null} params.closure - Active GymClosure object for today
 * @param {Date|string|number} [params.date=new Date()]
 * @returns {object} status details
 */
export const computeGymOperatingStatus = ({ schedule, closure, date = new Date() }) => {
  const { dateKey, dayOfWeek, currentMinutes } = getKolkataDateInfo(date);

  // 1. Specific-date closure has highest priority (PART 9: Closure overrides hours)
  if (closure && closure.isClosed) {
    return {
      isOpen: false,
      status: 'CLOSED',
      today: dayOfWeek,
      dayOfWeek,
      todayDate: dateKey,
      isClosure: true,
      closureId: closure._id || null,
      reason: closure.reason || 'Gym Closed Today',
      announcement: closure.announcement || '',
      openingTime: null,
      closingTime: null,
      isClosedBySchedule: false,
      isClosedByClosure: true,
      message: `The gym is closed today due to ${closure.reason || 'a scheduled closure'}. Normal gym timings resume tomorrow.`,
    };
  }

  // 2. Resolve operating hours for today from dailyHours
  let todayHours = null;
  if (schedule && Array.isArray(schedule.dailyHours) && schedule.dailyHours.length > 0) {
    todayHours = schedule.dailyHours.find(
      (d) => d.day && d.day.toLowerCase() === dayOfWeek.toLowerCase()
    );
  }

  const openingTime = (todayHours?.openingTime || schedule?.openingTime || '06:00 AM').trim();
  const closingTime = (todayHours?.closingTime || schedule?.closingTime || '10:00 PM').trim();

  const openMinutes = parseTimeToMinutes(openingTime);
  const closeMinutes = parseTimeToMinutes(closingTime);

  // Default fallback if time parsing fails: 06:00 AM (360) -> 10:00 PM (1320)
  const safeOpenMins = openMinutes !== null ? openMinutes : 360;
  const safeCloseMins = closeMinutes !== null ? closeMinutes : 1320;

  // Operating status calculation:
  // Treat closing time as exclusive (PART 24):
  // At closingTime -> CLOSED
  let isOpen = false;
  let reason = null;

  if (safeCloseMins > safeOpenMins) {
    // Normal same-day operating hours
    if (currentMinutes < safeOpenMins) {
      isOpen = false;
      reason = 'Gym not yet open for today';
    } else if (currentMinutes >= safeCloseMins) {
      isOpen = false;
      reason = 'Gym closed for today';
    } else {
      isOpen = true;
      reason = null;
    }
  } else {
    // Overnight operating hours (e.g. 22:00 to 02:00)
    if (currentMinutes >= safeOpenMins || currentMinutes < safeCloseMins) {
      isOpen = true;
      reason = null;
    } else {
      isOpen = false;
      reason = 'Gym closed for today';
    }
  }

  return {
    isOpen,
    status: isOpen ? 'OPEN' : 'CLOSED',
    today: dayOfWeek,
    dayOfWeek,
    todayDate: dateKey,
    isClosure: false,
    closureId: null,
    reason,
    announcement: '',
    openingTime,
    closingTime,
    isClosedBySchedule: !isOpen,
    isClosedByClosure: false,
    message: isOpen
      ? `Gym is currently open. Today's hours: ${openingTime} – ${closingTime}.`
      : `Gym is currently closed. Today's hours: ${openingTime} – ${closingTime}.`,
  };
};

/**
 * Returns exact UTC Date object representing the closing time on dateKey in Asia/Kolkata timezone
 * @param {string} dateKey - "YYYY-MM-DD"
 * @param {string} [closingTimeStr="10:00 PM"]
 * @returns {Date}
 */
export const getKolkataClosingDate = (dateKey, closingTimeStr = '10:00 PM') => {
  if (!dateKey) return new Date();
  const [y, m, d] = dateKey.split('-').map(Number);
  const closeMins = parseTimeToMinutes(closingTimeStr) ?? 1320;
  // Asia/Kolkata is UTC+5:30 (330 minutes ahead of UTC).
  // Therefore, UTC minutes from midnight = closeMins - 330.
  return new Date(Date.UTC(y, m - 1, d, 0, closeMins - 330, 0, 0));
};

