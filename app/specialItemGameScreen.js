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
import soundService from "../services/soundService";

const itemUnsolved = require("../assets/images/item_unsolved.png");
const lastSolvedBorder = require("../assets/images/last_solved.png");
// Import regular colored borders AND special item borders
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

const SPECIAL_BORDERS = {
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

export default function SpecialItemGameScreen() {
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
  const gameMode = Number(params.gameMode) || 2; // Default to Hide & Seek

  // Game mode configuration
  const GAME_MODES = {
    HIDE_SEEK: 2,
    TRAP: 3
  };

  const getGameModeConfig = () => {
    switch (gameMode) {
      case GAME_MODES.TRAP:
        return {
          name: "Trap Mode",
          selectionTitle: "Set Your Trap",
          selectionPlaceholder: "Choose an item to set as trap...",
          selectionConfirmText: "Set Trap",
          validationSuccess: "Perfect trap!",
          myItemLabel: "YOUR TRAP",
          myItemColor: "#FF4444",
          eliminationReason: "trapSprung",
          specialEventName: "trapSprung",
          specialSound: "trap-triggered"
        };
      case GAME_MODES.HIDE_SEEK:
      default:
        return {
          name: "Hide & Seek Mode", 
          selectionTitle: "Hide Your Item",
          selectionPlaceholder: "Choose an item to hide...",
          selectionConfirmText: "Hide Item",
          validationSuccess: "Good choice!",
          myItemLabel: "YOUR ITEM",
          myItemColor: "#FFD700",
          eliminationReason: "hideSeekItemFound",
          specialEventName: "isHideSeekItem",
          specialSound: "hide-seek-found"
        };
    }
  };

  const gameConfig = getGameModeConfig();

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
  
  // Special item game states
  const [selectionModalVisible, setSelectionModalVisible] = useState(true);
  const [specialItemInput, setSpecialItemInput] = useState("");
  const [specialItemValidation, setSpecialItemValidation] = useState(null);
  const [mySpecialItem, setMySpecialItem] = useState(null);
  const [playerSelections, setPlayerSelections] = useState({});
  const [eliminatedPlayers, setEliminatedPlayers] = useState(new Set());
  const [lastSolvedItemId, setLastSolvedItemId] = useState(null);
  
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Answer before time runs out");
  const [playerColors, setPlayerColors] = useState({});
  const [myColor, setMyColor] = useState(null);
  const [soundsReady, setSoundsReady] = useState(false);

  // Selection phase states
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

  // Initialize sound service
  useEffect(() => {
    let mounted = true;

    const initializeSounds = async () => {
      try {
        console.log('🎮 Starting sound initialization for special item game...');
        
        // Wait for sounds to load with timeout
        const loadPromise = soundService.loadSounds();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sound loading timeout')), 10000)
        );
        
        await Promise.race([loadPromise, timeoutPromise]);
        
        if (mounted) {
          setSoundsReady(true);
          console.log('✅ Sounds ready for special item game');
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
    };
  }, []);

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

  // Effect to detect when game starts and focus input for first player
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

  // Special item validation and selection
  const validateSpecialItem = (itemName) => {
    const matchedItem = items.find(item => 
      item.name.toLowerCase() === itemName.toLowerCase().trim()
    );
    
    if (!matchedItem) {
      setSpecialItemValidation("This item doesn't exist");
      return null;
    }
    
    setSpecialItemValidation(gameConfig.validationSuccess);
    return matchedItem;
  };

  const handleSpecialItemConfirm = () => {
    const matchedItem = validateSpecialItem(specialItemInput);
    
    if (matchedItem) {
      console.log(`🎯 Player ${playerId} selected ${gameConfig.name.toLowerCase()} item: ${matchedItem.name}`);
      setMySpecialItem(matchedItem);
      
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
    if (!mySpecialItem) {
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
    setSpecialItemInput(text);
    setSpecialItemValidation(null);
    if (duplicateItemsWarning) setDuplicateItemsWarning(false);
  };

  // Socket listeners for special item games
  useEffect(() => {
    console.log(`🎮 Joining ${gameConfig.name} - Lobby: ${lobbyId}, Player: ${playerId}`);
    
    socket.emit("joinHideSeekGame", { lobbyId, playerId, playerName: params.playerName });

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
          setMySpecialItem(null);
          setSpecialItemInput("");
          setSpecialItemValidation(null);
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
      
      setMySpecialItem(myItem);
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
      
      console.log(`🎮 ${gameConfig.name} starting now!`);
      
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
      setSpecialItemInput("");
      setSpecialItemValidation(null);
      setMySpecialItem(null);
      setDuplicateItemsWarning(false);
    };

    const handleItemSolved = async ({ itemId, solvedBy, isHideSeekItem, trapSprung }) => {
      console.log(`✅ Item ${itemId} solved by player ${solvedBy}, isHideSeek: ${isHideSeekItem}, trapSprung: ${trapSprung}`);
      
      // Update last solved item
      setLastSolvedItemId(itemId);
      
      // Play appropriate sound
      if (soundsReady) {
        if (isHideSeekItem || trapSprung) {
          // Play special sound for hide & seek found or trap triggered
          console.log(`🔊 Playing ${gameConfig.specialSound} sound (special item event)`);
          await soundService.playSound(gameConfig.specialSound);
        } else if (Number(solvedBy) === Number(playerId)) {
          // Play item-solved sound for my regular solve
          console.log('🔊 Playing item-solved sound (my solve confirmed by server)');
          await soundService.playSound('item-solved');
        } else {
          // Play opponent-solved sound for opponent's regular solve
          console.log('🔊 Playing opponent-solved sound (opponent solve)');
          await soundService.playSound('opponent-solved');
        }
      } else {
        console.log('🔇 Sounds not ready, cannot play sound');
      }
      
      // Update the item as solved in the local state
      setItems((prev) => {
        const updatedItems = prev.map((item) => 
          item.id === itemId ? { 
            ...item, 
            solved: true, 
            solvedBy, 
            isHideSeekItem,
            trapSprung 
          } : item
        );
        
        setTimeout(() => {
          scrollToItem(itemRefs, scrollRef, itemId, updatedItems, calculatedItemsPerRow, itemWidth);
        }, 150);
        
        return updatedItems;
      });

      // GAME MODE SPECIFIC ELIMINATION LOGIC
      if (gameMode === GAME_MODES.HIDE_SEEK && isHideSeekItem) {
        // HIDE & SEEK: When someone finds YOUR item, YOU get eliminated
        Object.entries(playerSelections).forEach(([specialItemPlayerId, selectedItem]) => {
          if (selectedItem.id === itemId && Number(specialItemPlayerId) !== Number(solvedBy)) {
            console.log(`🎯 Hide & Seek item found! Eliminating player ${specialItemPlayerId}`);
            handlePlayerElimination(Number(specialItemPlayerId), "hideSeekItemFound");
          }
        });
      } else if (gameMode === GAME_MODES.TRAP && trapSprung) {
        // TRAP MODE: When someone finds YOUR trap, THEY get eliminated
        if (Number(solvedBy) === Number(playerId)) {
          console.log(`💀 YOU STEPPED ON A TRAP! Eliminating yourself: ${playerId}`);
          handlePlayerElimination(playerId, "trapSprung");
        }
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

      // Start timer for the new turn
      if (!selectionModalVisible && !countdownModalVisible) {
        startTimer();
      }

      // Play turn change sound
      if (soundsReady && isNowMyTurn) {
        console.log('🔊 Playing your-turn sound (my turn started)');
        await soundService.playSound('your-turn');
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
  }, [lobbyId, playerId, selectionModalVisible, countdownModalVisible, gameMode, soundsReady]);

  // Add cleanup effect to prevent multiple mounts
  useEffect(() => {
    return () => {
      console.log("🔄 SpecialItemGameScreen unmounting - cleaning up everything");
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
      console.log("🔍 My special item:", mySpecialItem);
      
      // Check if player is trying to solve their OWN special item
      const isMyOwnItem = mySpecialItem && matched.id === mySpecialItem.id;
      
      if (isMyOwnItem) {
        console.log("🚫 BLOCKED: Player tried to solve their own special item");
        
        // Show warning to the player
        Alert.alert(
          "Not Allowed",
          `You cannot solve your own ${gameConfig.name.toLowerCase()} item! Choose a different item.`,
          [{ text: "OK" }]
        );
        
        // Clear input and don't send to backend OR update local state
        setInput("");
        return;
      }
      
      console.log(`✅ ALLOWED: Solving item that is not my special item`);
      setInput("");
      incrementPlayerSolvedCount();
      
      // Check if this is someone ELSE'S special item
      const isSpecialItem = Object.values(playerSelections).some(
        selectedItem => selectedItem.id === matched.id && selectedItem.id !== mySpecialItem?.id
      );

      console.log("🔍 Is this someone else's special item?", isSpecialItem);

      socket.emit("buttonPress", {
        lobbyId,
        playerId,
        correct: true,
        itemId: matched.id,
        isHideSeekItem: isSpecialItem
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
  const getBorderImage = (solvedByPlayerId, isSpecialItem = false) => {
    const colorId = playerColors[solvedByPlayerId];
    if (!colorId) return null;
    
    const color = getColorById(colorId);
    if (!color || !color.name) return null;
    
    const colorName = color.name.toLowerCase();
    return isSpecialItem ? SPECIAL_BORDERS[colorName] : COLORED_BORDERS[colorName];
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
    setMySpecialItem(null);
    setSpecialItemInput("");
    setSpecialItemValidation(null);
    setEliminatedPlayers(new Set());
    setLastSolvedItemId(null);
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

  // Render individual item
  const renderItem = (item) => {
    const { left, top } = getSpritePosition(item.order, spriteInfo);
    const isSolvedOrGameOver = item.solved || gameOver;
    const scale = calculateSpriteScale(spriteInfo.spriteSize, 100);
    const isLastSolved = item.id === lastSolvedItemId;
    
    // Get border image - use special borders for special items
    const colorId = item.solvedBy ? playerColors[item.solvedBy] : null;
    const color = colorId ? getColorById(colorId) : null;
    const colorName = color ? color.name.toLowerCase() : null;
    const borderImage = item.solvedBy ? 
      ((item.isHideSeekItem || item.trapSprung) ? SPECIAL_BORDERS[colorName] : COLORED_BORDERS[colorName]) : 
      null;
    
    const isMySpecialItem = mySpecialItem && mySpecialItem.id === item.id;

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
            {/* My special item indicator - ALWAYS show if it's my item */}
            {isMySpecialItem && !item.solved && (
              <View style={[styles.myHideSeekIndicator, { backgroundColor: gameConfig.myItemColor }]}>
                <Text style={styles.myHideSeekText}>{gameConfig.myItemLabel}</Text>
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
          
          {/* Colored border overlay - use special borders for special items */}
          {item.solved && borderImage && (
            <Image 
              source={borderImage}
              style={styles.borderOverlay}
            />
          )}
          
          {/* Last solved indicator - on top of regular border */}
          {isLastSolved && (
            <Image 
              source={lastSolvedBorder}
              style={styles.borderOverlay}
            />
          )}
          
          {/* Trap sprung indicator (only for trap mode) */}
          {item.trapSprung && (
            <View style={styles.trapSprungIndicator}>
              <Text style={styles.trapSprungText}>💀 TRAP!</Text>
            </View>
          )}
        </View>

        {/* Show item name only if it's solved OR it's game over OR it's my special item */}
        {(isSolvedOrGameOver || isMySpecialItem) && (
          <Text
            style={{
              color: item.solved ? "#fff" : isMySpecialItem ? gameConfig.myItemColor : "gray",
              textAlign: "center",
              marginTop: 4,
              fontSize: isMySpecialItem ? 12 : 14,
              fontWeight: isMySpecialItem ? "bold" : "normal",
            }}
          >
            {item.name}
          </Text>
        )}
      </View>
    );
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
          {items.map(renderItem)}
        </ScrollView>

        {/* Game Modals Component */}
        <GameModals
          selectionModalVisible={selectionModalVisible}
          countdownModalVisible={countdownModalVisible}
          gameModalVisible={gameModalVisible}
          onCloseSelectionModal={handleCloseSelectionModal}
          onCloseCountdownModal={handleCloseCountdownModal}
          onCloseGameModal={handleCloseGameModal}
          selectionInput={specialItemInput}
          onSelectionInputChange={handleSelectionInputChange}
          selectionValidation={specialItemValidation}
          onSelectionConfirm={handleSpecialItemConfirm}
          mySpecialItem={mySpecialItem}
          duplicateItemsWarning={duplicateItemsWarning}
          gameStartCountdown={gameStartCountdown}
          winner={winner}
          solvedCount={solvedCount}
          playerSolvedCount={playerSolvedCount}
          items={items}
          onReturnToLobby={handleReturnToLobby}
          onLeaveGame={handleLeaveGame}
          gameMode={gameMode}
          gameConfig={gameConfig}
        />
      </View>
    </KeyboardAvoidingView>
  );
}