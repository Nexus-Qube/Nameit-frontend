import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  Modal,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getSocket, removeGameListeners } from "../services/socket";
import { fetchTopicById, fetchItemsByTopic } from "../services/api";
import { useGameLogic } from "../hooks/useGameLogic";
import { scrollToItem } from "../helpers/scrollHelpers";
import { getSpritePosition, calculateSpriteScale } from "../helpers/spriteHelpers";
import { initializeGameItems } from "../helpers/gameLogicHelpers";
import { PLAYER_COLORS, getColorById } from "../constants/PlayerColors";
import styles from "../styles/GameScreenStyles";
import itemUnsolved from "../assets/images/item_unsolved.png";

// Import all colored borders
const COLORED_BORDERS = {
  red: require("../assets/images/solved_border_red.png"),
  orange: require("../assets/images/solved_border_orange.png"),
  yellow: require("../assets/images/solved_border_yellow.png"),
  green: require("../assets/images/solved_border_green.png"),
  teal: require("../assets/images/solved_border_teal.png"),
  blue: require("../assets/images/solved_border_blue.png"),
  purple: require("../assets/images/solved_border_purple.png"),
  pink: require("../assets/images/solved_border_pink.png"),
  brown: require("../assets/images/solved_border_brown.png"),
  gray: require("../assets/images/solved_border_gray.png"),
};

// Default sprite sheet info
const DEFAULT_SPRITE_SIZE = 120;
const DEFAULT_MARGIN = 1;
const DEFAULT_SPRITES_PER_ROW = 10;
const DEFAULT_SHEET_WIDTH = 2381;
const DEFAULT_SHEET_HEIGHT = 2180;

export default function ChallengeGameScreen() {
  const { width } = Dimensions.get('window');
  const itemWidth = width >= 400 ? 120 : '30%';

  const params = useLocalSearchParams();
  const router = useRouter();

  const lobbyId = Number(params.lobbyId);
  const playerId = Number(params.playerId);
  const firstTurnPlayerId = Number(params.firstTurnPlayerId);
  const firstTurnPlayerName = params.firstTurnPlayerName || "Unknown";
  const turnTime = Number(params.turnTime) || 10;
  const paramTopicId = Number(params.topicId);

  const [topicId, setTopicId] = useState(paramTopicId || null);
  const [currentTurnPlayer, setCurrentTurnPlayer] = useState({
    id: firstTurnPlayerId,
    name: firstTurnPlayerName,
  });
  const [timer, setTimer] = useState(turnTime);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [input, setInput] = useState("");
  const [spriteInfo, setSpriteInfo] = useState({
    spriteSize: DEFAULT_SPRITE_SIZE,
    margin: DEFAULT_MARGIN,
    spritesPerRow: DEFAULT_SPRITES_PER_ROW,
    sheetWidth: DEFAULT_SHEET_WIDTH,
    sheetHeight: DEFAULT_SHEET_HEIGHT,
    sheetUrl: null,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Answer before time runs out"
  );
  const [playerColors, setPlayerColors] = useState({}); // Store playerId -> color mapping
  const [myColor, setMyColor] = useState(null); // Current player's color

  const scrollRef = useRef(null);
  const itemRefs = useRef({});
  const currentTurnRef = useRef(currentTurnPlayer.id);
  const intervalRef = useRef(null);
  const hasLeftRef = useRef(false);

  const socket = getSocket();
  currentTurnRef.current = currentTurnPlayer.id;

  // Custom hooks
  const { items, setItems, playerSolvedCount, handleItemMatch, solvedCount, incrementPlayerSolvedCount } = useGameLogic();

  const localSheets = {
    3: {
      src: require("../assets/images/spritesheet_pokemon21.png"),
      width: 3871,
      height: 2904,
    },
    4: {
      src: require("../assets/images/spritesheet_lol.png"),
      width: 1211,
      height: 2179,
    },
  };

  // --- Timer functions ---
  const clearTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
  
  const startTimer = () => {
    clearTimer();
    setTimer(turnTime);
    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) {
          if (!hasLeftRef.current && currentTurnRef.current === playerId && !gameOver) {
            console.log("⏰ Timer expired - auto buttonPress (wrong)");
            socket.emit("buttonPress", { lobbyId, playerId, correct: false, timeout: true });
            setStatusMessage("You lost");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // --- Fetch topic + items using API ---
  useEffect(() => {
    if (!topicId) return;

    const fetchData = async () => {
      try {
        const topicData = await fetchTopicById(topicId);
        if (!topicData) return;

        const sheet = localSheets[topicId] || {
          src: require("../assets/images/spritesheet_pokemon21.png"),
          width: DEFAULT_SHEET_WIDTH,
          height: DEFAULT_SHEET_HEIGHT,
        };

        setSpriteInfo({
          spriteSize: topicData.sprite_size || DEFAULT_SPRITE_SIZE,
          margin: DEFAULT_MARGIN,
          spritesPerRow: topicData.sprites_per_row || DEFAULT_SPRITES_PER_ROW,
          sheetWidth: sheet.width,
          sheetHeight: sheet.height,
          sheetUrl: sheet.src,
        });

        const itemsData = await fetchItemsByTopic(topicId);
        const initializedItems = initializeGameItems(itemsData, topicData);
        setItems(initializedItems);
      } catch (err) {
        console.error("Error fetching topic/items:", err);
      }
    };

    fetchData();
  }, [topicId]);

  // --- Socket listeners ---
  useEffect(() => {
    console.log(`🎮 Joining game - Lobby: ${lobbyId}, Player: ${playerId}, First Turn: ${firstTurnPlayerId}`);
    
    socket.emit("joinGame", { lobbyId, playerId, playerName: params.playerName });

    const handleInitItems = ({ solvedItems, players }) => {
      console.log(`📦 Received initItems with ${solvedItems.length} solved items and players:`, players);
      
      // Update player colors mapping
      if (players && Array.isArray(players)) {
        const colorMap = {};
        players.forEach(player => {
          colorMap[player.id] = player.color;
          if (String(player.id) === String(playerId)) {
            setMyColor(player.color);
          }
        });
        setPlayerColors(colorMap);
      }
      
      setItems((prev) =>
        prev.map((item) => (solvedItems.includes(item.id) ? { ...item, solved: true } : item))
      );
    };

    const handleItemSolved = ({ itemId, solvedBy }) => {
      console.log(`✅ Item ${itemId} solved by player ${solvedBy}`);
      
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, solved: true, solvedBy } : item))
      );

      // Removed flip animation, just scroll to item
      setTimeout(() => {
        scrollToItem(itemRefs, scrollRef, itemId);
      }, 100);
    };

    const handleTurnChanged = ({ currentTurnId, currentTurnName, timeLeft, players }) => {
      console.log(`🔄 Turn changed to player ${currentTurnId} (${currentTurnName})`);
      
      // Update player colors if provided
      if (players && Array.isArray(players)) {
        const colorMap = {};
        players.forEach(player => {
          colorMap[player.id] = player.color;
          if (String(player.id) === String(playerId)) {
            setMyColor(player.color);
          }
        });
        setPlayerColors(colorMap);
      }
      
      setCurrentTurnPlayer({
        id: Number(currentTurnId),
        name: currentTurnName,
      });
      setInput("");
      setTimer(timeLeft || turnTime);
      clearTimer();
      startTimer();
    };

    const handleGameOver = ({ winner }) => {
      console.log(`🏁 Game over! Winner: ${winner.name}`);
      setWinner(winner);
      setGameOver(true);
      setModalVisible(true);
      clearTimer();

      setStatusMessage(winner.id === playerId ? "You won" : "You lost");
    };

    const handlePlayerLeft = ({ playerId, playerName }) => {
      console.log(`❌ Player ${playerName} left the game`);
    };

    socket.on("initItems", handleInitItems);
    socket.on("itemSolved", handleItemSolved);
    socket.on("turnChanged", handleTurnChanged);
    socket.on("gameOver", handleGameOver);
    socket.on("playerLeft", handlePlayerLeft);

    startTimer();

    return () => {
      removeGameListeners();
      clearTimer();
    };
  }, [lobbyId, playerId]);

  // --- Handle input ---
  const handleInputChange = (text) => {
    setInput(text);
    
    const matched = handleItemMatch(text, currentTurnPlayer.id, playerId, gameOver);
    
    if (matched) {
      console.log(`🎯 Matched item: ${matched.name}`);
      setInput("");
      incrementPlayerSolvedCount();
      socket.emit("buttonPress", {
        lobbyId,
        playerId,
        correct: true,
        itemId: matched.id,
      });
    }
  };

  // --- Return to lobby ---
  const handleReturnToLobby = () => {
    if (currentTurnPlayer.id === playerId && !gameOver && timer > 0) {
      Alert.alert(
        "Still Your Turn",
        "You cannot return to lobby during your turn. Wait for your turn to end or let the timer expire.",
        [{ text: "OK" }]
      );
      return;
    }
  
    hasLeftRef.current = true;
    clearTimer();
    setGameOver(false);
    setWinner(null);
    setModalVisible(false);
    
    socket.emit("returnToWaitingRoom", { lobbyId, playerId });
    removeGameListeners();
    
    router.replace({
      pathname: "/waitingRoom",
      params: {
        code: params.code,
        playerId,
        playerName: params.playerName,
      },
    });
  };

  // Handle manual leave game (not returning to lobby)
  const handleLeaveGame = () => {
    hasLeftRef.current = true;
    clearTimer();
    setGameOver(false);
    setWinner(null);
    setModalVisible(false);
    
    socket.emit("leaveGame", { lobbyId, playerId });
    removeGameListeners();
    
    router.replace("/lobbiesScreen");
  };

  // Get the appropriate border image based on player color
  const getBorderImage = (solvedByPlayerId) => {
    const colorId = playerColors[solvedByPlayerId];
    if (!colorId) return null;
    
    const color = getColorById(colorId);
    if (!color || !color.name) return null;
    
    const colorName = color.name.toLowerCase();
    return COLORED_BORDERS[colorName];
  };

  // Get color display for current player
  const getMyColorDisplay = () => {
    if (!myColor) return "No color selected";
    const color = getColorById(myColor);
    return color ? color.display : "No color";
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <View style={styles.topRow}>
        <View style={styles.rowLeft}>
          <TouchableOpacity onPress={handleReturnToLobby}>
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
            ]}
          >
            {statusMessage}
          </Text>
        </View>

        <View style={styles.rowRight}>
          <Text style={styles.counter}>
            {solvedCount} / {items.length}
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.rowLeft}>
          <Text style={styles.countdown}>{timer}s</Text>
        </View>

        <View style={styles.rowSection}>
          <Text
            style={[
              styles.counter,
              currentTurnPlayer.id === playerId && { color: "green" },
            ]}
          >
            {currentTurnPlayer.id === playerId
              ? "Your turn!"
              : `${currentTurnPlayer.name}'s turn`}
          </Text>
        </View>

        <View style={styles.rowRight}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.counter}>
              You solved {playerSolvedCount}
            </Text>
            {myColor && (
              <Text style={{ color: '#fff', fontSize: 12, marginTop: 2 }}>
                Your color: {getMyColorDisplay()}
              </Text>
            )}
          </View>
        </View>
      </View>

      <TextInput
        placeholder={
          currentTurnPlayer.id === playerId
            ? "Type item name..."
            : "Wait for your turn..."
        }
        value={input}
        onChangeText={handleInputChange}
        style={[
          styles.input,
          currentTurnPlayer.id !== playerId && { backgroundColor: "#ddd" },
        ]}
        autoCapitalize="none"
        autoCorrect={false}
        editable={currentTurnPlayer.id === playerId && !gameOver}
      />

      <ScrollView 
        contentContainerStyle={styles.grid} 
        ref={scrollRef}
        showsVerticalScrollIndicator={true}
      >
        {items.map((item) => {
          const { left, top } = getSpritePosition(item.order, spriteInfo);
          const isSolvedOrGameOver = item.solved || gameOver;
          const scale = calculateSpriteScale(spriteInfo.spriteSize, 100);
          const borderImage = item.solvedBy ? getBorderImage(item.solvedBy) : null;

          return (
            <View key={item.id} style={[styles.itemContainer, { width: itemWidth }]}>
              <View style={styles.outerContainer}>
                <View 
                  style={styles.imageContainer}
                  ref={(ref) => (itemRefs.current[item.id] = ref)}
                >
                  {/* Show unsolved background or solved sprite */}
                  {!item.solved ? (
                    <Image 
                      source={itemUnsolved}
                      style={styles.unsolvedBackground}
                    />
                  ) : (
                    <Image
                      source={spriteInfo.sheetUrl}
                      style={{
                        width: spriteInfo.sheetWidth * scale,
                        height: spriteInfo.sheetHeight * scale,
                        transform: [
                          { translateX: -left * scale },
                          { translateY: -top * scale },
                        ],
                      }}
                    />
                  )}
                </View>
                
                {/* Colored border overlay - only for solved items */}
                {item.solved && borderImage && (
                  <Image 
                    source={borderImage}
                    style={styles.borderOverlay}
                  />
                )}
              </View>

              {isSolvedOrGameOver && (
                <Text
                  style={{
                    color: item.solved ? "#fff" : "gray",
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  {item.name}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Game Over</Text>
            {winner && (
              <Text style={{ fontWeight: "bold", marginBottom: 8 }}>
                Winner: {winner.name}
              </Text>
            )}
            <Text style={styles.modalText}>
              Solved {solvedCount} / {items.length} items
            </Text>
            <Text style={styles.modalText}>
              You solved {playerSolvedCount} items
            </Text>

            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalButton}>
              <Text style={{ color: "red", fontSize: 16 }}>
                Close
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleReturnToLobby} style={styles.modalButton}>
              <Text style={{ color: "blue", fontSize: 16 }}>
                Return to Lobby
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLeaveGame} style={styles.modalButton}>
              <Text style={{ color: "gray", fontSize: 16 }}>
                Leave Game
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}