export const initializeGameItems = (itemsData, topicData) => {
  let sortedItems = [...itemsData];
  
  if (topicData.sort_field === "order") {
    sortedItems.sort((a, b) => (a.attributes?.order ?? 0) - (b.attributes?.order ?? 0));
  } else if (topicData.sort_field === "name") {
    sortedItems.sort((a, b) => a.name.localeCompare(b.name));
  }

  return sortedItems.map((item, index) => ({
    ...item,
    solved: false,
    order: item.attributes?.order ?? index + 1,
  }));
};

export const findMatchingItem = (items, input, currentTurnPlayerId, playerId, gameOver) => {
  if (Number(currentTurnPlayerId) !== Number(playerId) || gameOver) {
    return null;
  }

  return items.find(
    (item) =>
      !item.solved &&
      item.name.toLowerCase() === input.trim().toLowerCase()
  );
};