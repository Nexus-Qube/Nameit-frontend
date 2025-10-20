// hooks/useGameTimer.js
import { useState, useRef, useCallback, useEffect } from "react";

export const useGameTimer = (initialTime = 10) => {
  const [timer, setTimer] = useState(initialTime);
  const intervalRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback((onTimeout) => {
    clearTimer();
    
    let currentTime = initialTime;
    setTimer(initialTime);
    
    intervalRef.current = setInterval(() => {
      currentTime = currentTime - 1;
      setTimer(currentTime);
      
      if (currentTime <= 0) {
        clearTimer();
        if (onTimeout) {
          onTimeout();
        }
      }
    }, 1000);
  }, [initialTime, clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    timer,
    clearTimer,
    startTimer
  };
};