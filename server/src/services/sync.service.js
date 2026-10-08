/**
 * Sync Service - Shared Database Change Tracker
 * Tracks lightweight versioning across sessions so other open tabs can be notified
 * without polling entire collections or exposing private data.
 */

let globalSyncVersion = 1;
const recentEvents = [];

/**
 * Records a database modification event
 * @param {string} category - 'schedule' | 'closure' | 'membershipPlans' | 'userMembership' | 'trainerAssignment' | 'workoutPlan' | 'userData'
 * @param {object} [metadata={}] - targeted IDs such as memberId, trainerId, targetUserId
 * @param {string|null} [initiatorTabId=null] - client tab that triggered the change
 * @returns {object} recorded event
 */
export const recordSyncEvent = (category, metadata = {}, initiatorTabId = null) => {
  globalSyncVersion += 1;
  const event = {
    version: globalSyncVersion,
    category,
    metadata,
    initiatorTabId: initiatorTabId || null,
    timestamp: Date.now(),
  };

  recentEvents.push(event);
  if (recentEvents.length > 250) {
    recentEvents.shift();
  }

  return event;
};

/**
 * Checks if there are relevant updates for the authenticated user since clientVersion
 * @param {object} user - Authenticated user object
 * @param {number} [clientVersion=0] - Client's last acknowledged sync version
 * @param {string|null} [clientTabId=null] - Tab identifier making the check
 * @returns {{ hasChanges: boolean, latestVersion: number }}
 */
export const checkUserChanges = (user, clientVersion = 0, clientTabId = null) => {
  const parsedClientVer = parseInt(clientVersion, 10) || 0;

  // Initial tab hydration: return current version without flagging changes
  if (parsedClientVer <= 0) {
    return {
      hasChanges: false,
      latestVersion: globalSyncVersion,
    };
  }

  if (parsedClientVer >= globalSyncVersion) {
    return {
      hasChanges: false,
      latestVersion: globalSyncVersion,
    };
  }

  const userIdStr = user?._id ? String(user._id) : (user?.id ? String(user.id) : null);
  const userRole = user?.role || 'member';

  const newEvents = recentEvents.filter((e) => e.version > parsedClientVer);

  let hasRelevantChange = false;

  for (const event of newEvents) {
    // PART 11: No Self-Notification
    // If this tab initiated the event, skip it
    if (clientTabId && event.initiatorTabId && event.initiatorTabId === clientTabId) {
      continue;
    }

    // PART 10 & 13: User-Aware Role and Scope Filtering
    if (userRole === 'member') {
      if (
        event.category === 'schedule' ||
        event.category === 'closure' ||
        event.category === 'membershipPlans'
      ) {
        hasRelevantChange = true;
        break;
      }
      if (event.category === 'userMembership') {
        if (!event.metadata.targetUserId || String(event.metadata.targetUserId) === userIdStr) {
          hasRelevantChange = true;
          break;
        }
      }
      if (event.category === 'trainerAssignment') {
        if (event.metadata.memberId && String(event.metadata.memberId) === userIdStr) {
          hasRelevantChange = true;
          break;
        }
      }
      if (event.category === 'workoutPlan') {
        if (event.metadata.memberId && String(event.metadata.memberId) === userIdStr) {
          hasRelevantChange = true;
          break;
        }
      }
      if (event.category === 'userData') {
        if (event.metadata.userId && String(event.metadata.userId) === userIdStr) {
          hasRelevantChange = true;
          break;
        }
      }
    } else if (userRole === 'trainer') {
      if (event.category === 'schedule' || event.category === 'closure') {
        hasRelevantChange = true;
        break;
      }
      if (event.category === 'trainerAssignment') {
        // Relevant if this trainer was assigned or unassigned
        if (
          !event.metadata.trainerId ||
          String(event.metadata.trainerId) === userIdStr ||
          (event.metadata.previousTrainerId && String(event.metadata.previousTrainerId) === userIdStr)
        ) {
          hasRelevantChange = true;
          break;
        }
      }
      if (event.category === 'workoutPlan') {
        if (!event.metadata.trainerId || String(event.metadata.trainerId) === userIdStr) {
          hasRelevantChange = true;
          break;
        }
      }
    } else if (userRole === 'admin') {
      // Admins are responsible for all system facilities, users, plans, and schedules
      if (
        event.category === 'schedule' ||
        event.category === 'closure' ||
        event.category === 'membershipPlans' ||
        event.category === 'userMembership' ||
        event.category === 'trainerAssignment' ||
        event.category === 'userData'
      ) {
        hasRelevantChange = true;
        break;
      }
    }
  }

  return {
    hasChanges: hasRelevantChange,
    latestVersion: globalSyncVersion,
  };
};
