import { useEffect, useState, useRef, useMemo, useCallback } from "react";
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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getSocket, removeGameListeners } from "../services/socket";
import { fetchTopicById, fetchItemsByTopic } from "../services/api";
import { getSpriteSheetConfig } from "../config/spriteSheetConfigs";
import { useGameLogic } from "../hooks/useGameLogic";
import { scrollToItem } from "../helpers/scrollHelpers";
import { getSpritePosition, calculateSpriteScale } from "../helpers/spriteHelpers";
import { initializeGameItems } from "../helpers/gameLogicHelpers";
import { PLAYER_COLORS, getColorById } from "../constants/PlayerColors";
import styles from "../styles/GameScreenStyles";
//import itemUnsolved from "../assets/images/item_unsolved.png";

import GameModals from "../components/GameModals";
import soundService from "../services/soundService";

const itemUnsolved = require("../assets/images/item_unsolved.png");
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

export default function ChallengeGameScreen() {
  const { width } = Dimensions.get('window');
  const params = useLocalSearchParams();
  const router = useRouter();

  // Use useMemo for layout calculations to prevent re-renders
  const { itemWidth, calculatedItemsPerRow } = useMemo(() => {
    const minItemsPerRow = 3;
    const maxItemWidth = 120; // Locked max width
    const containerPadding = 40; // 20px on each side
    const itemMargin = 8; // Total horizontal margin per item (4px on each side)

    // First, calculate how many items would fit if we use maxItemWidth
    const maxPossibleItems = Math.floor((width - containerPadding) / (maxItemWidth + itemMargin));

    // Use at least minItemsPerRow, but more if screen is wide enough
    const calculatedItemsPerRow = Math.max(minItemsPerRow, maxPossibleItems);

    // Calculate the available width for items (total width minus padding and margins)
    const availableWidth = width - containerPadding - (calculatedItemsPerRow * itemMargin);

    // Calculate item width, but don't exceed maxItemWidth
    const itemWidth = Math.min(
      maxItemWidth,
      Math.floor(availableWidth / calculatedItemsPerRow)
    );

    console.log('Screen width:', width, 'Items per row:', calculatedItemsPerRow, 'Item width:', itemWidth);
    
    return { itemWidth, calculatedItemsPerRow };
  }, [width]); // Only recalculate when width changes

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
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [soundsReady, setSoundsReady] = useState(false);

  const [winner, setWinner] = useState(null);
  const [input, setInput] = useState("");
  const [spriteInfo, setSpriteInfo] = useState({
  spriteSize: 0,        // Will be set from API (always available)
  margin: 1,            // Hardcoded since it's always 1
  spritesPerRow: 0,     // Will be set from API (always available)
  sheetWidth: 0,        // Will be set from sprite config
  sheetHeight: 0,       // Will be set from sprite config
  sheetUrl: null,       // Will be set from sprite config
  noSpriteSheet: false, // Will be set from sprite config
});
  const [modalVisible, setModalVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Answer before time runs out"
  );
  const [playerColors, setPlayerColors] = useState({}); // Store playerId -> color mapping
  const [myColor, setMyColor] = useState(null); // Current player's color

  const scrollRef = useRef(null);
  const itemRefs = useRef({});
  const inputRef = useRef(null); 
  const currentTurnRef = useRef(currentTurnPlayer.id);
  const intervalRef = useRef(null);
  const hasLeftRef = useRef(false);

  const socket = getSocket();
  currentTurnRef.current = currentTurnPlayer.id;

  // Custom hooks
  const { items, setItems, playerSolvedCount, handleItemMatch, solvedCount, incrementPlayerSolvedCount } = useGameLogic();

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

  // NEW: Function to focus the input

  const focusInput = () => {

    if (inputRef.current) {

      inputRef.current.focus();

    }

  };

   // Initialize sound service
  useEffect(() => {
    let mounted = true;

    const initializeSounds = async () => {
      try {
        console.log('🎮 Starting sound initialization for challenge game...');
        
        // Wait for sounds to load with timeout
        const loadPromise = soundService.loadSounds();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sound loading timeout')), 10000)
        );
        
        await Promise.race([loadPromise, timeoutPromise]);
        
        if (mounted) {
          setSoundsReady(true);
          console.log('✅ Sounds ready for challenge game');
        }
      } catch (error) {
        console.error('❌ Sound initialization failed:', error);
        if (mounted) {
          setSoundsReady(false);
        }
        // Game continues without sounds
      }
    };

    // Don't block game start on sound loading
    initializeSounds();

    return () => {
      mounted = false;
      // Don't unload sounds immediately as they might be needed by other components
      // soundService.unloadSounds();
    };
  }, []);

  // NEW: Effect to auto-focus input when it becomes player's turn

  useEffect(() => {

    if (currentTurnPlayer.id === playerId && !gameOver) {

      // Small delay to ensure the turn change has completed

      const focusTimer = setTimeout(() => {

        focusInput();

      }, 100);

      

      return () => clearTimeout(focusTimer);

    }

  }, [currentTurnPlayer.id, playerId, gameOver]);

  // --- Fetch topic + items using API ---
  useEffect(() => {
    if (!topicId) return;

    const fetchData = async () => {
      try {
        const topicData = await fetchTopicById(topicId);
        if (!topicData) return;

        // Get sprite sheet configuration from JSON config
        const spriteConfig = getSpriteSheetConfig(topicId);

        setSpriteInfo({
  spriteSize: topicData.sprite_size,      // No fallback needed - API always provides
  margin: 1,                              // Hardcoded
  spritesPerRow: topicData.sprites_per_row, // No fallback needed - API always provides
  sheetWidth: spriteConfig.width,
  sheetHeight: spriteConfig.height,
  sheetUrl: spriteConfig.src,
  noSpriteSheet: spriteConfig.noSpriteSheet || false,
});

        const itemsData = await fetchItemsByTopic(topicId);
        const initializedItems = initializeGameItems(itemsData, topicData);
        setItems(initializedItems);
        
        if (spriteConfig.noSpriteSheet) {
          console.log(`ℹ️ No sprite sheet for topic ${topicId}, using gray squares with checkmarks`);
        } else {
          console.log(`✅ Loaded sprite sheet for topic ${topicId}: ${spriteConfig.fileName}`);
        }
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

    const handleItemSolved = async ({ itemId, solvedBy }) => {
      console.log(`✅ Item ${itemId} solved by player ${solvedBy} (I am player ${playerId})`);
      
      // Play appropriate sound based on who solved the item
      if (soundsReady) {
        if (Number(solvedBy) === Number(playerId)) {
          console.log('🔊 Playing item-solved sound (my solve confirmed by server)');
          await soundService.playSound('item-solved');
        } else {
          console.log('🔊 Playing opponent-solved sound (opponent solve)');
          await soundService.playSound('opponent-solved');
        }
      } else {
        console.log('🔇 Sounds not ready, cannot play sound');
      }
      
      // Update items state first, then scroll
      setItems((prev) => {
        const updatedItems = prev.map((item) => 
          item.id === itemId ? { ...item, solved: true, solvedBy } : item
        );
        
        // Scroll after state is updated
        setTimeout(() => {
          scrollToItem(itemRefs, scrollRef, itemId, updatedItems, calculatedItemsPerRow, itemWidth);
        }, 150);
        
        return updatedItems;
      });
    };

    const handleTurnChanged = async ({ currentTurnId, currentTurnName, timeLeft, players }) => {
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
      
      const newTurnPlayerId = Number(currentTurnId);
      const isNowMyTurn = newTurnPlayerId === playerId;

      setCurrentTurnPlayer({
        id: newTurnPlayerId,
        name: currentTurnName,
      });
      setInput("");
      setTimer(timeLeft || turnTime);
      clearTimer();
      startTimer();

      // Play turn change sound
      if (soundsReady) {
        if (isNowMyTurn) {
          console.log('🔊 Playing your-turn sound (my turn started)');
          await soundService.playSound('your-turn');
        }
        // No sound for opponent's turn
      }
    };

    const handleGameOver = ({ winner }) => {
      console.log(`🏁 Game over! Winner: ${winner.name}`);
      setWinner(winner);
      setGameOver(true);
      setGameModalVisible(true);
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
  }, [lobbyId, playerId, soundsReady]);

  // --- Handle input - NO SOUND HERE, only when server confirms
  const handleInputChange = (text) => {
    setInput(text);
    
    const matched = handleItemMatch(text, currentTurnPlayer.id, playerId, gameOver);
    
    if (matched) {
      console.log(`🎯 Matched item: ${matched.name} - sending to server`);
      setInput("");
      incrementPlayerSolvedCount();

      // NO SOUND PLAYED HERE - wait for server confirmation

      socket.emit("buttonPress", {
        lobbyId,
        playerId,
        correct: true,
        itemId: matched.id,
      });

      // Scroll to the solved item - PASS THE ITEMS ARRAY
      setTimeout(() => {
        scrollToItem(itemRefs, scrollRef, matched.id, items, calculatedItemsPerRow, itemWidth);
      }, 100);
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
    setGameModalVisible(false);
    
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
    setGameModalVisible(false);
    
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

  const handleCloseGameModal = useCallback(() => {
    setGameModalVisible(false);
  }, []);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
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

        <TextInput
          ref={inputRef}
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nativeID="game-scrollview"
        >
          {items.map((item) => {
            const { left, top } = getSpritePosition(item.order, spriteInfo);
            const isSolvedOrGameOver = item.solved || gameOver;
            const scale = calculateSpriteScale(spriteInfo.spriteSize, 100);
            const borderImage = item.solvedBy ? getBorderImage(item.solvedBy) : null;

            return (
              <View 
                key={item.id} 
                style={[styles.itemContainer, { width: itemWidth }]}
                nativeID={`item-${item.id}`}
              >
                <View style={styles.outerContainer}>
                  <View 
                    style={styles.imageContainer}
                    ref={(ref) => (itemRefs.current[item.id] = ref)}
                  >
                    {/* Show unsolved background or solved content */}
                    {!item.solved ? (
                      <Image 
                        source={itemUnsolved}
                        style={styles.unsolvedBackground}
                      />
                    ) : spriteInfo.noSpriteSheet ? (
                      // Show gray square with checkmark for topics without sprite sheets
                      <View style={styles.graySquare}>
                        <Text style={styles.checkmark}>✓</Text>
                      </View>
                    ) : (
                      // Show actual sprite sheet for topics with sprite sheets
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

        {/* Game Modals Component */}
        <GameModals
          gameModalVisible={gameModalVisible}
          onCloseGameModal={handleCloseGameModal}
          winner={winner}
          solvedCount={solvedCount}
          playerSolvedCount={playerSolvedCount}
          items={items}
          onReturnToLobby={handleReturnToLobby}
          onLeaveGame={handleLeaveGame}
          gameMode={1} // Marathon mode
        />
      </View>
    </KeyboardAvoidingView>
  );
}