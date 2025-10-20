import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { removeGameListeners } from '../services/socket';

export const useGameNavigation = (lobbyId, playerId, code, playerName) => {
  const router = useRouter();

  const handleReturnToLobby = (canReturnCallback = null) => {
    if (canReturnCallback && !canReturnCallback()) {
      Alert.alert(
        "Still Your Turn",
        "You cannot return to lobby during your turn. Wait for your turn to end or let the timer expire.",
        [{ text: "OK" }]
      );
      return false;
    }

    removeGameListeners();
    
    router.replace({
      pathname: "/waitingRoom",
      params: {
        code,
        playerId,
        playerName,
      },
    });
    
    return true;
  };

  const handleLeaveGame = () => {
    removeGameListeners();
    router.replace("/lobbiesScreen");
  };

  return { handleReturnToLobby, handleLeaveGame };
};