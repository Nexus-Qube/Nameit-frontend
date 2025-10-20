import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import styles from "../styles/GameScreenStyles";

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
  
  // Action handlers
  onReturnToLobby = () => {},
  onLeaveGame = () => {},
  
  // Game mode
  gameMode = 1, // 1: Marathon, 2: Hide & Seek, 3: Trap
}) {
  // Selection modal content based on game mode
  const getSelectionModalContent = () => {
    const getModalTitle = () => {
      switch (gameMode) {
        case 2: return "Choose Your Hide & Seek Item";
        case 3: return "Set Your Trap";
        default: return selectionPhaseText;
      }
    };

    const getModalDescription = () => {
      switch (gameMode) {
        case 2: return "Select an item that other players will try to find. If someone finds your item, you're eliminated!";
        case 3: return "Choose an item to set as your trap. If another player finds your trap item, THEY get eliminated!";
        default: return selectionDescription;
      }
    };

    const getConfirmButtonProps = () => {
      switch (gameMode) {
        case 2: return { text: "Confirm Selection", color: "#007AFF" };
        case 3: return { text: "Set Trap", color: "#FF4444" };
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
            ✅ {gameMode === 3 ? 'Your trap is set:' : 'You selected:'} {mySpecialItem.name}
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
          Waiting for all players to {gameMode === 3 ? 'set their traps' : 'choose their items'}...
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
          color: gameMode === 3 ? '#FF4444' : '#FFD700' 
        }]}>
          {String(gameStartCountdown)}
        </Text>
      </View>
      <Text style={styles.modalText}>
        {gameStartCountdown > 0 ? 'Get ready!' : 'Game starting now!'}
      </Text>
    </View>
  );

  // Game over modal
  const renderGameOverModal = () => (
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Game Over</Text>
      {winner && (
        <Text style={{ fontWeight: "bold", marginBottom: 8, fontSize: 18 }}>
          Winner: {winner.name}
        </Text>
      )}
      <Text style={styles.modalText}>
        Solved {solvedCount} / {items.length} items
      </Text>
      <Text style={styles.modalText}>
        You solved {playerSolvedCount} items
      </Text>

      <TouchableOpacity onPress={onCloseGameModal} style={styles.modalButton}>
        <Text style={{ color: "red", fontSize: 16 }}>
          Close
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onReturnToLobby} style={styles.modalButton}>
        <Text style={{ color: "blue", fontSize: 16 }}>
          Return to Lobby
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onLeaveGame} style={styles.modalButton}>
        <Text style={{ color: "gray", fontSize: 16 }}>
          Leave Game
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      {/* Selection Modal (Hide & Seek and Trap modes) */}
      {(gameMode === 2 || gameMode === 3) && (
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

      {/* Countdown Modal */}
      {(gameMode === 2 || gameMode === 3) && (
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