import React from 'react';
import useLiveEstimate from '../hooks/useLiveEstimate';

/**
 * LiveTime Component
 * Continuously updating clock label and countdown.
 * Automatically handles:
 * - clock offset (serverNow vs Date.now())
 * - countdown ("in 12 min", "in 1 hr 5 min", "Now / Next" at 0 or less)
 * - "Waiting for the counter" when time passes without being called
 * - "Doctor on break until <time>"
 * - "Slot ended"
 */
const LiveTime = ({
  estimatedTime,
  serverNow,
  status = 'booked',
  peopleAhead = 0,
  currentBreak = null,
  isSlotEnded = false,
  isNowServing = false,
  showClock = true,
  showCountdown = true,
  layout = 'stacked', // 'stacked' | 'inline' | 'badge'
  className = '',
  clockClassName = '',
  countdownClassName = '',
  onRefresh = null,
}) => {
  const { clockLabel, countdown, isSpecialState } = useLiveEstimate({
    estimatedTime,
    serverNow,
    status,
    peopleAhead,
    currentBreak,
    isSlotEnded,
    isNowServing,
    onRefresh,
  });

  if (layout === 'inline') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-sans ${className}`}>
        {showClock && <span className={clockClassName || 'font-bold'}>{clockLabel}</span>}
        {showClock && showCountdown && <span className="opacity-60">&bull;</span>}
        {showCountdown && (
          <span className={countdownClassName || 'text-xs font-medium'}>
            {countdown}
          </span>
        )}
      </span>
    );
  }

  if (layout === 'badge') {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${className}`}>
        {showClock && <span>{clockLabel}</span>}
        {showCountdown && <span className="opacity-75 font-normal">({countdown})</span>}
      </div>
    );
  }

  // Default 'stacked' layout (ideal for grid tiles and summary cards)
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      {showClock && (
        <span className={clockClassName || 'text-[11px] font-bold leading-tight truncate max-w-full'}>
          {clockLabel}
        </span>
      )}
      {showCountdown && (
        <span className={countdownClassName || 'text-[10px] font-medium leading-tight opacity-90 truncate max-w-full mt-0.5'}>
          {countdown}
        </span>
      )}
    </div>
  );
};

export default LiveTime;
