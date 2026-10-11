import { useState, useEffect, useRef, useCallback } from 'react';

// Global cache for server clock offset (serverNow - Date.now())
let cachedClockOffset = 0;
let hasSetOffset = false;

export function updateClockOffset(serverNow) {
  if (serverNow) {
    const sNow = new Date(serverNow).getTime();
    if (!isNaN(sNow)) {
      cachedClockOffset = sNow - Date.now();
      hasSetOffset = true;
    }
  }
}

export function getClockOffset() {
  return cachedClockOffset;
}

/**
 * Format total minutes or ISO to "~H:MM AM/PM"
 */
export function formatClockTime(isoStr) {
  if (!isoStr) return '~10:00 AM';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '~10:00 AM';
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const mm = String(m).padStart(2, '0');
    return `~${h}:${mm} ${ampm}`;
  } catch (e) {
    return '~10:00 AM';
  }
}

/**
 * Shared hook for live countdown and clock label.
 * Ticks every 30 seconds. Pauses when tab is hidden and re-evaluates/re-fetches on tab visible.
 */
export function useLiveEstimate({
  estimatedTime,
  serverNow,
  status = 'booked',
  peopleAhead = 0,
  currentBreak = null,
  isSlotEnded = false,
  isNowServing = false,
  onRefresh = null,
} = {}) {
  const [, setTick] = useState(0);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Update clock offset whenever serverNow is passed or changes
  if (serverNow && !hasSetOffset) {
    updateClockOffset(serverNow);
  }

  // Timer & Tab Visibility Management
  useEffect(() => {
    let intervalId = null;

    const startTimer = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          setTick((prev) => prev + 1);
        }, 30000); // Tick every 30 seconds
      }
    };

    const stopTimer = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        setTick((prev) => prev + 1);
        startTimer();
        if (typeof onRefreshRef.current === 'function') {
          onRefreshRef.current();
        }
      }
    };

    if (!document.hidden) {
      startTimer();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Compute live estimate with clock offset
  const adjustedNow = Date.now() + cachedClockOffset;
  const clockLabel = formatClockTime(estimatedTime);

  let countdown = '';
  let isSpecialState = false;

  if (currentBreak?.onBreak) {
    isSpecialState = true;
    countdown =
      currentBreak.message ||
      (currentBreak.endTime ? `Doctor on break until ${currentBreak.endTime}` : 'Doctor on break');
  } else if (isSlotEnded) {
    isSpecialState = true;
    countdown = 'Slot ended';
  } else if (status === 'completed') {
    isSpecialState = true;
    countdown = 'Completed';
  } else if (status === 'cancelled') {
    isSpecialState = true;
    countdown = 'Cancelled';
  } else if (status === 'skipped') {
    isSpecialState = true;
    countdown = 'Skipped';
  } else if (isNowServing) {
    isSpecialState = true;
    countdown = 'Now serving';
  } else {
    // Booked or Available tokens
    if (!estimatedTime) {
      countdown = peopleAhead === 0 ? 'Now / Next' : `${peopleAhead} ahead`;
    } else {
      const targetMs = new Date(estimatedTime).getTime();
      const diffMs = targetMs - adjustedNow;
      const diffMinutes = Math.round(diffMs / 60000);

      if (diffMinutes > 0) {
        if (diffMinutes < 60) {
          countdown = `in ${diffMinutes} min`;
        } else {
          const hrs = Math.floor(diffMinutes / 60);
          const mins = diffMinutes % 60;
          countdown = `in ${hrs} hr${mins > 0 ? ` ${mins} min` : ''}`;
        }
      } else if (diffMinutes === 0 && peopleAhead === 0) {
        countdown = 'Now / Next';
      } else {
        // If time passes without being called, show "Waiting for the counter" instead of negative countdown
        countdown = 'Waiting for the counter';
      }
    }
  }

  return {
    clockLabel,
    countdown,
    isSpecialState,
    clockOffset: cachedClockOffset,
  };
}

export default useLiveEstimate;
