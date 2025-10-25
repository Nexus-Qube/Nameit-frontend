import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import styles from "../styles/GameScreenStyles";

// Game mode constants for better readability
const GAME_MODES = {
  SINGLE_PLAYER: 0,      // Single player mode
  MARATHON: 1,           // Multiplayer marathon mode
  HIDE_AND_SEEK: 2,      // Multiplayer hide & seek mode
  TRAP: 3,               // Multiplayer trap mode
};

export default function GameModals({
  // Modal visibility states
  selectionModalVisible = false,
  countdownModalVisible = false,
  gameModalVisible = false,
  
  // Modal control functions (make them optional with defaults)
  onCloseSelectionModal = () => {},
  onCloseCountdownModal = () => {},
  onCloseGameModal = () => {},
  
  // Selection modal state (for Hide & Seek and Trap modes)
  selectionInput = "",
  onSelectionInputChange = () => {},
  selectionValidation = null,
  onSelectionConfirm = () => {},
  mySpecialItem = null,
  duplicateItemsWarning = false,
  selectionPhaseText = "Choose Your Hide & Seek Item",
  selectionDescription = "Select an item that other players will try to find. If someone finds your item, you're eliminated!",
  confirmButtonText = "Confirm Selection",
  confirmButtonColor = "#007AFF",
  
  // Countdown modal state
  gameStartCountdown = 0,
  
  // Game over modal state
  winner = null,
  solvedCount = 0,
  playerSolvedCount = 0,
  items = [],
  gameCompleted = false, // New prop to indicate if player won by solving all items
  mode = "countdown", // Game mode: "countdown" or "fastest"
  time = 0, // Current time when game ended
  remainingPlayers = [], // For multiplayer: list of remaining players when all items are solved
  playerId = null, // Current player ID to check if they are a winner
  playerEliminated = false, // Whether the current player was eliminated
  
  // Action handlers
  onReturnToLobby = () => {},
  onLeaveGame = () => {},
  
  // Game mode - using new constants
  gameMode = GAME_MODES.SINGLE_PLAYER,
}) {
  const router = useRouter();

  // Helper functions to check game mode
  const isSinglePlayer = gameMode === GAME_MODES.SINGLE_PLAYER;
  const isMultiplayer = gameMode >= GAME_MODES.MARATHON;
  const isMarathon = gameMode === GAME_MODES.MARATHON;
  const isHideAndSeek = gameMode === GAME_MODES.HIDE_AND_SEEK;
  const isTrap = gameMode === GAME_MODES.TRAP;

  // Handle return to topics screen (single player only)
  const handleReturnToTopics = () => {
    onCloseGameModal();
    router.replace("/singleplayerScreen");
  };

  // Selection modal content based on game mode
  const getSelectionModalContent = () => {
    const getModalTitle = () => {
      switch (gameMode) {
        case GAME_MODES.HIDE_AND_SEEK: return "Choose Your Hide & Seek Item";
        case GAME_MODES.TRAP: return "Set Your Trap";
        default: return selectionPhaseText;
      }
    };

    const getModalDescription = () => {
      switch (gameMode) {
        case GAME_MODES.HIDE_AND_SEEK: return "Select an item that other players will try to find. If someone finds your item, you're eliminated!";
        case GAME_MODES.TRAP: return "Choose an item to set as your trap. If another player finds your trap item, THEY get eliminated!";
        default: return selectionDescription;
      }
    };

    const getConfirmButtonProps = () => {
      switch (gameMode) {
        case GAME_MODES.HIDE_AND_SEEK: return { text: "Confirm Selection", color: "#007AFF" };
        case GAME_MODES.TRAP: return { text: "Set Trap", color: "#FF4444" };
        default: return { text: confirmButtonText, color: confirmButtonColor };
      }
    };

    const { text: buttonText, color: buttonColor } = getConfirmButtonProps();

    return (
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{getModalTitle()}</Text>
        <Text style={styles.modalText}>
          {getModalDescription()}
        </Text>
        
        {duplicateItemsWarning && (
          <Text style={[styles.modalText, { color: 'red', fontWeight: 'bold' }]}>
            ⚠️ There are players that chose the same item, choose again!
          </Text>
        )}
        
        <TextInput
          placeholder="Type item name..."
          value={selectionInput}
          onChangeText={onSelectionInputChange}
          style={[
            styles.input,
            { marginBottom: 10, width: '100%' }
          ]}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!mySpecialItem}
        />
        
        {/* Validation message */}
        {selectionValidation && selectionValidation.trim() !== "" && (
          <Text style={[
            { marginBottom: 15, textAlign: 'center' },
            selectionValidation.includes("Good") || selectionValidation.includes("Perfect") 
              ? { color: 'green' } 
              : { color: 'red' }
          ]}>
            {selectionValidation}
          </Text>
        )}
        
        {/* Selected item confirmation */}
        {mySpecialItem ? (
          <Text style={[styles.modalText, { color: 'green', fontWeight: 'bold' }]}>
            ✅ {gameMode === GAME_MODES.TRAP ? 'Your trap is set:' : 'You selected:'} {mySpecialItem.name}
          </Text>
        ) : (
          <TouchableOpacity 
            style={[styles.modalButton, { backgroundColor: buttonColor }]}
            onPress={onSelectionConfirm}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
              {buttonText}
            </Text>
          </TouchableOpacity>
        )}
        
        <Text style={[styles.modalText, { fontSize: 14, color: '#666' }]}>
          Waiting for all players to {gameMode === GAME_MODES.TRAP ? 'set their traps' : 'choose their items'}...
        </Text>
      </View>
    );
  };

  // Countdown modal
  const renderCountdownModal = () => (
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Game Starting</Text>
      <View style={{ alignItems: 'center', marginVertical: 10 }}>
        <Text style={[styles.modalText, { 
          fontSize: 48, 
          fontWeight: 'bold', 
          color: gameMode === GAME_MODES.TRAP ? '#FF4444' : '#FFD700' 
        }]}>
          {String(gameStartCountdown)}
        </Text>
      </View>
      <Text style={styles.modalText}>
        {gameStartCountdown > 0 ? 'Get ready!' : 'Game starting now!'}
      </Text>
    </View>
  );

  // Game over modal - FIXED with clear mode separation
  const renderGameOverModal = () => {
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Check if current player is a winner (multiplayer only)
    const isCurrentPlayerWinner = isMultiplayer && remainingPlayers.some(player => 
      String(player.id) === String(playerId)
    );

    // Get winner names for display (multiplayer only)
    const getWinnerDisplay = () => {
      if (remainingPlayers.length === 0) return "No winners";
      if (remainingPlayers.length === 1) return `Winner: ${remainingPlayers[0].name}`;
      
      const winnerNames = remainingPlayers.map(player => player.name).join(" - ");
      return `Winners: ${winnerNames}`;
    };

    return (
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>
          {gameCompleted ? "🎉 Game Completed!" : "Game Over"}
        </Text>
        
        {gameCompleted && isMultiplayer ? (
          // Multiplayer: All items solved
          <>
            <Text style={[styles.modalText, { fontWeight: "bold", color: "#4CAF50", fontSize: 18 }]}>
              All {items.length} items solved!
            </Text>
            
            {/* Show winners */}
            <Text style={[styles.modalText, { fontWeight: "bold", fontSize: 16, marginTop: 10 }]}>
              {getWinnerDisplay()}
            </Text>

            {/* Show player status */}
            {isCurrentPlayerWinner ? (
              <Text style={[styles.modalText, { color: "#4CAF50", fontWeight: "bold" }]}>
                🏆 You are a winner!
              </Text>
            ) : playerEliminated ? (
              <Text style={[styles.modalText, { color: "#FF4444", fontWeight: "bold" }]}>
                ❌ You were eliminated
              </Text>
            ) : (
              <Text style={[styles.modalText, { color: "#FFA500", fontWeight: "bold" }]}>
                ⚠️ You did not win
              </Text>
            )}
          </>
        ) : gameCompleted ? (
          // Single player victory
          <>
            <Text style={[styles.modalText, { fontWeight: "bold", color: "#4CAF50", fontSize: 18 }]}>
              You solved all {items.length} items!
            </Text>
            {mode === "fastest" && (
              <Text style={styles.modalText}>
                Your time: {formatTime(time)}
              </Text>
            )}
          </>
        ) : (
          // Regular game over (not all items solved)
          <>
            {winner && (
              <Text style={{ fontWeight: "bold", marginBottom: 8, fontSize: 18, color: '#FFD700' }}>
                Winner: {winner.name}
              </Text>
            )}
            <Text style={styles.modalText}>
              Solved {solvedCount} / {items.length} items
            </Text>
          </>
        )}
        
        <Text style={styles.modalText}>
          You solved {playerSolvedCount} items
        </Text>

        <TouchableOpacity onPress={onCloseGameModal} style={styles.modalButton}>
          <Text style={{ color: "red", fontSize: 16 }}>
            Close
          </Text>
        </TouchableOpacity>

        {/* Show "Return to Topics" for single player, "Return to Lobby" for multiplayer */}
        {isSinglePlayer ? (
          <TouchableOpacity onPress={handleReturnToTopics} style={styles.modalButton}>
            <Text style={{ color: "blue", fontSize: 16 }}>
              Return to Topics
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onReturnToLobby} style={styles.modalButton}>
            <Text style={{ color: "blue", fontSize: 16 }}>
              Return to Lobby
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onLeaveGame} style={styles.modalButton}>
          <Text style={{ color: "gray", fontSize: 16 }}>
            {isSinglePlayer ? "Exit Game" : "Leave Game"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      {/* Selection Modal (Hide & Seek and Trap modes only) */}
      {(isHideAndSeek || isTrap) && (
        <Modal 
          visible={selectionModalVisible} 
          transparent 
          animationType="fade"
        >
          <View style={styles.modalBackground}>
            {getSelectionModalContent()}
          </View>
        </Modal>
      )}

      {/* Countdown Modal (Hide & Seek and Trap modes only) */}
      {(isHideAndSeek || isTrap) && (
        <Modal 
          visible={countdownModalVisible} 
          transparent 
          animationType="fade"
        >
          <View style={styles.modalBackground}>
            {renderCountdownModal()}
          </View>
        </Modal>
      )}

      {/* Game Over Modal (all game modes) */}
      <Modal 
        visible={gameModalVisible} 
        transparent 
        animationType="fade"
        onRequestClose={onCloseGameModal}
      >
        <View style={styles.modalBackground}>
          {renderGameOverModal()}
        </View>
      </Modal>
    </>
  );
}

// Export the game mode constants for use in other components
export { GAME_MODES };