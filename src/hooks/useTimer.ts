import { useCallback, useEffect, useRef, useState } from 'react';

export interface TimerState {
  timeLeftMs: number;
  isExpired: boolean;
  formattedTime: string;
  isUrgent: boolean; // < 5 minutes
}

function formatMs(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

export function useTimer(
  timerEndTime: number,   // ms epoch; 0 = no timer
  onExpire: () => void,
  active: boolean,
) {
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const onExpireRef = useRef(onExpire);
  const expiredRef = useRef(false);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!active || timerEndTime === 0) {
      setTimeLeftMs(0);
      return;
    }

    expiredRef.current = false;

    const tick = () => {
      const left = timerEndTime - Date.now();
      if (left <= 0) {
        setTimeLeftMs(0);
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpireRef.current();
        }
      } else {
        setTimeLeftMs(left);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timerEndTime, active]);

  const isExpired = timerEndTime > 0 && timeLeftMs <= 0;
  const isUrgent = timerEndTime > 0 && timeLeftMs > 0 && timeLeftMs < 5 * 60 * 1000;

  return {
    timeLeftMs,
    isExpired,
    formattedTime: timerEndTime > 0 ? formatMs(timeLeftMs) : '',
    isUrgent,
  } as TimerState;
}
