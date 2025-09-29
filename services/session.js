import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAYER_KEY = '@player_session';

// Save player object
export async function savePlayer(player) {
  try {
    await AsyncStorage.setItem(PLAYER_KEY, JSON.stringify(player));
  } catch (err) {
    console.error('Failed to save player session', err);
  }
}

// Get player object
export async function getPlayer() {
  try {
    const json = await AsyncStorage.getItem(PLAYER_KEY);
    return json ? JSON.parse(json) : null;
  } catch (err) {
    console.error('Failed to load player session', err);
    return null;
  }
}

// Clear player session (logout)
export async function clearPlayer() {
  try {
    await AsyncStorage.removeItem(PLAYER_KEY);
  } catch (err) {
    console.error('Failed to clear player session', err);
  }
}
