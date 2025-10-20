import { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
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
import { initializeGameItems } from "../helpers/gameLogicHelpers";
import { getColorById } from "../constants/PlayerColors";
import styles from "../styles/GameScreenStyles";

import GameHeader from "../components/GameHeader";
import GameGrid from "../components/GameGrid";
import GameModals from "../components/GameModals";

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
  const [hideSeekValidation, setHideSeekValidation] = useState(null);
  const [myHideSeekItem, setMyHideSeekItem] = useState(null);
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
  const currentTurnRef = useRef(currentTurnPlayer.id);
  const intervalRef = useRef(null);
  const hasLeftRef = useRef(false);
  const handlersRegisteredRef = useRef(false);
  const selectionCompleteProcessedRef = useRef(false);
  const timerValueRef = useRef(turnTime);

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

  // Socket listeners for Hide & Seek
  useEffect(() => {
    console.log(`🎮 Joining Hide & Seek game - Lobby: ${lobbyId}, Player: ${playerId}`);
    
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

    const handleItemSolved = ({ itemId, solvedBy, isHideSeekItem }) => {
      console.log(`✅ Item ${itemId} solved by player ${solvedBy}, isHideSeek: ${isHideSeekItem}`);
      
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
      console.log("🔄 HideAndSeekGameScreen unmounting - cleaning up everything");
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
      <View style={{ flex: 1 }}>
        {/* Game Header Component */}
        <GameHeader
          onReturnToLobby={handleReturnToLobby}
          currentTurnPlayer={currentTurnPlayer}
          playerId={playerId}
          timer={timer}
          statusMessage={statusMessage}
          solvedCount={solvedCount}
          items={items}
          playerSolvedCount={playerSolvedCount}
          gameOver={gameOver}
          input={input}
          onInputChange={handleInputChange}
          myColor={myColor}
          eliminatedPlayers={eliminatedPlayers}
          selectionModalVisible={selectionModalVisible}
          countdownModalVisible={countdownModalVisible}
        />

        {/* Game Grid Component */}
        <GameGrid
          items={items}
          spriteInfo={spriteInfo}
          itemWidth={itemWidth}
          calculatedItemsPerRow={calculatedItemsPerRow}
          scrollRef={scrollRef}
          itemRefs={itemRefs}
          gameOver={gameOver}
          playerColors={playerColors}
          gameMode={2} // Hide & Seek mode
          mySpecialItem={myHideSeekItem}
          playerSelections={playerSelections}
          eliminatedPlayers={eliminatedPlayers}
        />

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