import { useState, useEffect, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, Clipboard, Modal } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getPlayer } from "../services/session";
import { getLobby } from "../services/api";
import { getSocket, removeWaitingRoomListeners, waitForSocketConnection } from "../services/socket";
import styles from "../styles/WaitingRoomStyles";
import { PLAYER_COLORS, getAvailableColors } from "../constants/PlayerColors";

export default function WaitingRoom() {
  const router = useRouter();
  const { code } = useLocalSearchParams();

  const [lobby, setLobby] = useState(null);
  const [player, setPlayer] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [gameMode, setGameMode] = useState(1);
  const [turnTime, setTurnTime] = useState(20);
  const [selectedColor, setSelectedColor] = useState(null);
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const socketRef = useRef(null);
  const fetchedLobbyRef = useRef(null);
  const isNavigatingToGameRef = useRef(false);

  const copyCodeToClipboard = () => {
    Clipboard.setString(code);
    Alert.alert("Copied!", "Lobby code copied to clipboard");
  };

  const updateGameSettings = (newTurnTime, newGameMode) => {
    if (!socketRef.current || !lobby?.id || !player?.id) return;
    
    socketRef.current.emit("updateGameSettings", {
      lobbyId: lobby.id,
      playerId: player.id,
      turnTime: newTurnTime,
      gameMode: newGameMode
    });
  };

  const updatePlayerColor = (colorId) => {
    if (!socketRef.current || !lobby?.id || !player?.id) return;
    
    socketRef.current.emit("updatePlayerColor", {
      lobbyId: lobby.id,
      playerId: player.id,
      color: colorId
    });
  };

  // Get current player's data from lobby
  const currentPlayerData = lobby?.players?.find(p => String(p.id) === String(player?.id));

  // Get available colors for current player
  const availableColors = lobby && lobby.players ? getAvailableColors(lobby.players, player?.id) : [];

  // Check if player can set ready (must have a color)
  const canSetReady = currentPlayerData && currentPlayerData.color !== null;

  useEffect(() => {
    let isMounted = true;

    const initializeSocketAndJoin = async () => {
      try {
        setLoading(true);
        
        const savedPlayer = await getPlayer();
        console.log("👤 Player loaded:", savedPlayer);

        if (!savedPlayer?.id) {
          router.push("/");
          return;
        }
        if (!isMounted) return;

        setPlayer(savedPlayer);

        // Wait for socket connection
        console.log("🔄 Waiting for socket connection...");
        const s = await waitForSocketConnection();
        console.log("✅ Socket connected for waiting room:", s?.id);
        
        if (!s || !s.id) {
          console.error("❌ Socket connection failed");
          Alert.alert("Connection Error", "Failed to connect to game server. Please try again.");
          return;
        }

        socketRef.current = s;
        setSocketConnected(true);

        try {
          const data = await getLobby(code);
          console.log("📥 Lobby fetched:", data);
          if (!isMounted) return;

          setLobby(data);
          fetchedLobbyRef.current = data;

          s.emit("joinWaitingRoom", {
            lobbyId: data.id,
            playerId: savedPlayer.id,
            name: savedPlayer.name,
          });
          console.log("➡️ joinWaitingRoom emitted:", {
            lobbyId: data.id,
            playerId: savedPlayer.id,
            name: savedPlayer.name,
          });
        } catch (err) {
          console.error(err);
          Alert.alert("Error", "Failed to join lobby.");
        }

        // Socket event listeners
        s.on("lobbyUpdate", (updatedLobby) => {
          console.log("📊 lobbyUpdate received:", updatedLobby);
          if (!updatedLobby) {
            console.log("❌ Empty lobby update received");
            return;
          }

          // Preserve topic_id if it's missing in the update
          if (fetchedLobbyRef.current?.topic_id && !updatedLobby.topic_id) {
            updatedLobby.topic_id = fetchedLobbyRef.current.topic_id;
          }

          console.log(`📊 Setting lobby with ${updatedLobby.players?.length || 0} players`);
          setLobby(updatedLobby);
          fetchedLobbyRef.current = updatedLobby;

          const me = updatedLobby.players?.find(
            (p) => String(p.id) === String(savedPlayer.id)
          );
          if (me) {
            setIsReady(me.is_ready);
            setSelectedColor(me.color);
          } else {
            console.log("❌ Current player not found in lobby update");
          }

          // Update local state with lobby settings
          if (updatedLobby.turnTime) {
            setTurnTime(updatedLobby.turnTime);
          }
          if (updatedLobby.gameMode) {
            setGameMode(updatedLobby.gameMode);
          }
        });

        s.on("countdown", ({ timeLeft }) => {
          console.log("⏳ Countdown:", timeLeft);
          setCountdown(timeLeft);
        });

        s.on("gameSettingsUpdated", ({ turnTime: newTurnTime, gameMode: newGameMode }) => {
          console.log("⚙️ Game settings updated:", { newTurnTime, newGameMode });
          if (newTurnTime) setTurnTime(newTurnTime);
          if (newGameMode) setGameMode(newGameMode);
        });

        s.on("colorUpdateFailed", ({ reason }) => {
          Alert.alert("Color Taken", "This color is already selected by another player. Please choose a different color.");
        });

        // Unified gameStarted handler for both game modes
        s.on("gameStarted", ({ firstTurnPlayerId, firstTurnPlayerName, turnTime: gameTurnTime, gameMode }) => {
          console.log("🎮 Game started:", {
            firstTurnPlayerId,
            firstTurnPlayerName,
            gameTurnTime,
            gameMode
          });

          const topicId = fetchedLobbyRef.current?.topic_id;
          console.log("📝 Starting game with topic_id:", topicId, "Game mode:", gameMode);

          isNavigatingToGameRef.current = true;
          removeWaitingRoomListeners();

          // Determine which game screen to navigate to based on game mode
          let screenName;
switch(gameMode) {
  case 2:
    screenName = "hideAndSeekGameScreen";
    break;
  case 3:
    screenName = "trapGameScreen";
    break;
  default:
    screenName = "challengeGameScreen";
}

console.log(`🎯 Navigating to ${screenName} for game mode ${gameMode}`);

          router.push({
            pathname: screenName,
            params: {
              lobbyId: Number(fetchedLobbyRef.current?.id),
              playerId: Number(savedPlayer.id),
              playerName: savedPlayer.name,
              code: fetchedLobbyRef.current?.code,
              firstTurnPlayerId: Number(firstTurnPlayerId),
              firstTurnPlayerName,
              turnTime: Number(gameTurnTime),
              topicId: Number(topicId),
            },
          });
        });

        s.on("playerLeft", ({ playerId, playerName }) => {
          console.log(`❌ Player ${playerName} left the lobby`);
        });

      } catch (error) {
        console.error("❌ Failed to establish socket connection:", error);
        Alert.alert("Connection Error", "Failed to connect to game server. Please try again.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeSocketAndJoin();

    return () => {
      console.log("👋 Leaving WaitingRoom — cleaning up listeners");

      if (!isNavigatingToGameRef.current) {
        const s = socketRef.current;
        if (s && fetchedLobbyRef.current?.id && player?.id) {
          s.emit("leaveLobby", {
            lobbyId: fetchedLobbyRef.current.id,
            playerId: player.id,
          });
        }
      }

      removeWaitingRoomListeners();
      isMounted = false;
    };
  }, [code]);

  const handleReady = () => {
    if (!socketRef.current || !lobby?.id || !player?.id) return;
    
    if (!canSetReady) {
      Alert.alert("Color Required", "Please select a color before setting ready.");
      return;
    }

    const newReady = !isReady;
    setIsReady(newReady);

    socketRef.current.emit("setReady", {
      lobbyId: lobby.id,
      playerId: player.id,
      isReady: newReady,
    });
  };

  const handleStart = () => {
    if (!socketRef.current || !lobby?.id) return;
    if (String(player.id) !== String(lobby.ownerId)) return;

    // Check if all players have colors
    const allPlayersHaveColors = lobby.players?.every(p => p.color !== null);
    if (!allPlayersHaveColors) {
      Alert.alert("Colors Required", "All players must select a color before starting the game.");
      return;
    }

    console.log("🚀 Start game by owner:", player.id);
    socketRef.current.emit("startGame", { lobbyId: lobby.id });
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (loading) {
    return <Text style={{ color: "#fff", textAlign: "center", marginTop: 50 }}>Connecting to game server...</Text>;
  }

  if (!lobby || !player)
    return <Text style={{ color: "#fff", textAlign: "center", marginTop: 50 }}>Loading lobby...</Text>;

  const allReady = lobby.players?.every((p) => p.is_ready);
  const isOwner = String(player.id) === String(lobby.ownerId);

  const renderPlayerItem = ({ item }) => {
    const playerColor = PLAYER_COLORS.find(color => color.id === item.color);
    
    return (
      <View style={styles.playerItem}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Text style={styles.playerName}>{item.name}</Text>
          {playerColor && playerColor.value && (
            <View 
              style={[
                styles.playerColorIndicator, 
                { backgroundColor: playerColor.value }
              ]} 
            />
          )}
        </View>
        {String(item.id) === String(lobby.ownerId) && (
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerBadgeText}>Owner</Text>
          </View>
        )}
        <Text style={[
          styles.playerStatus,
          item.is_ready ? styles.readyStatus : styles.notReadyStatus
        ]}>
          {item.is_ready ? "Ready" : "Not Ready"}
        </Text>
      </View>
    );
  };

  const renderColorOption = (color) => (
    <TouchableOpacity
      key={color.id}
      style={[
        styles.colorOption,
        { backgroundColor: color.value || "transparent" },
        selectedColor === color.id && styles.selectedColor,
        !color.available && styles.disabledColor
      ]}
      onPress={() => {
        if (color.available) {
          setSelectedColor(color.id);
          updatePlayerColor(color.id);
          setColorModalVisible(false);
        }
      }}
      disabled={!color.available}
    >
      <Text style={styles.colorOptionText}>
        {color.id === null ? "⚪" : ""}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header with Lobby Name and Code */}
      <View style={styles.header}>
        <Text style={styles.lobbyName}>{lobby.name || "Untitled Lobby"}</Text>
        <View style={styles.codeContainer}>
          <Text style={styles.lobbyCode}>{code}</Text>
          <TouchableOpacity style={styles.copyButton} onPress={copyCodeToClipboard}>
            <Text style={styles.copyButtonText}>Copy</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Countdown */}
      {countdown !== null && (
        <Text style={styles.countdownText}>Game starts in {countdown}s</Text>
      )}

      <View style={styles.contentContainer}>
        {/* Players Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Players ({lobby.players?.length || 0})</Text>
          <FlatList
            data={lobby.players || []}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPlayerItem}
            style={styles.playersList}
          />
        </View>

        {/* Player Color Selection */}
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Your Color</Text>
  <View style={styles.colorSectionContent}>
    <TouchableOpacity
      style={[
        styles.colorButton,
        selectedColor && styles.selectedColorButton
      ]}
      onPress={() => setColorModalVisible(true)}
    >
      <Text style={styles.optionText}>
        {selectedColor ? 
          `Selected: ${PLAYER_COLORS.find(c => c.id === selectedColor)?.display}` : 
          "Choose Your Color"
        }
      </Text>
    </TouchableOpacity>
    {!canSetReady && (
      <Text style={styles.colorRequiredText}>
        * You must select a color to set ready
      </Text>
    )}
  </View>
</View>

        {/* Game Rules Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Settings</Text>
          <View style={styles.rulesContainer}>
            {/* Game Mode */}
            <View style={styles.ruleItem}>
  <Text style={styles.ruleLabel}>Game Mode</Text>
  <View style={styles.optionsContainer}>
    <TouchableOpacity
      style={[
        styles.optionButton,
        gameMode === 1 && styles.selectedOption
      ]}
      onPress={() => {
        if (isOwner) {
          setGameMode(1);
          updateGameSettings(turnTime, 1);
        }
      }}
      disabled={!isOwner}
    >
      <Text style={styles.optionText}>Marathon</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.optionButton,
        gameMode === 2 && styles.selectedOption
      ]}
      onPress={() => {
        if (isOwner) {
          setGameMode(2);
          updateGameSettings(turnTime, 2);
        }
      }}
      disabled={!isOwner}
    >
      <Text style={styles.optionText}>Hide & Seek</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.optionButton,
        gameMode === 3 && styles.selectedOption
      ]}
      onPress={() => {
        if (isOwner) {
          setGameMode(3);
          updateGameSettings(turnTime, 3);
        }
      }}
      disabled={!isOwner}
    >
      <Text style={styles.optionText}>Trap</Text>
    </TouchableOpacity>
  </View>
</View>

            {/* Turn Time */}
            <View style={styles.ruleItem}>
              <Text style={styles.ruleLabel}>Turn Time</Text>
              <View style={styles.optionsContainer}>
                {[10, 20, 30].map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.optionButton,
                      turnTime === time && styles.selectedOption
                    ]}
                    onPress={() => {
                      if (isOwner) {
                        setTurnTime(time);
                        updateGameSettings(time, gameMode);
                      }
                    }}
                    disabled={!isOwner}
                  >
                    <Text style={styles.optionText}>{time}s</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {!isOwner ? (
          <TouchableOpacity
            style={[
              isReady ? styles.unreadyButton : styles.readyButton,
              !canSetReady && styles.disabledButton
            ]}
            onPress={handleReady}
            disabled={!canSetReady}
          >
            <Text style={styles.buttonText}>
              {isReady ? "Unready" : "Ready"}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[
                isReady ? styles.unreadyButton : styles.readyButton,
                !canSetReady && styles.disabledButton
              ]}
              onPress={handleReady}
              disabled={!canSetReady}
            >
              <Text style={styles.buttonText}>
                {isReady ? "Unready" : "Ready"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.startButton, (!allReady || countdown !== null) && styles.disabledButton]}
              onPress={handleStart}
              disabled={!allReady || countdown !== null}
            >
              <Text style={styles.buttonText}>Start Game</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Leave Lobby Button */}
      <TouchableOpacity
        style={styles.leaveButton}
        onPress={() => {
          if (socketRef.current && lobby?.id) {
            socketRef.current.emit("leaveLobby", {
              lobbyId: lobby.id,
              playerId: player.id,
            });
          }
          removeWaitingRoomListeners();
          router.replace("/lobbiesScreen");
        }}
      >
        <Text style={styles.buttonText}>Leave Lobby</Text>
      </TouchableOpacity>

      {/* Color Selection Modal */}
<Modal
  visible={colorModalVisible}
  transparent={true}
  animationType="fade"
  onRequestClose={() => setColorModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Choose Your Color</Text>
      
      {/* Selected Color Preview */}
      {selectedColor && (
        <>
          <View 
            style={[
              styles.colorPreview,
              { 
                backgroundColor: PLAYER_COLORS.find(c => c.id === selectedColor)?.value || '#ccc'
              }
            ]} 
          />
          <Text style={styles.selectedColorName}>
            {PLAYER_COLORS.find(c => c.id === selectedColor)?.display}
          </Text>
        </>
      )}
      
      {/* Color Grid */}
      <View style={styles.colorGrid}>
        {availableColors.map((color) => (
          <TouchableOpacity
            key={color.id}
            style={[
              styles.colorOption,
              { backgroundColor: color.value || "transparent" },
              selectedColor === color.id && styles.selectedColor,
              !color.available && styles.disabledColor
            ]}
            onPress={() => {
              if (color.available) {
                setSelectedColor(color.id);
                updatePlayerColor(color.id);
                setColorModalVisible(false);
              }
            }}
            disabled={!color.available}
          >
            <Text style={styles.colorOptionText}>
              {color.id === null ? "⚪" : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Action Buttons */}
      <TouchableOpacity
        style={styles.modalButton}
        onPress={() => setColorModalVisible(false)}
      >
        <Text style={styles.buttonText}>
          {selectedColor ? 'Confirm Color' : 'Close'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.modalButton, styles.modalCloseButton]}
        onPress={() => setColorModalVisible(false)}
      >
        <Text style={styles.buttonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </View>
  );
}