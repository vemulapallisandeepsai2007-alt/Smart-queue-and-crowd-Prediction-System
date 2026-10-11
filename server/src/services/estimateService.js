/**
 * estimateService.js
 * Centralized queue time estimation service for Q-Flow Smart Queue System.
 * 
 * Logic follows Asia/Kolkata (+05:30) timezone rules.
 * Does not store estimates in database; computes dynamically from:
 * - current time
 * - slot start / end
 * - breaks
 * - queue state (booked, called, completed, skipped, cancelled)
 * - average service time (department.avgServiceMinutes)
 */

/**
 * Parse "HH:MM" string to minutes from midnight
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 9 * 60;
  const parts = String(timeStr).split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Format total minutes into 12-hour clock label (e.g. "6:42 PM")
 */
function formatMinutesTo12Hour(totalMinutes) {
  const norm = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  const displayM = String(m).padStart(2, '0');
  return `${displayH}:${displayM} ${ampm}`;
}

/**
 * Format total minutes to tilde clock time (e.g. "~6:42 PM")
 */
function formatMinutesToClockTime(totalMinutes) {
  return `~${formatMinutesTo12Hour(totalMinutes)}`;
}

/**
 * Get date and time details in Asia/Kolkata (+05:30)
 */
function getKolkataTime(serverNow = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(serverNow);
  const m = {};
  parts.forEach((p) => {
    m[p.type] = p.value;
  });

  const hours = parseInt(m.hour, 10) % 24;
  const minutes = parseInt(m.minute, 10);
  const seconds = parseInt(m.second, 10);
  const dateStr = `${m.year}-${m.month}-${m.day}`;
  const totalMinutes = hours * 60 + minutes + seconds / 60;

  return {
    dateStr,
    hours,
    minutes,
    seconds,
    totalMinutes,
  };
}

/**
 * Convert dateStr ("YYYY-MM-DD") and minutes from midnight to Asia/Kolkata ISO string
 */
function minutesToKolkataISO(dateStr, totalMinutes) {
  const norm = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  // ISO with explicit +05:30 offset
  const isoWithOffset = `${dateStr}T${hh}:${mm}:00+05:30`;
  return new Date(isoWithOffset).toISOString();
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
 * Check if department is currently in a doctor break
 */
function getCurrentBreakStatus(department, isToday, serverNow = new Date()) {
  if (!isToday) {
    return { onBreak: false, label: null, startTime: null, endTime: null, message: null };
  }

  const kolkataTime = getKolkataTime(serverNow);
  const nowMinutes = kolkataTime.totalMinutes;
  const breaks = department.breaks || [
    { label: 'Lunch', startTime: '12:30', endTime: '14:00' },
    { label: 'Tea', startTime: '17:00', endTime: '17:30' },
  ];

  const activeBreak = breaks.find((b) => {
    const bStart = parseTimeToMinutes(b.startTime);
    const bEnd = parseTimeToMinutes(b.endTime);
    return nowMinutes >= bStart && nowMinutes < bEnd;
  });

  if (activeBreak) {
    const endTime12 = formatMinutesTo12Hour(parseTimeToMinutes(activeBreak.endTime));
    return {
      onBreak: true,
      label: activeBreak.label,
      startTime: activeBreak.startTime,
      endTime: activeBreak.endTime,
      message: `Doctor on break until ${endTime12}`,
    };
  }

  return { onBreak: false, label: null, startTime: null, endTime: null, message: null };
}

/**
 * Compute live estimates for a list of tokens belonging to a department on a date.
 * 
 * @param {Array} tokens - Array of token documents or objects (sorted by number 1..75)
 * @param {Object} department - Department document
 * @param {string} date - "YYYY-MM-DD"
 * @param {Date} [serverNow=new Date()] - Current server timestamp
 * @returns {Array} Enriched tokens with estimatedTime, estimatedLabel, peopleAhead, serverNow, etc.
 */
function enrichTokensWithEstimates(tokens, department, date, serverNow = new Date()) {
  const kolkataNow = getKolkataTime(serverNow);
  const isToday = date === kolkataNow.dateStr;
  const isPast = date < kolkataNow.dateStr;
  const currentMinutes = kolkataNow.totalMinutes;
  const serverNowISO = serverNow.toISOString();

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

  const avgMinutes = Math.max(1, department.avgServiceMinutes || 10);

  // Group tokens by slot
  const slotTokensMap = {};
  deptSlots.forEach((slot) => {
    slotTokensMap[slot.name] = [];
  });

  tokens.forEach((t) => {
    const slotName = t.slot || getSlotForTokenNumber(t.number);
    if (!slotTokensMap[slotName]) {
      slotTokensMap[slotName] = [];
    }
    slotTokensMap[slotName].push(t);
  });

  const enrichedResults = [];

  deptSlots.forEach((slot) => {
    const slotTokens = (slotTokensMap[slot.name] || []).sort((a, b) => a.number - b.number);
    const slotStartMinutes = parseTimeToMinutes(slot.startTime);
    const slotEndMinutes = parseTimeToMinutes(slot.endTime);

    // Determine the live base start time for serving in this slot
    let baseTime = slotStartMinutes;

    if (isToday) {
      if (currentMinutes > slotStartMinutes) {
        baseTime = currentMinutes;
      }
    } else if (isPast) {
      baseTime = slotEndMinutes;
    }

    // Helper: advance time if it falls inside any break
    const advancePastBreaks = (timeInMinutes) => {
      let t = timeInMinutes;
      let shifted = true;
      let loops = 0;
      while (shifted && loops < 10) {
        shifted = false;
        loops++;
        for (const b of deptBreaks) {
          const bStart = parseTimeToMinutes(b.startTime);
          const bEnd = parseTimeToMinutes(b.endTime);
          if (t >= bStart && t < bEnd) {
            t = bEnd;
            shifted = true;
          }
        }
      }
      return t;
    };

    baseTime = advancePastBreaks(baseTime);

    // Find if a token in this slot is currently being served
    const nowServingNum = department.nowServingToken;
    const nowServingToken = slotTokens.find(
      (t) => t.number === nowServingNum && (t.status === 'booked' || t.calledAt)
    );

    // If a token is currently being called/served, compute remaining service time
    if (nowServingToken && nowServingToken.calledAt && isToday) {
      const calledKolkata = getKolkataTime(new Date(nowServingToken.calledAt));
      const elapsed = Math.max(0, currentMinutes - calledKolkata.totalMinutes);
      const remaining = Math.max(1, avgMinutes - elapsed);
      baseTime = advancePastBreaks(currentMinutes + remaining);
    }

    // Calculate queue simulation for booked tokens
    // Only 'booked' tokens count as active in queue (completed, cancelled, skipped are done/out)
    const bookedQueue = slotTokens.filter(
      (t) => t.status === 'booked' && t.number !== nowServingNum
    );

    // Map token number to its calculated estimate
    let simTime = baseTime;
    const estimateMap = new Map();

    // First assign nowServingToken if present
    if (nowServingToken) {
      const estMin = isToday ? Math.min(currentMinutes, slotEndMinutes) : slotStartMinutes;
      estimateMap.set(nowServingToken.number, {
        estimatedMinutes: estMin,
        peopleAhead: 0,
        mayOverflow: false,
      });
    }

    // Step through each booked token in order
    bookedQueue.forEach((t, idx) => {
      simTime = advancePastBreaks(simTime);
      const estMin = simTime;
      const mayOverflow = estMin > slotEndMinutes;
      estimateMap.set(t.number, {
        estimatedMinutes: estMin,
        peopleAhead: idx + (nowServingToken && nowServingToken.number < t.number ? 1 : 0),
        mayOverflow,
      });
      simTime = simTime + avgMinutes;
    });

    // Now enrich ALL tokens in this slot (booked, available, completed, cancelled, skipped)
    slotTokens.forEach((t) => {
      const tNumber = t.number;
      const isBooked = t.status === 'booked';

      let peopleAhead = 0;
      let targetMinutes = baseTime;
      let mayOverflow = false;

      if (isBooked && estimateMap.has(tNumber)) {
        const est = estimateMap.get(tNumber);
        peopleAhead = est.peopleAhead;
        targetMinutes = est.estimatedMinutes;
        mayOverflow = est.mayOverflow;
      } else {
        // For available, completed, skipped, cancelled tokens:
        // Count active booked tokens ahead of it in this slot
        const activeBookedAhead = slotTokens.filter(
          (other) => other.number < tNumber && other.status === 'booked'
        );
        peopleAhead = activeBookedAhead.length;

        // If someone were to take this token, when would it run?
        // It would run after all active booked tokens ahead of it
        let tempSim = baseTime;
        for (let i = 0; i < peopleAhead; i++) {
          tempSim = advancePastBreaks(tempSim) + avgMinutes;
        }
        tempSim = advancePastBreaks(tempSim);
        targetMinutes = tempSim;
        mayOverflow = targetMinutes > slotEndMinutes;
      }

      const estimatedClockTime = formatMinutesToClockTime(targetMinutes);
      const estimatedLabel = formatMinutesTo12Hour(targetMinutes);
      const estimatedTime = minutesToKolkataISO(date, targetMinutes);

      const rawObj = typeof t.toObject === 'function' ? t.toObject() : { ...t };

      enrichedResults.push({
        ...rawObj,
        slot: slot.name,
        peopleAhead,
        estimatedMinutes: Math.round(targetMinutes),
        estimatedTime,
        estimatedLabel,
        estimatedClockTime,
        mayOverflow,
        serverNow: serverNowISO,
      });
    });
  });

  // Sort back by token number ascending (1..75)
  enrichedResults.sort((a, b) => a.number - b.number);
  return enrichedResults;
}

module.exports = {
  parseTimeToMinutes,
  formatMinutesTo12Hour,
  formatMinutesToClockTime,
  getKolkataTime,
  minutesToKolkataISO,
  getSlotForTokenNumber,
  getCurrentBreakStatus,
  enrichTokensWithEstimates,
};
