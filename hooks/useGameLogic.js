import { useState } from 'react';

const findMatchingItem = (items, input, currentTurnPlayerId, playerId, gameOver) => {
  if (Number(currentTurnPlayerId) !== Number(playerId) || gameOver) {
    return null;
  }

  return items.find(
    (item) =>
      !item.solved &&
      item.name.toLowerCase() === input.trim().toLowerCase()
  );
};

export const useGameLogic = (initialItems = []) => {
  const [items, setItems] = useState(initialItems);
  const [playerSolvedCount, setPlayerSolvedCount] = useState(0);

  const solveItem = (itemId, solvedBy = null) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, solved: true, solvedBy } : item
    ));
  };

  const incrementPlayerSolvedCount = () => {
    setPlayerSolvedCount(prev => prev + 1);
  };

  const handleItemMatch = (input, currentTurnPlayerId, playerId, gameOver) => {
    const matched = findMatchingItem(items, input, currentTurnPlayerId, playerId, gameOver);
    
    if (matched) {
      solveItem(matched.id, playerId); // Track which player solved it
      return matched;
    }
    
    return null;
  };

  const solvedCount = items.filter(item => item.solved).length;

  return {
    items,
    setItems,
    playerSolvedCount,
    solveItem,
    handleItemMatch,
    solvedCount,
    incrementPlayerSolvedCount,
  };
};