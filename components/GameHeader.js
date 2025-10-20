import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import styles from "../styles/GameScreenStyles";

export default function GameHeader({
  // Navigation
  onReturnToLobby,
  
  // Game state
  currentTurnPlayer,
  playerId,
  timer,
  statusMessage,
  solvedCount,
  items,
  playerSolvedCount,
  gameOver,
  
  // Input handling
  input,
  onInputChange,
  
  // Player info
  myColor,
  eliminatedPlayers,
  
  // Optional: selection phase states
  selectionModalVisible = false,
  countdownModalVisible = false,
}) {
  const getMyColorDisplay = () => {
    if (!myColor) return "No color selected";
    const color = getColorById(myColor);
    return color ? color.display : "No color";
  };

  const isMyTurn = Number(currentTurnPlayer.id) === Number(playerId);
  const isEliminated = eliminatedPlayers && eliminatedPlayers.has(playerId);
  const isInputDisabled = !isMyTurn || gameOver || isEliminated || selectionModalVisible || countdownModalVisible;

  return (
    <View style={{ padding: 20 }}>
      {/* Top Row */}
      <View style={styles.topRow}>
        <View style={styles.rowLeft}>
          <TouchableOpacity onPress={onReturnToLobby}>
            <Text style={{ color: "blue", fontSize: 16 }}>Return to Lobby</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rowSection}>
          <Text
            style={[
              styles.statusMessage,
              statusMessage === "Answer before time runs out" && { color: "yellow" },
              statusMessage === "You lost" && { color: "red" },
              statusMessage === "You won" && { color: "green" },
              statusMessage === "You're out!" && { color: "red" },
            ]}
          >
            {statusMessage}
          </Text>
        </View>

        <View style={styles.rowRight}>
          <Text style={styles.counter}>
            {solvedCount} / {items?.length || 0}
          </Text>
        </View>
      </View>

      {/* Bottom Row */}
      <View style={styles.bottomRow}>
        <View style={styles.rowLeft}>
          <Text style={styles.countdown}>{timer}s</Text>
        </View>

        <View style={styles.rowSection}>
          <Text
            style={[
              styles.counter,
              isMyTurn && { color: "green" },
              isEliminated && { color: "red" },
            ]}
          >
            {isEliminated 
              ? "You're out!" 
              : isMyTurn
                ? "Your turn!"
                : `${currentTurnPlayer.name}'s turn`
            }
          </Text>
        </View>

        <View style={styles.rowRight}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.counter}>
              Solved {playerSolvedCount}
            </Text>
            {myColor && (
              <Text style={{ color: '#fff', fontSize: 12, marginTop: 2 }}>
                My color: {getMyColorDisplay()}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Input Field */}
      <TextInput
        placeholder={
          isEliminated 
            ? "You're eliminated" 
            : isMyTurn
              ? "Type item name..."
              : "Wait for your turn..."
        }
        value={input}
        onChangeText={onInputChange}
        style={[
          styles.input,
          isInputDisabled && { backgroundColor: "#ddd" },
        ]}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isInputDisabled}
      />
    </View>
  );
}

// Helper function (you might want to move this to a shared utils file)
import { getColorById } from "../constants/PlayerColors";