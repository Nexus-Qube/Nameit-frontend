// frontend/app/trapGameScreen.js
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
import { useGameData } from "../hooks/useGameData";
import { useGameLogic } from "../hooks/useGameLogic";
import { useTurnBasedFocus } from "../hooks/useTurnBasedFocus";
import { scrollToItem } from "../helpers/scrollHelpers";
import { getColorById } from "../constants/PlayerColors";
import soundService from "../services/soundService";
import styles from "../styles/GameScreenStyles";

import GameHeader from "../components/GameHeader";
import GameGrid from "../components/GameGrid";
import GameModals from "../components/GameModals";

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
  const [soundsReady, setSoundsReady] = useState(false);

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
  const inputRef = useRef(null);
  const selectionPhaseTimeoutRef = useRef(null);

  const socket = getSocket();
  currentTurnRef.current = currentTurnPlayer.id;

  // Custom hooks
  const { spriteInfo, initialItems, isLoading, error } = useGameData(topicId);
  const { items, setItems, playerSolvedCount, solvedCount, incrementPlayerSolvedCount } = useGameLogic();

  // Calculate if it's my turn (considering selection phase and elimination)
  const isMyTurn = 
    currentTurnPlayer.id === playerId && 
    !selectionModalVisible && 
    !countdownModalVisible && 
    !eliminatedPlayers.has(playerId);

  // Initialize sound service - UPDATED VERSION
  useEffect(() => {
    let mounted = true;

    const initializeSounds = async () => {
      try {
        console.log('🎮 Starting sound initialization for trap game...');
        
        // Wait for sounds to load with timeout
        const loadPromise = soundService.loadSounds();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sound loading timeout')), 10000)
        );
        
        await Promise.race([loadPromise, timeoutPromise]);
        
        if (mounted) {
          setSoundsReady(true);
          console.log('✅ Sounds ready for trap game');
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

  // Use the custom hook for focus management
  useTurnBasedFocus(isMyTurn, gameOver, inputRef, "trap");

  // Initialize items when useGameData loads them
  useEffect(() => {
    if (initialItems.length > 0) {
      console.log(`📦 Setting ${initialItems.length} initial items in useGameLogic`);
      setItems(initialItems);
    }
  }, [initialItems, setItems]);

  // Timer functions
  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startTimer = () => {
  console.log("⏰ Starting timer, current turn:", currentTurnPlayer.id, "I am:", playerId);
  
  // Clear any existing timer first
  clearTimer();
  
  // Only start timer if it's our turn and game is not over
  if (currentTurnPlayer.id !== playerId || gameOver) {
    console.log("⏰ Not starting timer - not my turn or game over");
    return;
  }
  
  intervalRef.current = setInterval(() => {
    setTimer(prev => {
      const newTime = prev - 1;
      console.log("⏰ Timer tick:", newTime);
      
      if (newTime <= 0) {
        if (!hasLeftRef.current && currentTurnRef.current === playerId && !gameOver) {
          console.log("⏰ Timer expired - auto elimination");
          handlePlayerElimination(playerId, "timeout");
        }
        clearTimer();
        return 0;
      }
      return newTime;
    });
  }, 1000);
};

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

  // Socket listeners for Trap mode - FIXED VERSION
  useEffect(() => {
    console.log(`🎮 Joining Trap game - Lobby: ${lobbyId}, Player: ${playerId}`);
    
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
  
  // CRITICAL: Start the timer for the first player with proper timing
  setTimeout(() => {
    if (currentTurnRef.current === playerId && !gameOver) {
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

    const handleItemSolved = async ({ itemId, solvedBy, isHideSeekItem, trapSprung }) => {
      console.log(`✅ Item ${itemId} solved by player ${solvedBy}, isHideSeek: ${isHideSeekItem}, trapSprung: ${trapSprung}`);
      
      // Play appropriate sound based on the type of item solved
      if (soundsReady) {
        if (trapSprung) {
          console.log('🔊 Playing trap-triggered sound (trap item triggered)');
          await soundService.playSound('trap-triggered');
        } else if (isHideSeekItem) {
          // This shouldn't happen in trap mode, but just in case
          console.log('🔊 Playing trap-triggered sound (trap item found)');
          await soundService.playSound('trap-triggered');
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
  
  // Use the timeLeft from server or reset to turnTime
  const newTimerValue = timeLeft !== undefined ? timeLeft : turnTime;
  setTimer(newTimerValue);
  
  // Clear any existing timer first
  clearTimer();
  
  // Play turn change sound
  if (soundsReady) {
    if (isNowMyTurn) {
      console.log('🔊 Playing your-turn sound (my turn started)');
      await soundService.playSound('your-turn');
    }
  }
  
  // CRITICAL FIX: Always start timer for the current turn player
  // Don't check for selectionModalVisible or countdownModalVisible here
  // because by the time turnChanged is called, those should be closed
  if (isNowMyTurn && !gameOver) {
    console.log(`⏰ Starting timer for player ${playerId}, time: ${newTimerValue}`);
    // Use setTimeout to ensure state updates have completed
    setTimeout(() => {
      startTimer();
    }, 100);
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
    console.log('🎯 Setting up socket listeners for trap game');
    
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
      console.log("🔄 TrapGameScreen unmounting - cleaning up everything");
      hasLeftRef.current = true;
      clearTimer();
      
      // Only call removeGameListeners if we're actually leaving
      removeGameListeners();
    };
  }, []);

  useEffect(() => {
  if (isMyTurn && inputRef.current && !gameOver) {
    // Aggressive focus protection for the current turn
    const focusInterval = setInterval(() => {
      if (inputRef.current && Platform.OS === 'web' && document.activeElement !== inputRef.current) {
        console.log('⌨️ Aggressive focus protection');
        inputRef.current.focus();
      }
    }, 500);
    
    return () => clearInterval(focusInterval);
  }
}, [isMyTurn, gameOver]);

// Add this useEffect to debug timer issues
useEffect(() => {
  console.log(`⏰ Timer state updated: ${timer}s, isMyTurn: ${isMyTurn}, gameOver: ${gameOver}`);
}, [timer, isMyTurn, gameOver]);

useEffect(() => {
  console.log(`🔄 Turn state updated: currentTurn=${currentTurnPlayer.id}, isMyTurn=${isMyTurn}`);
}, [currentTurnPlayer.id, isMyTurn]);

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
        isHideSeekItem: isTrapItem
      });

      setTimeout(() => {
        scrollToItem(itemRefs, scrollRef, matched.id, items, calculatedItemsPerRow, itemWidth, inputRef);
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

  // Return to lobby
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
          inputRef={inputRef}
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
          gameMode={3} // Trap mode
          mySpecialItem={myTrapItem}
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