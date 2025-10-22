// frontend/hooks/useTurnBasedFocus.js
import { useEffect, useRef } from "react";

/**
 * Custom hook to automatically focus input when it becomes the player's turn
 * @param {boolean} isMyTurn - Whether it's currently the player's turn
 * @param {boolean} gameOver - Whether the game is over
 * @param {React.RefObject} inputRef - Ref to the input element
 * @param {string} gameMode - Optional: game mode for logging
 */
export const useTurnBasedFocus = (isMyTurn, gameOver, inputRef, gameMode = "unknown") => {
  const hasFocusedThisTurn = useRef(false);

  useEffect(() => {
    // Reset focus tracking when turn changes
    hasFocusedThisTurn.current = false;
  }, [isMyTurn]);

  useEffect(() => {
    // Focus input when it becomes the player's turn and game is not over
    if (isMyTurn && !gameOver && inputRef.current && !hasFocusedThisTurn.current) {
      console.log(`🎮 [${gameMode}] It's my turn - focusing input`);
      
      const focusInput = () => {
        if (inputRef.current) {
          try {
            // Simple focus - let React Native handle platform differences
            inputRef.current.focus();
            hasFocusedThisTurn.current = true;
          } catch (error) {
            console.warn('Focus error:', error);
          }
        }
      };
      
      // Multiple focus attempts
      focusInput();
      setTimeout(focusInput, 10);
      setTimeout(focusInput, 50);
      setTimeout(focusInput, 100);
    }
  }, [isMyTurn, gameOver, inputRef, gameMode]);
};