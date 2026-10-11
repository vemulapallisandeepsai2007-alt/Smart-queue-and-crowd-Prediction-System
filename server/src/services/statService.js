const cron = require('node-cron');
const QueueStat = require('../models/QueueStat');
const Department = require('../models/Department');
const Token = require('../models/Token');
const Settings = require('../models/Settings');
const { getIO } = require('./socketService');

function getTodayDateStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Record or update an hourly queue snapshot for a specific department
 */
async function recordDepartmentSnapshot(departmentId, dateStr = null) {
  try {
    const date = dateStr || getTodayDateStr();
    const now = new Date();
    const hour = now.getHours();

    const [waitingCount, completedCount, cancelledCount] = await Promise.all([
      Token.countDocuments({ department: departmentId, date, status: 'booked' }),
      Token.countDocuments({ department: departmentId, date, status: 'completed' }),
      Token.countDocuments({ department: departmentId, date, status: 'cancelled' }),
    ]);

    const bookedCount = waitingCount + completedCount + cancelledCount;

    // Upsert into QueueStat
    await QueueStat.findOneAndUpdate(
      { department: departmentId, date, hour },
      {
        bookedCount,
        waitingCount,
        completedCount,
        cancelledCount,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Check alert threshold against settings
    const settings = await Settings.getGlobalSettings();
    if (waitingCount >= settings.crowdAlertThreshold) {
      const dept = await Department.findById(departmentId).populate('place', 'name');
      const deptName = dept?.name || 'Department';
      const placeName = dept?.place?.name || 'Facility';

      const io = getIO();
      if (io) {
        io.to('admin').emit('crowd:alert', {
          departmentId,
          departmentName: deptName,
          placeName,
          waitingCount,
          threshold: settings.crowdAlertThreshold,
          recommendation: `Open another counter at ${deptName} (${placeName})`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Notify admin clients to refresh summary stats live
    const io = getIO();
    if (io) {
      io.to('admin').emit('admin:statsUpdated', {
        departmentId,
        date,
        hour,
        waitingCount,
        completedCount,
        cancelledCount,
      });
    }
  } catch (err) {
    console.error(`[StatService] Error recording snapshot for dept ${departmentId}:`, err.message);
  }
}

/**
 * Take snapshots across all active departments
 */
async function recordAllDepartmentsSnapshot() {
  try {
    const today = getTodayDateStr();
    const departments = await Department.find({}, '_id');
    for (const dept of departments) {
      await recordDepartmentSnapshot(dept._id, today);
    }
    console.log(`[StatService] Recorded hourly snapshots for ${departments.length} departments.`);
  } catch (err) {
    console.error('[StatService] Error running full snapshot:', err.message);
  }
}

/**
 * Initialize hourly cron job: runs at minute 0 of every hour ('0 * * * *')
 */
function initSnapshotCron() {
  // Run on startup
  recordAllDepartmentsSnapshot();

  // Hourly cron schedule
  cron.schedule('0 * * * *', () => {
    console.log('[StatService] Cron triggered: recording hourly department snapshots...');
    recordAllDepartmentsSnapshot();
  });

  console.log('⏰ Hourly QueueStat cron snapshot scheduler initialized.');
}

module.exports = {
  recordDepartmentSnapshot,
  recordAllDepartmentsSnapshot,
  initSnapshotCron,
  getTodayDateStr,
};
