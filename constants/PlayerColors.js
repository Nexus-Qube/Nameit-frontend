export const PLAYER_COLORS = [
  { id: null, name: "No Color", value: null, display: "⚪ None" },
  { id: 1, name: "Red", value: "#FF3B30", display: "🔴 Red" },
  { id: 2, name: "Orange", value: "#FF9500", display: "🟠 Orange" },
  { id: 3, name: "Yellow", value: "#FFCC00", display: "🟡 Yellow" },
  { id: 4, name: "Green", value: "#34C759", display: "🟢 Green" },
  { id: 5, name: "Teal", value: "#5AC8FA", display: "🔵 Teal" },
  { id: 6, name: "Blue", value: "#007AFF", display: "🔵 Blue" },
  { id: 7, name: "Purple", value: "#AF52DE", display: "🟣 Purple" },
  { id: 8, name: "Pink", value: "#FF2D55", display: "🌸 Pink" },
  { id: 9, name: "Brown", value: "#A2845E", display: "🟤 Brown" },
  { id: 10, name: "Gray", value: "#8E8E93", display: "⚫ Gray" }
];

export const getAvailableColors = (players, currentPlayerId) => {
  // Handle undefined or null players array
  if (!players || !Array.isArray(players)) {
    return PLAYER_COLORS.map(color => ({
      ...color,
      available: true
    }));
  }

  const takenColors = players
    .filter(player => player && String(player.id) !== String(currentPlayerId))
    .map(player => player.color)
    .filter(color => color !== null && color !== undefined);

  return PLAYER_COLORS.map(color => ({
    ...color,
    available: color.id === null || !takenColors.includes(color.id)
  }));
};

// Helper function to get color by ID
export const getColorById = (colorId) => {
  return PLAYER_COLORS.find(color => color.id === colorId) || PLAYER_COLORS[0];
};

// Helper function to get color value by ID
export const getColorValueById = (colorId) => {
  const color = getColorById(colorId);
  return color ? color.value : null;
};