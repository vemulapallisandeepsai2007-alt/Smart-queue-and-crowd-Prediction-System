const ActivityLog = require('../models/ActivityLog');

/**
 * Log an activity event asynchronously without throwing errors
 */
async function logActivity({ place, department, type, description, metadata = {} }) {
  try {
    if (!place) return null;
    return await ActivityLog.create({
      place,
      department,
      type,
      description,
      metadata,
    });
  } catch (err) {
    console.warn('[ActivityLog] Failed to record activity log:', err.message);
    return null;
  }
}

module.exports = {
  logActivity,
};
