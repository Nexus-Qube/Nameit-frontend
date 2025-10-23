import { useEffect, useState, useRef, useMemo } from "react";
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

import GameModals from "../components/GameModals";

const itemUnsolved = require("../assets/images/item_unsolved.png");
// Import regular colored borders AND trap mode borders
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

const TRAP_BORDERS = {
  red: require("../assets/images/Hide&Seek/solved_border_red.png"),
  orange: require("../assets/images/Hide&Seek/solved_border_orange.png"),
  yellow: require("../assets/images/Hide&Seek/solved_border_yellow.png"),
  green: require("../assets/images/Hide&Seek/solved_border_green.png"),
  teal: require("../assets/images/Hide&Seek/solved_border_teal.png"),
  blue: require("../assets/images/Hide&Seek/solved_border_blue.png"),
  purple: require("../assets/images/Hide&Seek/solved_border_purple.png"),
  pink: require("../assets/images/Hide&Seek/solved_border_pink.png"),
  brown: require("../assets/images/Hide&Seek/solved_border_brown.png"),
  gray: require("../assets/images/Hide&Seek/solved_border_gray.png"),
};

export default function TrapGameScreen() {
  const { width } = Dimensions.get('window');
  const params = useLocalSearchParams();
  const router = useRouter();

  // Use useMemo for layout calculations
  const { itemWidth, calculatedItemsPerRow } = useMemo(() => {
    const minItemsPerRow = 3;
    const maxItemWidth = 120;
    const containerPadding = 40;
    const itemMargin = 8;

    const maxPossibleItems = Math.floor((width - containerPadding) / (maxItemWidth + itemMargin));
    const calculatedItemsPerRow = Math.max(minItemsPerRow, maxPossibleItems);
    const availableWidth = width - containerPadding - (calculatedItemsPerRow * itemMargin);
    const itemWidth = Math.min(maxItemWidth, Math.floor(availableWidth / calculatedItemsPerRow));

    return { itemWidth, calculatedItemsPerRow };
  }, [width]);

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
    spriteSize: 0,
    margin: 1,
    spritesPerRow: 0,
    sheetWidth: 0,
    sheetHeight: 0,
    sheetUrl: null,
    noSpriteSheet: false,
  });
  
  // Trap mode specific states
  const [selectionModalVisible, setSelectionModalVisible] = useState(true);
  const [trapInput, setTrapInput] = useState("");
  const [trapValidation, setTrapValidation] = useState(null);
  const [myTrapItem, setMyTrapItem] = useState(null);
  const [playerSelections, setPlayerSelections] = useState({});
  const [eliminatedPlayers, setEliminatedPlayers] = useState(new Set());
  
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Answer before time runs out");
  const [playerColors, setPlayerColors] = useState({});
  const [myColor, setMyColor] = useState(null);

  // New states for selection phase
  const [duplicateItemsWarning, setDuplicateItemsWarning] = useState(false);
  const [countdownModalVisible, setCountdownModalVisible] = useState(false);
  const [gameStartCountdown, setGameStartCountdown] = useState(0);

  const scrollRef = useRef(null);
  const itemRefs = useRef({});
  const inputRef = useRef(null);
  const currentTurnRef = useRef(currentTurnPlayer.id);
  const intervalRef = useRef(null);
  const hasLeftRef = useRef(false);
  const handlersRegisteredRef = useRef(false);
  const selectionCompleteProcessedRef = useRef(false);
  const timerValueRef = useRef(turnTime);
  const gameStartedRef = useRef(false);

  const socket = getSocket();
  currentTurnRef.current = currentTurnPlayer.id;

  // Custom hooks
  const { items, setItems, playerSolvedCount, solvedCount, incrementPlayerSolvedCount } = useGameLogic();

  // Timer functions
  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startTimer = () => {
    console.log("⏰ Starting timer, current turn:", currentTurnPlayer.id, "I am:", playerId);
    clearTimer();
    
    // Reset timer value and state
    timerValueRef.current = turnTime;
    setTimer(turnTime);
    
    intervalRef.current = setInterval(() => {
      timerValueRef.current = timerValueRef.current - 1;
      
      // Update state with the new value - this should trigger UI update
      setTimer(timerValueRef.current);
      
      console.log("⏰ Timer tick:", timerValueRef.current);
      
      if (timerValueRef.current <= 0) {
        if (!hasLeftRef.current && currentTurnRef.current === playerId && !gameOver) {
          console.log("⏰ Timer expired - auto elimination");
          handlePlayerElimination(playerId, "timeout");
        }
        clearTimer();
      }
    }, 1000);
  };

  // Function to focus the input
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Effect to auto-focus input when it becomes player's turn
  useEffect(() => {
    if (currentTurnPlayer.id === playerId && !gameOver && !eliminatedPlayers.has(playerId)) {
      console.log("🔄 Auto-focus triggered - my turn started");
      
      // Small delay to ensure the turn change has completed
      const focusTimer = setTimeout(() => {
        focusInput();
      }, 100);
      
      return () => clearTimeout(focusTimer);
    }
  }, [currentTurnPlayer.id, playerId, gameOver, eliminatedPlayers]);

  // NEW: Simple effect to detect when game starts and focus input for first player
  useEffect(() => {
    // Game starts when selection modal closes and it's the first player's turn
    if (!selectionModalVisible && !countdownModalVisible && !gameStartedRef.current) {
      gameStartedRef.current = true;
      console.log("🎮 Game started - checking if I'm first player");
      
      if (currentTurnPlayer.id === playerId) {
        console.log("🎯 I am the first player - focusing input");
        setTimeout(() => {
          focusInput();
        }, 300);
      }
    }
  }, [selectionModalVisible, countdownModalVisible, currentTurnPlayer.id, playerId]);

  // Trap mode specific functions
  const validateTrapItem = (itemName) => {
    const matchedItem = items.find(item => 
      item.name.toLowerCase() === itemName.toLowerCase().trim()
    );
    
    if (!matchedItem) {
      setTrapValidation("This item doesn't exist");
      return null;
    }
    
    setTrapValidation("Perfect trap!");
    return matchedItem;
  };

  const handleTrapConfirm = () => {
    const matchedItem = validateTrapItem(trapInput);
    
    if (matchedItem) {
      console.log(`🎯 Player ${playerId} selected trap item: ${matchedItem.name}`);
      setMyTrapItem(matchedItem);
      
      socket.emit("selectHideSeekItem", { // Using same event as hide & seek
        lobbyId,
        playerId: String(playerId),
        itemId: matchedItem.id,
        itemName: matchedItem.name
      });
    }
  };

  const handlePlayerElimination = (eliminatedPlayerId, reason) => {
    setEliminatedPlayers(prev => new Set([...prev, eliminatedPlayerId]));
    
    if (eliminatedPlayerId === playerId) {
      setStatusMessage("You're out!");
      clearTimer();
    }
    
    socket.emit("playerEliminated", {
      lobbyId,
      playerId: eliminatedPlayerId,
      reason
    });
  };

  // Fetch topic + items
  useEffect(() => {
    if (!topicId) return;

    const fetchData = async () => {
      try {
        const topicData = await fetchTopicById(topicId);
        if (!topicData) return;

        const spriteConfig = getSpriteSheetConfig(topicId);
        setSpriteInfo({
          spriteSize: topicData.sprite_size,
          margin: 1,
          spritesPerRow: topicData.sprites_per_row,
          sheetWidth: spriteConfig.width,
          sheetHeight: spriteConfig.height,
          sheetUrl: spriteConfig.src,
          noSpriteSheet: spriteConfig.noSpriteSheet || false,
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

  // Modal control functions
  const handleCloseSelectionModal = () => {
    // Only allow closing if no item is selected yet
    if (!myTrapItem) {
      setSelectionModalVisible(false);
    }
  };

  const handleCloseCountdownModal = () => {
    setCountdownModalVisible(false);
  };

  const handleCloseGameModal = () => {
    setGameModalVisible(false);
  };

  const handleSelectionInputChange = (text) => {
    setTrapInput(text);
    setTrapValidation(null);
    if (duplicateItemsWarning) setDuplicateItemsWarning(false);
  };

  // Socket listeners for Trap mode
  useEffect(() => {
    console.log(`🎮 Joining Trap game - Lobby: ${lobbyId}, Player: ${playerId}`);
    
    socket.emit("joinHideSeekGame", { lobbyId, playerId, playerName: params.playerName });

    // Prevent duplicate event handlers
    if (handlersRegisteredRef.current) {
      console.log("🔄 Event handlers already registered, skipping...");
      return;
    }
    
    handlersRegisteredRef.current = true;

    // Use a debounce mechanism for selectionPhase to prevent spam
    let selectionPhaseTimeout = null;
    const handleSelectionPhase = ({ playersSelections, hasDuplicateItems = false }) => {
      // Debounce rapid selectionPhase events
      if (selectionPhaseTimeout) {
        clearTimeout(selectionPhaseTimeout);
      }
      
      selectionPhaseTimeout = setTimeout(() => {
        console.log("🎯 Selection phase update:", playersSelections);
        console.log("🔍 Has duplicate items:", hasDuplicateItems);
        
        setPlayerSelections(playersSelections);
        setDuplicateItemsWarning(hasDuplicateItems);
        
        if (hasDuplicateItems) {
          setMyTrapItem(null);
          setTrapInput("");
          setTrapValidation(null);
        }
      }, 100);
    };

    // Handle selection countdown from backend
    const handleSelectionCountdown = ({ timeLeft }) => {
      console.log(`⏰ Selection countdown: ${timeLeft}`);
      setCountdownModalVisible(true);
      setGameStartCountdown(timeLeft);
      
      if (timeLeft === 0) {
        setTimeout(() => {
          setCountdownModalVisible(false);
        }, 500);
      }
    };

    const handleSelectionComplete = ({ playerItems, firstTurnPlayerId, firstTurnPlayerName }) => {
      // Check if already processed
      if (selectionCompleteProcessedRef.current) {
        console.log("🔄 Selection complete already processed, skipping...");
        return;
      }
      selectionCompleteProcessedRef.current = true;
      
      console.log("✅ Selection phase complete, starting game");
      console.log("📦 Received playerItems:", playerItems);
      
      // Convert player ID to string for lookup
      const playerIdStr = String(playerId);
      const myItem = playerItems[playerIdStr];
      
      setMyTrapItem(myItem);
      setDuplicateItemsWarning(false);
      
      // Update current turn player if provided by server
      if (firstTurnPlayerId && firstTurnPlayerName) {
        setCurrentTurnPlayer({
          id: Number(firstTurnPlayerId),
          name: firstTurnPlayerName,
        });
        currentTurnRef.current = Number(firstTurnPlayerId);
        console.log(`🔄 Updated current turn to player ${firstTurnPlayerId}`);
      }
      
      // Close both modals and start the game
      setSelectionModalVisible(false);
      setCountdownModalVisible(false);
      setStatusMessage("Answer before time runs out");
      
      console.log("🎮 Trap game starting now!");
      
      // Start the timer immediately for the first player
      setTimeout(() => {
        if (currentTurnRef.current === playerId) {
          console.log("⏰ I am the first player, starting my timer");
          startTimer();
        }
      }, 500);
    };

    const handleSelectionFailed = ({ reason }) => {
      Alert.alert("Selection Failed", reason);
      setTrapInput("");
      setTrapValidation(null);
      setMyTrapItem(null);
      setDuplicateItemsWarning(false);
    };

    const handleItemSolved = ({ itemId, solvedBy, isHideSeekItem, trapSprung }) => {
  console.log(`✅ Item ${itemId} solved by player ${solvedBy}, isHideSeek: ${isHideSeekItem}, trapSprung: ${trapSprung}`);
  
  // Update the item as solved in the local state
  setItems((prev) => {
    const updatedItems = prev.map((item) => 
      item.id === itemId ? { ...item, solved: true, solvedBy, isHideSeekItem, trapSprung } : item
    );
    
    setTimeout(() => {
      scrollToItem(itemRefs, scrollRef, itemId, updatedItems, calculatedItemsPerRow, itemWidth);
    }, 150);
    
    return updatedItems;
  });

  // TRAP MODE LOGIC: When someone finds YOUR trap item, THEY get eliminated
  if (trapSprung && Number(solvedBy) === Number(playerId)) {
    console.log(`💀 YOU STEPPED ON A TRAP! Eliminating yourself: ${playerId}`);
    handlePlayerElimination(playerId, "trapSprung");
  }
};

    const handleTurnChanged = ({ currentTurnId, currentTurnName, timeLeft, players }) => {
      console.log(`🔄 Turn changed to player ${currentTurnId} (${currentTurnName})`);
      
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
      
      // Update both the ref and state for timer
      timerValueRef.current = timeLeft || turnTime;
      setTimer(timeLeft || turnTime);
      
      clearTimer();
      
      // Start timer for the new turn
      if (!selectionModalVisible && !countdownModalVisible) {
        startTimer();
      }
    };

    const handleGameOver = ({ winner }) => {
      console.log(`🏁 Game over! Winner: ${winner.name}`);
      setWinner(winner);
      setGameOver(true);
      setGameModalVisible(true);
      
      // CRITICAL: Clear timer when game ends
      clearTimer();
      
      setStatusMessage(winner.id === playerId ? "You won" : "You lost");
    };

    const handlePlayerEliminated = ({ eliminatedPlayerId }) => {
      console.log(`💀 Player ${eliminatedPlayerId} eliminated`);
      setEliminatedPlayers(prev => new Set([...prev, eliminatedPlayerId]));
    };

    // Register all event listeners
    socket.on("selectionPhase", handleSelectionPhase);
    socket.on("selectionCountdown", handleSelectionCountdown);
    socket.on("selectionComplete", handleSelectionComplete);
    socket.on("selectionFailed", handleSelectionFailed);
    socket.on("itemSolved", handleItemSolved);
    socket.on("turnChanged", handleTurnChanged);
    socket.on("gameOver", handleGameOver);
    socket.on("playerEliminated", handlePlayerEliminated);

    return () => {
      console.log("🧹 Cleaning up game listeners");
      handlersRegisteredRef.current = false;
      selectionCompleteProcessedRef.current = false;
      if (selectionPhaseTimeout) {
        clearTimeout(selectionPhaseTimeout);
      }
      
      // Remove specific listeners to prevent duplicates
      socket.off("selectionPhase", handleSelectionPhase);
      socket.off("selectionCountdown", handleSelectionCountdown);
      socket.off("selectionComplete", handleSelectionComplete);
      socket.off("selectionFailed", handleSelectionFailed);
      socket.off("itemSolved", handleItemSolved);
      socket.off("turnChanged", handleTurnChanged);
      socket.off("gameOver", handleGameOver);
      socket.off("playerEliminated", handlePlayerEliminated);
      
      removeGameListeners();
      clearTimer();
    };
  }, [lobbyId, playerId, selectionModalVisible, countdownModalVisible]);

  // Add cleanup effect to prevent multiple mounts
  useEffect(() => {
    return () => {
      console.log("🔄 TrapGameScreen unmounting - cleaning up everything");
      hasLeftRef.current = true;
      clearTimer();
      removeGameListeners();
    };
  }, []);

  // Handle input during gameplay phase
  const handleInputChange = (text) => {
    if (selectionModalVisible || countdownModalVisible || eliminatedPlayers.has(playerId)) return;
    
    setInput(text);
    
    // Use a custom matching function that doesn't automatically solve items
    const matched = findMatchingItem(text);
    
    if (matched) {
      console.log("🎯 Matched item:", matched.name);
      console.log("🔍 My trap item:", myTrapItem);
      
      // Check if player is trying to solve their OWN trap item
      const isMyOwnItem = myTrapItem && matched.id === myTrapItem.id;
      
      if (isMyOwnItem) {
        console.log("🚫 BLOCKED: Player tried to solve their own trap item");
        
        // Show warning to the player
        Alert.alert(
          "Not Allowed",
          "You cannot solve your own trap item! Choose a different item.",
          [{ text: "OK" }]
        );
        
        // Clear input and don't send to backend OR update local state
        setInput("");
        return;
      }
      
      console.log(`✅ ALLOWED: Solving item that is not my trap item`);
      setInput("");
      incrementPlayerSolvedCount();
      
      // Check if this is someone ELSE'S trap item
      const isTrapItem = Object.values(playerSelections).some(
  selectedItem => selectedItem.id === matched.id && selectedItem.id !== myTrapItem?.id
);

console.log("🔍 Is this someone else's trap item?", isTrapItem);

socket.emit("buttonPress", {
  lobbyId,
  playerId,
  correct: true,
  itemId: matched.id,
  isHideSeekItem: isTrapItem // This tells the backend it's a special item
});

      setTimeout(() => {
        scrollToItem(itemRefs, scrollRef, matched.id, items, calculatedItemsPerRow, itemWidth);
      }, 100);
    }
  };

  // Custom matching function that doesn't automatically solve items locally
  const findMatchingItem = (inputText) => {
    if (Number(currentTurnPlayer.id) !== Number(playerId) || gameOver) {
      return null;
    }

    const normalizedInput = inputText.trim().toLowerCase();
    
    return items.find(
      (item) =>
        !item.solved &&
        item.correct.some(correctAnswer => 
          correctAnswer.toLowerCase() === normalizedInput
        )
    );
  };

  // Get the appropriate border image
  const getBorderImage = (solvedByPlayerId, isTrapItem = false) => {
    const colorId = playerColors[solvedByPlayerId];
    if (!colorId) return null;
    
    const color = getColorById(colorId);
    if (!color || !color.name) return null;
    
    const colorName = color.name.toLowerCase();
    return isTrapItem ? TRAP_BORDERS[colorName] : COLORED_BORDERS[colorName];
  };

  const getMyColorDisplay = () => {
    if (!myColor) return "No color selected";
    const color = getColorById(myColor);
    return color ? color.display : "No color";
  };

  // --- Return to lobby ---
  const handleReturnToLobby = () => {
    if (currentTurnPlayer.id === playerId && !gameOver && timer > 0 && !selectionModalVisible) {
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
    
    // Reset all game-specific states
    setSelectionModalVisible(false);
    setCountdownModalVisible(false);
    setMyTrapItem(null);
    setTrapInput("");
    setTrapValidation(null);
    setEliminatedPlayers(new Set());
    setInput("");
    
    console.log(`🔄 Returning to waiting room: lobby ${lobbyId}, player ${playerId}`);
    
    // Emit returnToWaitingRoom and wait for lobbyUpdate before navigating
    socket.emit("returnToWaitingRoom", { lobbyId, playerId });
    
    // Set up a one-time listener for lobbyUpdate to ensure we have the latest state
    const handleLobbyUpdate = (updatedLobby) => {
      console.log("📥 Received lobby update after returning:", updatedLobby);
      socket.off("lobbyUpdate", handleLobbyUpdate);
      
      // Small delay to ensure the waiting room is ready
      setTimeout(() => {
        removeGameListeners();
        router.replace({
          pathname: "/waitingRoom",
          params: {
            code: params.code,
            playerId,
            playerName: params.playerName,
          },
        });
      }, 500);
    };
    
    socket.on("lobbyUpdate", handleLobbyUpdate);
    
    // Fallback: if no lobbyUpdate received within 3 seconds, navigate anyway
    const fallbackTimeout = setTimeout(() => {
      console.log("⚠️ Fallback navigation - no lobbyUpdate received");
      socket.off("lobbyUpdate", handleLobbyUpdate);
      removeGameListeners();
      router.replace({
        pathname: "/waitingRoom",
        params: {
          code: params.code,
          playerId,
          playerName: params.playerName,
        },
      });
    }, 3000);
    
    // Clean up fallback if lobbyUpdate is received
    socket.once("lobbyUpdate", () => {
      clearTimeout(fallbackTimeout);
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

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={{ flex: 1, padding: 20 }}>
        {/* Game Header */}
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
                statusMessage === "You're out!" && { color: "red" },
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
                eliminatedPlayers.has(playerId) && { color: "red" },
              ]}
            >
              {eliminatedPlayers.has(playerId) 
                ? "You're out!" 
                : currentTurnPlayer.id === playerId
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

        <TextInput
          ref={inputRef}
          placeholder={
            eliminatedPlayers.has(playerId) 
              ? "You're eliminated" 
              : currentTurnPlayer.id === playerId
                ? "Type item name..."
                : "Wait for your turn..."
          }
          value={input}
          onChangeText={handleInputChange}
          style={[
            styles.input,
            (currentTurnPlayer.id !== playerId || eliminatedPlayers.has(playerId)) && { backgroundColor: "#ddd" },
          ]}
          autoCapitalize="none"
          autoCorrect={false}
          editable={currentTurnPlayer.id === playerId && !gameOver && !eliminatedPlayers.has(playerId) && !selectionModalVisible && !countdownModalVisible}
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
  
  // Get border image - use trap borders when a trap is sprung
  const colorId = item.solvedBy ? playerColors[item.solvedBy] : null;
  const color = colorId ? getColorById(colorId) : null;
  const colorName = color ? color.name.toLowerCase() : null;
  const borderImage = item.solvedBy ? 
    (item.trapSprung ? TRAP_BORDERS[colorName] : COLORED_BORDERS[colorName]) : 
    null;
  
  const isMyTrapItem = myTrapItem && myTrapItem.id === item.id;

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
          {/* My trap item indicator - ALWAYS show if it's my item */}
          {isMyTrapItem && !item.solved && (
            <View style={styles.myHideSeekIndicator}>
              <Text style={styles.myHideSeekText}>YOUR TRAP</Text>
            </View>
          )}

          {/* Show unsolved background or solved content */}
          {!item.solved ? (
            <Image 
              source={itemUnsolved}
              style={styles.unsolvedBackground}
            />
          ) : spriteInfo.noSpriteSheet ? (
            <View style={styles.graySquare}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
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
        
        {/* Colored border overlay - use trap borders when trap is sprung */}
        {item.solved && borderImage && (
          <Image 
            source={borderImage}
            style={styles.borderOverlay}
          />
        )}
        
        {/* Trap sprung indicator */}
        {item.trapSprung && (
          <View style={styles.trapSprungIndicator}>
            <Text style={styles.trapSprungText}>💀 TRAP!</Text>
          </View>
        )}
      </View>

      {/* Show item name only if it's solved OR it's game over OR it's my trap item */}
      {(isSolvedOrGameOver || isMyTrapItem) && (
        <Text
          style={{
            color: item.solved ? "#fff" : isMyTrapItem ? "#FF4444" : "gray",
            textAlign: "center",
            marginTop: 4,
            fontSize: isMyTrapItem ? 12 : 14,
            fontWeight: isMyTrapItem ? "bold" : "normal",
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
          selectionModalVisible={selectionModalVisible}
          countdownModalVisible={countdownModalVisible}
          gameModalVisible={gameModalVisible}
          onCloseSelectionModal={handleCloseSelectionModal}
          onCloseCountdownModal={handleCloseCountdownModal}
          onCloseGameModal={handleCloseGameModal}
          selectionInput={trapInput}
          onSelectionInputChange={handleSelectionInputChange}
          selectionValidation={trapValidation}
          onSelectionConfirm={handleTrapConfirm}
          mySpecialItem={myTrapItem}
          duplicateItemsWarning={duplicateItemsWarning}
          gameStartCountdown={gameStartCountdown}
          winner={winner}
          solvedCount={solvedCount}
          playerSolvedCount={playerSolvedCount}
          items={items}
          onReturnToLobby={handleReturnToLobby}
          onLeaveGame={handleLeaveGame}
          gameMode={3} // Trap mode
        />
      </View>
    </KeyboardAvoidingView>
  );
}