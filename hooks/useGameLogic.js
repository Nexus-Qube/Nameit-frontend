import { useState } from 'react';

const findMatchingItem = (items, input, currentTurnPlayerId, playerId, gameOver) => {
  if (Number(currentTurnPlayerId) !== Number(playerId) || gameOver) {
    return null;
  }

  const normalizedInput = input.trim().toLowerCase();
  
  return items.find(
    (item) =>
      !item.solved &&
      item.correct.some(correctAnswer => 
        correctAnswer.toLowerCase() === normalizedInput
      )
  );
};

export const useGameLogic = (initialItems = []) => {
  const [items, setItems] = useState(initialItems);
  const [playerSolvedCount, setPlayerSolvedCount] = useState(0);

  const solveItem = (itemId, solvedBy = null, isHideSeekItem = false) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, solved: true, solvedBy, isHideSeekItem } : item
    ));
  };

  const incrementPlayerSolvedCount = () => {
    setPlayerSolvedCount(prev => prev + 1);
  };

  const handleItemMatch = (input, currentTurnPlayerId, playerId, gameOver) => {
    const matched = findMatchingItem(items, input, currentTurnPlayerId, playerId, gameOver);
    return matched; // Just return the matched item, don't solve it locally
  };

  const solvedCount = items.filter(item => item.solved).length;

  return {
    items,
    setItems,
    playerSolvedCount,
    solveItem, // Export solveItem for controlled solving
    handleItemMatch,
    solvedCount,
    incrementPlayerSolvedCount,
  };
};