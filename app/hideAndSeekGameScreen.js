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
//import itemUnsolved from "../assets/images/item_unsolved.png";

import GameModals from "../components/GameModals";
import soundService from "../services/soundService";

const itemUnsolved = require("../assets/images/item_unsolved.png");
// Import regular colored borders AND hide & seek borders
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

const HIDE_SEEK_BORDERS = {
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

export default function HideAndSeekGameScreen() {
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
  
  // Hide & Seek specific states
  const [selectionModalVisible, setSelectionModalVisible] = useState(true);
  const [hideSeekInput, setHideSeekInput] = useState("");
  const [hideSeekValidation, setHideSeekValidation] = useState(null); // Changed to null
  const [myHideSeekItem, setMyHideSeekItem] = useState(null);
  const [playerSelections, setPlayerSelections] = useState({});
  const [eliminatedPlayers, setEliminatedPlayers] = useState(new Set());
  
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Answer before time runs out");
  const [playerColors, setPlayerColors] = useState({});
  const [myColor, setMyColor] = useState(null);

  const [soundsReady, setSoundsReady] = useState(false);

  // New states for selection phase
  const [duplicateItemsWarning, setDuplicateItemsWarning] = useState(false);
  const [countdownModalVisible, setCountdownModalVisible] = useState(false);
  const [gameStartCountdown, setGameStartCountdown] = useState(0);

  const scrollRef = useRef(null);
  const itemRefs = useRef({});
  const inputRef = useRef(null);
  const selectionPhaseTimeoutRef = useRef(null);
  const currentTurnRef = useRef(currentTurnPlayer.id);
  const intervalRef = useRef(null);
  const hasLeftRef = useRef(false);
  const handlersRegisteredRef = useRef(false);
  const selectionCompleteProcessedRef = useRef(false);
  const timerValueRef = useRef(turnTime);
  const gameStartedRef = useRef(false); // NEW: Track if game has started

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

  // Initialize sound service
  useEffect(() => {
    const initializeSounds = async () => {
      try {
        await soundService.loadSounds();
        setSoundsReady(true);
        console.log('🔊 Sounds initialized successfully for hide & seek game');
      } catch (error) {
        console.error('🔇 Failed to initialize sounds:', error);
        setSoundsReady(false);
      }
    };

    initializeSounds();

    // Cleanup sounds on unmount
    return () => {
      soundService.unloadSounds();
    };
  }, []);

  // Hide & Seek specific functions
  const validateHideSeekItem = (itemName) => {
    const matchedItem = items.find(item => 
      item.name.toLowerCase() === itemName.toLowerCase().trim()
    );
    
    if (!matchedItem) {
      setHideSeekValidation("This item doesn't exist");
      return null;
    }
    
    setHideSeekValidation("Good choice!");
    return matchedItem;
  };

  const handleHideSeekConfirm = () => {
    const matchedItem = validateHideSeekItem(hideSeekInput);
    
    if (matchedItem) {
      console.log(`🎯 Player ${playerId} selected hide & seek item: ${matchedItem.name}`);
      setMyHideSeekItem(matchedItem);
      
      socket.emit("selectHideSeekItem", {
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
    if (!myHideSeekItem) {
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
    setHideSeekInput(text);
    setHideSeekValidation(null);
    if (duplicateItemsWarning) setDuplicateItemsWarning(false);
  };

  // Socket listeners for Hide & Seek
  useEffect(() => {
    console.log(`🎮 Joining Hide & Seek game - Lobby: ${lobbyId}, Player: ${playerId}`);
    
    socket.emit("joinHideSeekGame", { lobbyId, playerId, playerName: params.playerName });

    // Use a debounce mechanism for selectionPhase to prevent spam
    const handleSelectionPhase = ({ playersSelections, hasDuplicateItems = false }) => {
      // Debounce rapid selectionPhase events
      if (selectionPhaseTimeoutRef.current) {
        clearTimeout(selectionPhaseTimeoutRef.current);
      }
      
      selectionPhaseTimeoutRef.current = setTimeout(() => {
        console.log("🎯 Selection phase update:", playersSelections);
        console.log("🔍 Has duplicate items:", hasDuplicateItems);
        
        setPlayerSelections(playersSelections);
        setDuplicateItemsWarning(hasDuplicateItems);
        
        if (hasDuplicateItems) {
          setMyHideSeekItem(null);
          setHideSeekInput("");
          setHideSeekValidation(null);
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
      
      setMyHideSeekItem(myItem);
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
      
      console.log("🎮 Game starting now!");
      
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
      setHideSeekInput("");
      setHideSeekValidation(null);
      setMyHideSeekItem(null);
      setDuplicateItemsWarning(false);
    };

    const handleItemSolved = async ({ itemId, solvedBy, isHideSeekItem }) => {
      console.log(`✅ Item ${itemId} solved by player ${solvedBy}, isHideSeek: ${isHideSeekItem}`);

      // Play appropriate sound based on the type of item solved
      if (soundsReady) {
        if (isHideSeekItem) {
          console.log('🔊 Playing hide-seek-found sound (hide & seek item found)');
          await soundService.playSound('hide-seek-found');
        } else {
          if (Number(solvedBy) === Number(playerId)) {
            console.log('🔊 Playing item-solved sound (my solve)');
            await soundService.playSound('item-solved');
          } else {
            console.log('🔊 Playing opponent-solved sound (opponent solve)');
            await soundService.playSound('opponent-solved');
          }
        }
      } else {
        console.log('🔇 Sounds not ready, cannot play sound');
      }
      
      // Update the item as solved in the local state
      setItems((prev) => {
        const updatedItems = prev.map((item) => 
          item.id === itemId ? { ...item, solved: true, solvedBy, isHideSeekItem } : item
        );
        
        setTimeout(() => {
          scrollToItem(itemRefs, scrollRef, itemId, updatedItems, calculatedItemsPerRow, itemWidth);
        }, 150);
        
        return updatedItems;
      });

      // Check if this was someone's hide & seek item
      if (isHideSeekItem) {
        // Find which player owned this hide & seek item
        Object.entries(playerSelections).forEach(([hideSeekPlayerId, selectedItem]) => {
          if (selectedItem.id === itemId && Number(hideSeekPlayerId) !== Number(solvedBy)) {
            console.log(`🎯 Hide & Seek item found! Eliminating player ${hideSeekPlayerId}`);
            handlePlayerElimination(Number(hideSeekPlayerId), "hideSeekItemFound");
          }
        });
      }
    };

    const handleTurnChanged = async ({ currentTurnId, currentTurnName, timeLeft, players }) => {
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

      const newTurnPlayerId = Number(currentTurnId);
      const isNowMyTurn = newTurnPlayerId === playerId;
      
      setCurrentTurnPlayer({
        id: newTurnPlayerId,
        name: currentTurnName,
      });
      setInput("");
      
      // Update both the ref and state for timer
      timerValueRef.current = timeLeft || turnTime;
      setTimer(timeLeft || turnTime);
      
      clearTimer();

      // Play turn change sound
      if (soundsReady) {
        if (isNowMyTurn) {
          console.log('🔊 Playing your-turn sound (my turn started)');
          await soundService.playSound('your-turn');
        }
        // No sound for opponent's turn
      }
      
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

    // Register all event listeners - ONLY ONCE
    console.log('🎯 Setting up socket listeners for hide & seek game');

    socket.on("selectionPhase", handleSelectionPhase);
    socket.on("selectionCountdown", handleSelectionCountdown);
    socket.on("selectionComplete", handleSelectionComplete);
    socket.on("selectionFailed", handleSelectionFailed);
    socket.on("itemSolved", handleItemSolved);
    socket.on("turnChanged", handleTurnChanged);
    socket.on("gameOver", handleGameOver);
    socket.on("playerEliminated", handlePlayerEliminated);

    handlersRegisteredRef.current = true;

    return () => {
      console.log("🧹 Cleaning up game listeners");
      // Clear timeouts
      if (selectionPhaseTimeoutRef.current) {
        clearTimeout(selectionPhaseTimeoutRef.current);
      }
      
      // Only remove listeners if we're actually leaving the game
      if (hasLeftRef.current || gameOver) {
        console.log("🔌 Removing socket listeners");
        socket.off("selectionPhase", handleSelectionPhase);
        socket.off("selectionCountdown", handleSelectionCountdown);
        socket.off("selectionComplete", handleSelectionComplete);
        socket.off("selectionFailed", handleSelectionFailed);
        socket.off("itemSolved", handleItemSolved);
        socket.off("turnChanged", handleTurnChanged);
        socket.off("gameOver", handleGameOver);
        socket.off("playerEliminated", handlePlayerEliminated);
        
        handlersRegisteredRef.current = false;
        selectionCompleteProcessedRef.current = false;
      }
      
      clearTimer();
    };
  }, [lobbyId, playerId, soundsReady]); // Removed problematic dependencies

  // Add cleanup effect to prevent multiple mounts
  useEffect(() => {
    return () => {
      console.log("🔄 HideAndSeekGameScreen unmounting - cleaning up everything");
      hasLeftRef.current = true;
      clearTimer();

      // Only call removeGameListeners if we're actually leaving
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
      console.log("🔍 My hide & seek item:", myHideSeekItem);
      
      // Check if player is trying to solve their OWN hide & seek item
      const isMyOwnItem = myHideSeekItem && matched.id === myHideSeekItem.id;
      
      if (isMyOwnItem) {
        console.log("🚫 BLOCKED: Player tried to solve their own hide & seek item");
        
        // Show warning to the player
        Alert.alert(
          "Not Allowed",
          "You cannot solve your own hide & seek item! Choose a different item.",
          [{ text: "OK" }]
        );
        
        // Clear input and don't send to backend OR update local state
        setInput("");
        return;
      }
      
      console.log(`✅ ALLOWED: Solving item that is not my hide & seek item`);
      setInput("");
      incrementPlayerSolvedCount();
      
      // Check if this is someone ELSE'S hide & seek item
      const isHideSeekItem = Object.values(playerSelections).some(
        selectedItem => selectedItem.id === matched.id && selectedItem.id !== myHideSeekItem?.id
      );
      
      console.log("🔍 Is this someone else's hide & seek item?", isHideSeekItem);
      
      socket.emit("buttonPress", {
        lobbyId,
        playerId,
        correct: true,
        itemId: matched.id,
        isHideSeekItem
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
  const getBorderImage = (solvedByPlayerId, isHideSeekItem = false) => {
    const colorId = playerColors[solvedByPlayerId];
    if (!colorId) return null;
    
    const color = getColorById(colorId);
    if (!color || !color.name) return null;
    
    const colorName = color.name.toLowerCase();
    return isHideSeekItem ? HIDE_SEEK_BORDERS[colorName] : COLORED_BORDERS[colorName];
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
    setMyHideSeekItem(null);
    setHideSeekInput("");
    setHideSeekValidation(null);
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
            const borderImage = item.solvedBy ? getBorderImage(item.solvedBy, item.isHideSeekItem) : null;
            const isMyHideSeekItem = myHideSeekItem && myHideSeekItem.id === item.id;

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
                    {/* My hide & seek item indicator - ALWAYS show if it's my item */}
                    {isMyHideSeekItem && !item.solved && (
                      <View style={styles.myHideSeekIndicator}>
                        <Text style={styles.myHideSeekText}>YOUR ITEM</Text>
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
                  
                  {/* Colored border overlay - for ALL solved items (both regular and hide & seek) */}
                  {item.solved && borderImage && (
                    <Image 
                      source={borderImage}
                      style={styles.borderOverlay}
                    />
                  )}
                </View>

                {/* Show item name only if it's solved OR it's game over OR it's my hide & seek item */}
                {(isSolvedOrGameOver || isMyHideSeekItem) && (
                  <Text
                    style={{
                      color: item.solved ? "#fff" : isMyHideSeekItem ? "#FFD700" : "gray",
                      textAlign: "center",
                      marginTop: 4,
                      fontSize: isMyHideSeekItem ? 12 : 14,
                      fontWeight: isMyHideSeekItem ? "bold" : "normal",
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
          selectionInput={hideSeekInput}
          onSelectionInputChange={handleSelectionInputChange}
          selectionValidation={hideSeekValidation}
          onSelectionConfirm={handleHideSeekConfirm}
          mySpecialItem={myHideSeekItem}
          duplicateItemsWarning={duplicateItemsWarning}
          gameStartCountdown={gameStartCountdown}
          winner={winner}
          solvedCount={solvedCount}
          playerSolvedCount={playerSolvedCount}
          items={items}
          onReturnToLobby={handleReturnToLobby}
          onLeaveGame={handleLeaveGame}
          gameMode={2} // Hide & Seek mode
        />
      </View>
    </KeyboardAvoidingView>
  );
}