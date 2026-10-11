const mongoose = require('mongoose');
const Token = require('../models/Token');
const Department = require('../models/Department');
const Staff = require('../models/Staff');
const User = require('../models/User');
const { calculateAgeFromDOB } = require('../models/User');
const {
  emitTokenUpdated,
  emitNowServing,
  emitCounterPaused,
} = require('../services/socketService');
const { recordDepartmentSnapshot } = require('../services/statService');
const { logActivity } = require('../services/activityService');
const {
  parseTimeToMinutes,
  formatMinutesTo12Hour,
  formatMinutesToClockTime,
  getKolkataTime,
  getCurrentBreakStatus,
  enrichTokensWithEstimates,
} = require('../services/estimateService');

/**
 * Helper to get today's date formatted as YYYY-MM-DD in Asia/Kolkata local time
 */
function getTodayDateStr() {
  return getKolkataTime(new Date()).dateStr;
}

/**
 * Determine slot from token number (1-25 Morning, 26-50 Afternoon, 51-75 Evening)
 */
function getSlotForTokenNumber(num) {
  if (num <= 25) return 'Morning';
  if (num <= 50) return 'Afternoon';
  return 'Evening';
}

/**
 * Compute token queue position and estimated time using centralized service
 */
function computeTokenEstimate(token, slot, department, tokensInSlot, isToday) {
  const enriched = enrichTokensWithEstimates(
    tokensInSlot,
    department,
    token.date || getTodayDateStr(),
    new Date()
  );
  const match = enriched.find((t) => t.number === token.number);
  return {
    peopleAhead: match?.peopleAhead ?? 0,
    estimatedMinutes: match?.estimatedMinutes ?? 0,
    estimatedClockTime: match?.estimatedClockTime ?? '~9:00 AM',
    estimatedTime: match?.estimatedTime,
    estimatedLabel: match?.estimatedLabel,
    mayOverflow: Boolean(match?.mayOverflow),
  };
}

/**
 * Verify that a staff user is approved and assigned to the hospital/bank of the specified department.
 * Returns 403 Forbidden if not authorized for this place.
 */
async function verifyStaffAssignment(userId, targetDepartmentId) {
  const staff = await Staff.findById(userId);
  if (!staff || staff.status !== 'approved') {
    return {
      allowed: false,
      status: 403,
      message: 'Forbidden: Account is not an approved staff member.',
    };
  }

  const department = await Department.findById(targetDepartmentId);
  if (!department) {
    return {
      allowed: false,
      status: 404,
      message: 'Department not found.',
    };
  }

  const staffPlaceId = staff.place ? staff.place.toString() : null;
  const deptPlaceId = department.place ? department.place.toString() : null;

  if (!staffPlaceId || staffPlaceId !== deptPlaceId) {
    return {
      allowed: false,
      status: 403,
      message: 'Forbidden: You are only authorized to manage tokens in your assigned hospital/bank facility.',
      staff,
    };
  }

  return { allowed: true, staff, department };
}

/**
 * Auto-update department.avgServiceMinutes from the average of the last 50 completed tokens
 */
async function updateDepartmentAvgServiceMinutes(departmentId) {
  try {
    const lastCompleted = await Token.find({
      department: departmentId,
      status: 'completed',
      completedAt: { $ne: null },
      calledAt: { $ne: null },
    })
      .sort({ completedAt: -1 })
      .limit(50);

    if (lastCompleted.length > 0) {
      let totalMinutes = 0;
      let validCount = 0;

      for (const t of lastCompleted) {
        const diffMs = new Date(t.completedAt).getTime() - new Date(t.calledAt).getTime();
        const minutes = diffMs / 60000;
        if (minutes > 0 && minutes < 300) {
          totalMinutes += minutes;
          validCount++;
        }
      }

      if (validCount > 0) {
        const avg = Math.max(1, Math.round(totalMinutes / validCount));
        await Department.findByIdAndUpdate(departmentId, { avgServiceMinutes: avg });
      }
    }
  } catch (err) {
    console.error('Error updating avgServiceMinutes:', err.message);
  }
}

/**
 * GET /api/departments/:id/tokens?date=&slot=
 * Returns tokens for one slot (or all), plus slot summaries and current break status.
 */
const getDepartmentTokens = async (req, res) => {
  try {
    const { id: departmentId } = req.params;
    const date = req.query.date || getTodayDateStr();
    const requestedSlot = req.query.slot || null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Expected YYYY-MM-DD.',
      });
    }

    const department = await Department.findById(departmentId).populate('place');
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found.',
      });
    }

    let isApprovedStaffOfThisPlace = false;

    // Staff access control: staff can only view tokens for departments of their place
    if (req.user && req.user.role === 'staff') {
      const staff = await Staff.findById(req.user.id);
      if (!staff || staff.status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Account is not an approved staff member.',
        });
      }
      const staffPlaceId = staff.place ? staff.place.toString() : null;
      const deptPlaceId = department.place?._id
        ? department.place._id.toString()
        : department.place?.toString();

      if (!staffPlaceId || staffPlaceId !== deptPlaceId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are only authorized to view tokens for your assigned facility.',
        });
      }
      isApprovedStaffOfThisPlace = true;
    }

    // 1. Fetch existing tokens
    let tokens = await Token.find({ department: departmentId, date })
      .populate('user', 'name phone')
      .populate('bookedByStaff', 'name staffId')
      .sort({ number: 1 });

    // 2. Lazily create exactly 75 tokens if fewer than 75 exist
    if (tokens.length < 75) {
      const existingNumbers = new Set(tokens.map((t) => t.number));
      const toInsert = [];

      for (let i = 1; i <= 75; i++) {
        if (!existingNumbers.has(i)) {
          toInsert.push({
            department: departmentId,
            date,
            number: i,
            slot: getSlotForTokenNumber(i),
            status: 'available',
          });
        }
      }

      if (toInsert.length > 0) {
        try {
          await Token.insertMany(toInsert, { ordered: false });
        } catch (insertErr) {
          // Ignore duplicate key race conditions
        }
      }

      tokens = await Token.find({ department: departmentId, date })
        .populate('user', 'name phone')
        .populate('bookedByStaff', 'name staffId')
        .sort({ number: 1 });
    }

    // 3. Migrate any unslotted tokens
    const unslotted = tokens.filter((t) => !t.slot);
    if (unslotted.length > 0) {
      await Promise.all(
        unslotted.map((t) => {
          t.slot = getSlotForTokenNumber(t.number);
          return t.save();
        })
      );
      tokens = await Token.find({ department: departmentId, date })
        .populate('user', 'name phone')
        .populate('bookedByStaff', 'name staffId')
        .sort({ number: 1 });
    }

    // 4. Slots & Breaks Configuration
    const deptSlots =
      department.slots && department.slots.length > 0
        ? department.slots
        : [
            { name: 'Morning', startTime: '09:00', endTime: '12:30', tokenFrom: 1, tokenTo: 25 },
            { name: 'Afternoon', startTime: '14:00', endTime: '17:00', tokenFrom: 26, tokenTo: 50 },
            { name: 'Evening', startTime: '17:30', endTime: '20:30', tokenFrom: 51, tokenTo: 75 },
          ];

    const deptBreaks =
      department.breaks && department.breaks.length > 0
        ? department.breaks
        : [
            { label: 'Lunch', startTime: '12:30', endTime: '14:00' },
            { label: 'Tea', startTime: '17:00', endTime: '17:30' },
          ];

    const isToday = date === getTodayDateStr();
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // 5. Calculate slot summaries
    const slotSummaries = deptSlots.map((s) => {
      const sTokens = tokens.filter((t) => t.slot === s.name);
      const available = sTokens.filter((t) => t.status === 'available').length;
      const booked = sTokens.filter((t) => t.status === 'booked').length;
      const completed = sTokens.filter((t) => t.status === 'completed').length;
      const cancelled = sTokens.filter((t) => t.status === 'cancelled').length;
      const skipped = sTokens.filter((t) => t.status === 'skipped').length;
      const walkIns = sTokens.filter((t) => t.walkIn).length;

      const sEndMinutes = parseTimeToMinutes(s.endTime);
      const sStartMinutes = parseTimeToMinutes(s.startTime);
      let isEnded = false;
      let isCurrent = false;

      if (isToday) {
        isEnded = nowMinutes >= sEndMinutes;
        isCurrent = nowMinutes >= sStartMinutes && nowMinutes < sEndMinutes;
      } else if (date < getTodayDateStr()) {
        isEnded = true;
      }

      const status = isEnded ? 'Ended' : available === 0 ? 'Full' : 'Open';

      return {
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        tokenFrom: s.tokenFrom,
        tokenTo: s.tokenTo,
        available,
        booked,
        completed,
        cancelled,
        skipped,
        walkIns,
        total: sTokens.length,
        status, // 'Open' | 'Full' | 'Ended'
        isEnded,
        isCurrent,
      };
    });

    // 6. Current break status
    const serverNow = new Date();
    const currentBreak = getCurrentBreakStatus(department, isToday, serverNow);

    // 7. Enrich each token with peopleAhead and live estimated time
    const currentUserId = req.user?.id ? req.user.id.toString() : null;

    const baseEnriched = enrichTokensWithEstimates(tokens, department, date, serverNow);

    const enrichedTokens = baseEnriched.map((t) => {
      const tokenObj = { ...t };

      const isMyToken =
        currentUserId &&
        t.user &&
        (t.user._id ? t.user._id.toString() : t.user.toString()) === currentUserId;

      // Privacy rules:
      // Staff view: Include short patient name and age on booked, completed, and skipped tokens. Never include phone numbers.
      // User view: Do NOT include other people's patient details. Users see only their own.
      if (isApprovedStaffOfThisPlace) {
        if (['booked', 'completed', 'skipped'].includes(t.status)) {
          const shortName =
            t.patient?.name || (t.walkIn ? t.walkInPatient?.name : t.user?.name) || 'Patient';
          const patientAge =
            t.patient?.age ??
            (t.walkIn ? t.walkInPatient?.age : t.user?.dob ? calculateAgeFromDOB(t.user.dob) : null);
          tokenObj.patientName = shortName;
          tokenObj.patientAge = patientAge;
          tokenObj.patient = { name: shortName, age: patientAge };
        } else {
          delete tokenObj.patient;
          delete tokenObj.patientName;
          delete tokenObj.patientAge;
        }
        delete tokenObj.user;
        if (tokenObj.walkInPatient) {
          delete tokenObj.walkInPatient.phone;
        }
      } else {
        if (isMyToken) {
          tokenObj.patient =
            t.patient ||
            (t.user
              ? {
                  name: t.user.name,
                  phone: t.user.phone,
                  age: t.user.age ?? calculateAgeFromDOB(t.user.dob),
                  gender: t.user.gender,
                }
              : null);
        } else {
          delete tokenObj.patient;
          delete tokenObj.walkInPatient;
          delete tokenObj.user;
          delete tokenObj.patientName;
          delete tokenObj.patientAge;
        }
      }

      return {
        ...tokenObj,
        slot: t.slot || getSlotForTokenNumber(t.number),
        isMyToken: Boolean(isMyToken),
      };
    });

    const userActiveToken = currentUserId
      ? enrichedTokens.find((t) => t.isMyToken && t.status === 'booked')
      : null;

    // Filter by slot if requested
    const filteredTokens = requestedSlot
      ? enrichedTokens.filter((t) => t.slot === requestedSlot)
      : enrichedTokens;

    return res.json({
      success: true,
      department,
      date,
      slot: requestedSlot,
      totalTokens: enrichedTokens.length,
      nowServingToken: department.nowServingToken,
      isPaused: department.isPaused || false,
      currentBreak,
      slotSummaries,
      breaks: deptBreaks,
      userHasActiveToken: Boolean(userActiveToken),
      userActiveTokenNumber: userActiveToken?.number || null,
      userActiveTokenSlot: userActiveToken?.slot || null,
      tokens: filteredTokens,
      allTokens: enrichedTokens,
      serverNow: serverNow.toISOString(),
    });
  } catch (error) {
    console.error('Error in getDepartmentTokens:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch department tokens.',
    });
  }
};

/**
 * POST /api/tokens/:id/book
 * Citizen booking: Atomic findOneAndUpdate with status 'available'.
 * Validates that slot has not already ended.
 */
const bookToken = async (req, res) => {
  try {
    const { id: tokenId } = req.params;
    const userId = req.user.id;

    const targetToken = await Token.findById(tokenId).populate('department');
    if (!targetToken) {
      return res.status(404).json({
        success: false,
        message: 'Token not found.',
      });
    }

    if (targetToken.status !== 'available') {
      return res.status(409).json({
        success: false,
        message: `Token #${targetToken.number} is already ${targetToken.status}. Please select another token.`,
      });
    }

    const todayStr = getTodayDateStr();

    // Prevent booking for past dates
    if (targetToken.date < todayStr) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book tokens for past dates.',
      });
    }

    // Prevent citizens from booking in a slot that has already ended
    if (targetToken.date === todayStr && targetToken.department) {
      const deptSlots = targetToken.department.slots || [
        { name: 'Morning', startTime: '09:00', endTime: '12:30', tokenFrom: 1, tokenTo: 25 },
        { name: 'Afternoon', startTime: '14:00', endTime: '17:00', tokenFrom: 26, tokenTo: 50 },
        { name: 'Evening', startTime: '17:30', endTime: '20:30', tokenFrom: 51, tokenTo: 75 },
      ];
      const slotObj = deptSlots.find((s) => s.name === targetToken.slot);
      if (slotObj) {
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const slotEndMinutes = parseTimeToMinutes(slotObj.endTime);
        if (nowMinutes >= slotEndMinutes) {
          return res.status(400).json({
            success: false,
            message: `The ${targetToken.slot} slot has already ended. Users cannot book tokens in an ended slot.`,
          });
        }
      }
    }

    // Enforce 1 active booked token per department per day
    const existingActiveToken = await Token.findOne({
      department: targetToken.department._id || targetToken.department,
      date: targetToken.date,
      user: userId,
      status: 'booked',
    });

    if (existingActiveToken) {
      return res.status(400).json({
        success: false,
        message: `You already hold active Token #${existingActiveToken.number} for this department today. You cannot book multiple tokens for the same department on the same day.`,
        activeToken: existingActiveToken,
      });
    }

    // Fetch user details for patient snapshot
    const userDoc = await User.findById(userId);
    if (!userDoc) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    const userAge =
      userDoc.age !== undefined && userDoc.age !== null
        ? userDoc.age
        : calculateAgeFromDOB(userDoc.dob);

    const patientSnapshot = {
      name: userDoc.name,
      phone: userDoc.phone,
      age: userAge,
      gender: userDoc.gender,
    };

    // Atomic race-safe reservation (available -> booked)
    const bookedToken = await Token.findOneAndUpdate(
      { _id: targetToken._id, status: 'available' },
      {
        $set: {
          status: 'booked',
          user: userId,
          patient: patientSnapshot,
          bookedAt: new Date(),
        },
      },
      { new: true }
    )
      .populate('user', 'name phone')
      .populate({
        path: 'department',
        populate: { path: 'place' },
      });

    if (!bookedToken) {
      return res.status(409).json({
        success: false,
        message: `Token #${targetToken.number} was just booked by another user. Please select an available slot.`,
      });
    }

    // Real-time Socket.IO emission
    emitTokenUpdated(bookedToken.department._id, bookedToken.date, bookedToken);
    recordDepartmentSnapshot(bookedToken.department._id, bookedToken.date);

    if (bookedToken.department?.place) {
      logActivity({
        place: bookedToken.department.place._id || bookedToken.department.place,
        department: bookedToken.department._id,
        type: 'booked',
        description: `Token #${bookedToken.number} (${bookedToken.slot}) booked by ${bookedToken.user?.name || 'Citizen'}`,
        metadata: { tokenNumber: bookedToken.number, citizenName: bookedToken.user?.name, slot: bookedToken.slot },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Token #${bookedToken.number} booked successfully!`,
      token: bookedToken,
    });
  } catch (error) {
    console.error('Error in bookToken:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to book token.',
    });
  }
};

/**
 * POST /api/tokens/:id/walkin
 * Staff action: atomically books an available token for a walk-in patient.
 * Body: { patientName, phone, age, gender } (patientName and phone required)
 * Allowed transition: available -> booked (with walkIn: true, bookedByStaff)
 */
const walkInToken = async (req, res) => {
  try {
    const { id: tokenId } = req.params;
    const staffUserId = req.user.id;
    const { patientName, phone, age, gender } = req.body;

    if (!patientName || !patientName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Patient name is required for walk-in booking.',
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Patient phone number is required for walk-in booking.',
      });
    }

    if (age === undefined || age === null || age === '' || isNaN(Number(age))) {
      return res.status(400).json({
        success: false,
        message: 'Patient age is required (0-120) for walk-in booking.',
      });
    }

    const numAge = Number(age);
    if (numAge < 0 || numAge > 120) {
      return res.status(400).json({
        success: false,
        message: 'Patient age must be between 0 and 120.',
      });
    }

    const targetToken = await Token.findById(tokenId);
    if (!targetToken) {
      return res.status(404).json({
        success: false,
        message: 'Token not found.',
      });
    }

    // Verify staff assignment to this department
    const authCheck = await verifyStaffAssignment(staffUserId, targetToken.department);
    if (!authCheck.allowed) {
      return res.status(authCheck.status).json({
        success: false,
        message: authCheck.message,
      });
    }

    if (targetToken.status !== 'available') {
      return res.status(409).json({
        success: false,
        message: `Token #${targetToken.number} is already ${targetToken.status}. Cannot book walk-in.`,
      });
    }

    const patientData = {
      name: patientName.trim(),
      phone: phone.trim(),
      age: numAge,
      gender: gender || '',
    };

    // Atomic race-safe booking (available -> booked)
    const bookedToken = await Token.findOneAndUpdate(
      { _id: targetToken._id, status: 'available' },
      {
        $set: {
          status: 'booked',
          walkIn: true,
          walkInPatient: patientData,
          patient: patientData,
          bookedByStaff: staffUserId,
          bookedAt: new Date(),
        },
      },
      { new: true }
    )
      .populate('bookedByStaff', 'name staffId')
      .populate({
        path: 'department',
        populate: { path: 'place' },
      });

    if (!bookedToken) {
      return res.status(409).json({
        success: false,
        message: `Token #${targetToken.number} was just booked by another user.`,
      });
    }

    // Socket.IO emission
    emitTokenUpdated(bookedToken.department._id, bookedToken.date, bookedToken);
    recordDepartmentSnapshot(bookedToken.department._id, bookedToken.date);

    if (bookedToken.department?.place) {
      logActivity({
        place: bookedToken.department.place._id || bookedToken.department.place,
        department: bookedToken.department._id,
        type: 'booked',
        description: `Walk-in Token #${bookedToken.number} (${bookedToken.slot}) booked for ${patientName.trim()}`,
        metadata: { tokenNumber: bookedToken.number, patientName: patientName.trim(), walkIn: true },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Walk-in Token #${bookedToken.number} booked successfully!`,
      token: bookedToken,
    });
  } catch (error) {
    console.error('Error in walkInToken:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to book walk-in token.',
    });
  }
};

/**
 * POST /api/tokens/:id/skip
 * Staff action: marks a booked token as skipped (booked -> skipped).
 * Sets skippedAt and optional reason. The tile turns amber.
 */
const skipToken = async (req, res) => {
  try {
    const { id: tokenId } = req.params;
    const staffUserId = req.user.id;
    const { reason } = req.body;

    const token = await Token.findById(tokenId).populate('department');
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found.',
      });
    }

    // Verify staff assignment
    const authCheck = await verifyStaffAssignment(staffUserId, token.department._id);
    if (!authCheck.allowed) {
      return res.status(authCheck.status).json({
        success: false,
        message: authCheck.message,
      });
    }

    // State transition rule: ONLY booked tokens can be skipped
    if (token.status !== 'booked') {
      return res.status(400).json({
        success: false,
        message: `Cannot skip token with status '${token.status}'. Only booked tokens can be skipped.`,
      });
    }

    token.status = 'skipped';
    token.skippedAt = new Date();
    token.skipReason = reason?.trim() || 'Patient not present at counter';
    await token.save();

    const populated = await Token.findById(token._id)
      .populate('user', 'name phone')
      .populate({
        path: 'department',
        populate: { path: 'place' },
      });

    // Real-time Socket.IO emission
    emitTokenUpdated(token.department._id, token.date, populated);
    recordDepartmentSnapshot(token.department._id, token.date);

    if (token.department?.place) {
      logActivity({
        place: token.department.place._id || token.department.place,
        department: token.department._id,
        type: 'skipped',
        description: `Token #${token.number} was skipped by counter staff`,
        metadata: { tokenNumber: token.number, reason: token.skipReason },
      });
    }

    return res.json({
      success: true,
      message: `Token #${token.number} has been skipped.`,
      token: populated,
    });
  } catch (error) {
    console.error('Error in skipToken:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to skip token.',
    });
  }
};

/**
 * POST /api/tokens/:id/recall
 * Staff action: returns a skipped token back to the queue (skipped -> booked).
 * Skipped tokens are never reassigned to someone else.
 */
const recallToken = async (req, res) => {
  try {
    const { id: tokenId } = req.params;
    const staffUserId = req.user.id;

    const token = await Token.findById(tokenId).populate('department');
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found.',
      });
    }

    // Verify staff assignment
    const authCheck = await verifyStaffAssignment(staffUserId, token.department._id);
    if (!authCheck.allowed) {
      return res.status(authCheck.status).json({
        success: false,
        message: authCheck.message,
      });
    }

    // State transition rule: ONLY skipped tokens can be recalled
    if (token.status !== 'skipped') {
      return res.status(400).json({
        success: false,
        message: `Cannot recall token with status '${token.status}'. Only skipped tokens can be recalled.`,
      });
    }

    token.status = 'booked';
    token.skippedAt = null;
    token.skipReason = null;
    await token.save();

    const populated = await Token.findById(token._id)
      .populate('user', 'name phone')
      .populate({
        path: 'department',
        populate: { path: 'place' },
      });

    // Real-time Socket.IO emission
    emitTokenUpdated(token.department._id, token.date, populated);
    recordDepartmentSnapshot(token.department._id, token.date);

    if (token.department?.place) {
      logActivity({
        place: token.department.place._id || token.department.place,
        department: token.department._id,
        type: 'recalled',
        description: `Token #${token.number} was recalled back to active queue`,
        metadata: { tokenNumber: token.number },
      });
    }

    return res.json({
      success: true,
      message: `Token #${token.number} recalled back to active queue!`,
      token: populated,
    });
  } catch (error) {
    console.error('Error in recallToken:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to recall token.',
    });
  }
};

/**
 * POST /api/tokens/:id/cancel
 * Allowed transitions: booked -> cancelled, skipped -> cancelled.
 * Can be called by:
 * 1. Token owner (citizen user, if status === 'booked')
 * 2. Assigned staff member (if status === 'booked' or 'skipped')
 */
const cancelToken = async (req, res) => {
  try {
    const { id: tokenId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const token = await Token.findById(tokenId).populate({
      path: 'department',
      populate: { path: 'place' },
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found.',
      });
    }

    // Allowed source states: 'booked' or 'skipped'
    if (token.status !== 'booked' && token.status !== 'skipped') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel token with status '${token.status}'. Only booked or skipped tokens can be cancelled.`,
      });
    }

    let cancelledBy = 'user';

    if (userRole === 'staff') {
      const authCheck = await verifyStaffAssignment(userId, token.department._id);
      if (!authCheck.allowed) {
        return res.status(authCheck.status).json({
          success: false,
          message: authCheck.message,
        });
      }
      cancelledBy = 'staff';
    } else {
      // User must be the owner and can only cancel booked tokens
      if (!token.user || token.user.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are only authorized to cancel your own token.',
        });
      }
      if (token.status !== 'booked') {
        return res.status(400).json({
          success: false,
          message: 'Users can only cancel active booked tokens.',
        });
      }
    }

    token.status = 'cancelled';
    token.cancelledAt = new Date();
    token.cancelledBy = cancelledBy;
    await token.save();

    const populated = await Token.findById(token._id)
      .populate('user', 'name phone')
      .populate({
        path: 'department',
        populate: { path: 'place' },
      });

    // Real-time Socket.IO emission
    emitTokenUpdated(token.department._id, token.date, populated);
    recordDepartmentSnapshot(token.department._id, token.date);

    if (token.department?.place) {
      logActivity({
        place: token.department.place._id || token.department.place,
        department: token.department._id,
        type: 'cancelled',
        description: `Token #${token.number} was cancelled (${cancelledBy})`,
        metadata: { tokenNumber: token.number, cancelledBy },
      });
    }

    return res.json({
      success: true,
      message: `Token #${token.number} has been cancelled successfully.`,
      token: populated,
    });
  } catch (error) {
    console.error('Error in cancelToken:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel token.',
    });
  }
};

/**
 * POST /api/tokens/:id/complete
 * Staff action: marks token as completed (booked -> completed).
 * Enforces staff department assignment.
 */
const completeToken = async (req, res) => {
  try {
    const { id: tokenId } = req.params;
    const userId = req.user.id;

    const token = await Token.findById(tokenId).populate('department');
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found.',
      });
    }

    // Verify staff assignment to this department
    const authCheck = await verifyStaffAssignment(userId, token.department._id);
    if (!authCheck.allowed) {
      return res.status(authCheck.status).json({
        success: false,
        message: authCheck.message,
      });
    }

    // Allowed transition: booked -> completed ONLY
    if (token.status !== 'booked') {
      return res.status(400).json({
        success: false,
        message: `Cannot complete token with status '${token.status}'. Only booked tokens can be completed.`,
      });
    }

    const completedAt = new Date();
    token.status = 'completed';
    token.completedAt = completedAt;
    if (!token.calledAt) {
      token.calledAt = token.bookedAt || new Date(completedAt.getTime() - 10 * 60000);
    }
    await token.save();

    await updateDepartmentAvgServiceMinutes(token.department._id);

    const populated = await Token.findById(token._id)
      .populate('user', 'name phone')
      .populate({
        path: 'department',
        populate: { path: 'place' },
      });

    // Real-time Socket.IO emission
    emitTokenUpdated(token.department._id, token.date, populated);
    recordDepartmentSnapshot(token.department._id, token.date);

    if (token.department?.place) {
      logActivity({
        place: token.department.place._id || token.department.place,
        department: token.department._id,
        type: 'completed',
        description: `Token #${token.number} completed for ${token.department.name}`,
        metadata: { tokenNumber: token.number },
      });
    }

    return res.json({
      success: true,
      message: `Token #${token.number} marked as completed.`,
      token: populated,
    });
  } catch (error) {
    console.error('Error in completeToken:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete token.',
    });
  }
};

/**
 * POST /api/departments/:id/call-next
 * Staff action: picks lowest-numbered booked token in current slot (ignores skipped).
 * Disabled during doctor breaks.
 */
const callNextToken = async (req, res) => {
  try {
    const { id: departmentId } = req.params;
    const userId = req.user.id;
    const date = req.query.date || getTodayDateStr();
    const requestedSlot = req.query.slot || null;

    // Verify staff assignment
    const authCheck = await verifyStaffAssignment(userId, departmentId);
    if (!authCheck.allowed) {
      return res.status(authCheck.status).json({
        success: false,
        message: authCheck.message,
      });
    }

    const department = authCheck.department;
    const isToday = date === getTodayDateStr();

    // Check doctor break
    const currentBreak = getCurrentBreakStatus(department, isToday);
    if (currentBreak.onBreak) {
      return res.status(400).json({
        success: false,
        message: currentBreak.message || 'Doctor is currently on break. Counter calling is disabled.',
        onBreak: true,
        currentBreak,
      });
    }

    // Build query for lowest-numbered booked token (ignores skipped, completed, cancelled)
    const tokenQuery = {
      department: departmentId,
      date,
      status: 'booked',
    };

    if (requestedSlot) {
      tokenQuery.slot = requestedSlot;
    }

    const nextToken = await Token.findOne(tokenQuery)
      .sort({ number: 1 })
      .populate('user', 'name phone');

    if (!nextToken) {
      return res.status(404).json({
        success: false,
        message: requestedSlot
          ? `No booked tokens in this slot.`
          : 'No booked tokens waiting in queue for this department today.',
      });
    }

    nextToken.calledAt = new Date();
    await nextToken.save();

    // Update department nowServingToken
    await Department.findByIdAndUpdate(departmentId, { nowServingToken: nextToken.number });

    // Emit Socket.IO nowServing event
    emitNowServing(departmentId, date, nextToken.number, nextToken);
    recordDepartmentSnapshot(departmentId, date);

    return res.json({
      success: true,
      message: `Now calling Token #${nextToken.number}!`,
      tokenNumber: nextToken.number,
      token: nextToken,
    });
  } catch (error) {
    console.error('Error in callNextToken:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to call next token.',
    });
  }
};

/**
 * POST /api/departments/:id/pause
 * Staff action: pauses counter operations.
 */
const pauseCounter = async (req, res) => {
  try {
    const { id: departmentId } = req.params;
    const userId = req.user.id;

    const authCheck = await verifyStaffAssignment(userId, departmentId);
    if (!authCheck.allowed) {
      return res.status(authCheck.status).json({
        success: false,
        message: authCheck.message,
      });
    }

    const dept = await Department.findByIdAndUpdate(
      departmentId,
      { isPaused: true },
      { new: true }
    );

    emitCounterPaused(departmentId, true);

    return res.json({
      success: true,
      message: `Counter for ${dept.name} paused.`,
      isPaused: true,
    });
  } catch (error) {
    console.error('Error in pauseCounter:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to pause counter.',
    });
  }
};

/**
 * POST /api/departments/:id/resume
 * Staff action: resumes counter operations.
 */
const resumeCounter = async (req, res) => {
  try {
    const { id: departmentId } = req.params;
    const userId = req.user.id;

    const authCheck = await verifyStaffAssignment(userId, departmentId);
    if (!authCheck.allowed) {
      return res.status(authCheck.status).json({
        success: false,
        message: authCheck.message,
      });
    }

    const dept = await Department.findByIdAndUpdate(
      departmentId,
      { isPaused: false },
      { new: true }
    );

    emitCounterPaused(departmentId, false);

    return res.json({
      success: true,
      message: `Counter for ${dept.name} resumed.`,
      isPaused: false,
    });
  } catch (error) {
    console.error('Error in resumeCounter:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to resume counter.',
    });
  }
};

/**
 * GET /api/my/tokens
 * Returns all tokens booked by the authenticated user, enriched with slot and estimated times.
 */
const getMyTokens = async (req, res) => {
  try {
    const userId = req.user.id;
    const serverNow = new Date();

    const rawTokens = await Token.find({ user: userId })
      .populate('user', 'name phone dob age gender')
      .populate({
        path: 'department',
        populate: { path: 'place' },
      })
      .sort({ date: -1, bookedAt: -1 });

    // Group user tokens by departmentId and date for batch estimate computation
    const deptDateGroups = new Map();
    for (const t of rawTokens) {
      if (t.department?._id && t.date) {
        const key = `${t.department._id}_${t.date}`;
        if (!deptDateGroups.has(key)) {
          deptDateGroups.set(key, { department: t.department, date: t.date });
        }
      }
    }

    // Pre-calculate enriched maps for all relevant department+date combinations
    const enrichedMap = new Map();
    for (const [key, info] of deptDateGroups.entries()) {
      const allTokens = await Token.find({
        department: info.department._id,
        date: info.date,
      }).sort({ number: 1 });
      const enriched = enrichTokensWithEstimates(
        allTokens,
        info.department,
        info.date,
        serverNow
      );
      for (const en of enriched) {
        enrichedMap.set(en._id.toString(), en);
      }
    }

    const tokens = rawTokens.map((t) => {
      const tokenObj = t.toObject();

      if (!tokenObj.patient || !tokenObj.patient.name) {
        if (t.user) {
          tokenObj.patient = {
            name: t.user.name,
            phone: t.user.phone,
            age: t.user.age ?? (t.user.dob ? calculateAgeFromDOB(t.user.dob) : null),
            gender: t.user.gender,
          };
        }
      }

      const match = enrichedMap.get(t._id.toString());
      if (match) {
        tokenObj.peopleAhead = match.peopleAhead;
        tokenObj.estimatedMinutes = match.estimatedMinutes;
        tokenObj.estimatedTime = match.estimatedTime;
        tokenObj.estimatedLabel = match.estimatedLabel;
        tokenObj.estimatedClockTime = match.estimatedClockTime;
        tokenObj.mayOverflow = match.mayOverflow;
        tokenObj.serverNow = match.serverNow;
      }

      return tokenObj;
    });

    return res.json({
      success: true,
      count: tokens.length,
      tokens,
      serverNow: serverNow.toISOString(),
    });
  } catch (error) {
    console.error('Error in getMyTokens:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user tokens.',
    });
  }
};

/**
 * GET /api/tokens/:id/details
 * Staff action: returns full patient details snapshot {name, phone, age, gender},
 * token number, slot, status, estimated time, booked time, whether it is a walk-in.
 * Returns 403 if token is not in a department of the staff member's own facility.
 */
const getTokenDetails = async (req, res) => {
  try {
    const { id: tokenId } = req.params;
    const staffUserId = req.user.id;

    const token = await Token.findById(tokenId)
      .populate('user')
      .populate({
        path: 'department',
        populate: { path: 'place' },
      });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found.',
      });
    }

    if (!token.department) {
      return res.status(404).json({
        success: false,
        message: 'Department associated with token not found.',
      });
    }

    // Verify staff assignment to this department / place
    const authCheck = await verifyStaffAssignment(
      staffUserId,
      token.department._id || token.department
    );
    if (!authCheck.allowed) {
      return res.status(authCheck.status).json({
        success: false,
        message: authCheck.message,
      });
    }

    // Resolve patient details snapshot
    let patientDetails = {
      name: '',
      phone: '',
      age: null,
      gender: '',
    };

    if (token.patient?.name) {
      patientDetails = {
        name: token.patient.name,
        phone: token.patient.phone || '',
        age: token.patient.age ?? null,
        gender: token.patient.gender || '',
      };
    } else if (token.walkIn && token.walkInPatient?.name) {
      patientDetails = {
        name: token.walkInPatient.name,
        phone: token.walkInPatient.phone || '',
        age: token.walkInPatient.age ?? null,
        gender: token.walkInPatient.gender || '',
      };
    } else if (token.user) {
      const u = token.user;
      const uAge = u.age !== undefined && u.age !== null ? u.age : calculateAgeFromDOB(u.dob);
      patientDetails = {
        name: u.name,
        phone: u.phone || '',
        age: uAge,
        gender: u.gender || '',
      };
    }

    // Compute estimated time with centralized service
    const dept = token.department;
    const serverNow = new Date();
    const allTokens = await Token.find({
      department: dept._id,
      date: token.date,
    }).sort({ number: 1 });

    const enriched = enrichTokensWithEstimates(allTokens, dept, token.date, serverNow);
    const match = enriched.find((t) => t._id.toString() === token._id.toString()) || {};

    return res.json({
      success: true,
      tokenNumber: token.number,
      number: token.number,
      slot: token.slot,
      status: token.status,
      estimatedTime: match.estimatedTime,
      estimatedLabel: match.estimatedLabel,
      estimatedClockTime: match.estimatedClockTime,
      peopleAhead: match.peopleAhead ?? 0,
      bookedTime: token.bookedAt,
      bookedAt: token.bookedAt,
      walkIn: Boolean(token.walkIn),
      patient: patientDetails,
      serverNow: serverNow.toISOString(),
    });
  } catch (error) {
    console.error('Error in getTokenDetails:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch token details.',
    });
  }
};

/**
 * Migration helper: for existing booked/completed/skipped tokens with no patient snapshot,
 * fill it from the referenced User, or leave it empty if no user exists.
 */
async function migrateTokensPatientSnapshot() {
  try {
    const unmigrated = await Token.find({
      status: { $in: ['booked', 'completed', 'skipped'] },
      $or: [
        { patient: { $exists: false } },
        { patient: null },
        { 'patient.name': { $exists: false } },
        { 'patient.name': null },
        { 'patient.name': '' },
      ],
    }).populate('user');

    if (!unmigrated || unmigrated.length === 0) return;

    for (const token of unmigrated) {
      if (token.walkIn && token.walkInPatient?.name) {
        token.patient = {
          name: token.walkInPatient.name,
          phone: token.walkInPatient.phone || '',
          age: token.walkInPatient.age ?? null,
          gender: token.walkInPatient.gender || '',
        };
        await token.save();
      } else if (token.user) {
        const u = token.user;
        const uAge = u.age !== undefined && u.age !== null ? u.age : calculateAgeFromDOB(u.dob);
        token.patient = {
          name: u.name,
          phone: u.phone || '',
          age: uAge,
          gender: u.gender || '',
        };
        await token.save();
      }
    }
  } catch (err) {
    console.error('Migration error:', err.message);
  }
}

module.exports = {
  getDepartmentTokens,
  bookToken,
  walkInToken,
  skipToken,
  recallToken,
  cancelToken,
  completeToken,
  callNextToken,
  pauseCounter,
  resumeCounter,
  getMyTokens,
  getTokenDetails,
  migrateTokensPatientSnapshot,
  getSlotForTokenNumber,
};
