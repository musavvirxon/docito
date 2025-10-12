import { useEffect, useRef, useState } from 'react';

interface UseInactivityTimerProps {
  onInactive: () => void;
  inactivityTime?: number; // in milliseconds
  warningTime?: number; // in milliseconds before logout to show warning
}

export const useInactivityTimer = ({
  onInactive,
  inactivityTime = 15 * 60 * 1000, // 15 minutes default
  warningTime = 60 * 1000, // 1 minute warning default
  enabled = true, // New prop to control if timer is active
}: UseInactivityTimerProps & { enabled?: boolean }) => {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoggedOutRef = useRef(false);

  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const startCountdown = () => {
    setCountdown(Math.floor(warningTime / 1000));
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetTimer = () => {
    if (!enabled) return;
    
    clearTimers();
    setShowWarning(false);
    setCountdown(0);
    hasLoggedOutRef.current = false;

    // Set warning timer
    warningTimeoutRef.current = setTimeout(() => {
      if (hasLoggedOutRef.current) return;
      setShowWarning(true);
      startCountdown();
    }, inactivityTime - warningTime);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      if (hasLoggedOutRef.current) return;
      hasLoggedOutRef.current = true;
      onInactive();
    }, inactivityTime);
  };

  const stayLoggedIn = () => {
    resetTimer();
  };

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Activity events to monitor
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Reset timer on any activity
    const handleActivity = () => {
      if (!showWarning && !hasLoggedOutRef.current) {
        resetTimer();
      }
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer only if enabled
    if (enabled) {
      resetTimer();
    }

    // Cleanup
    return () => {
      clearTimers();
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, showWarning, inactivityTime, warningTime]);

  return {
    showWarning,
    countdown,
    stayLoggedIn,
  };
};
