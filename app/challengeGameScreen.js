// frontend/app/challengeGameScreen.js
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

export default function ChallengeGameScreen() {
  const { width } = Dimensions.get('window');
  const params = useLocalSearchParams();
  const router = useRouter();

  // Use useMemo for layout calculations to prevent re-renders
  const { itemWidth, calculatedItemsPerRow } = useMemo(() => {
    const minItemsPerRow = 3;
    const maxItemWidth = 120;
    const containerPadding = 40;
    const itemMargin = 8;

    const maxPossibleItems = Math.floor((width - containerPadding) / (maxItemWidth + itemMargin));
    const calculatedItemsPerRow = Math.max(minItemsPerRow, maxPossibleItems);
    const availableWidth = width - containerPadding - (calculatedItemsPerRow * itemMargin);
    const itemWidth = Math.min(maxItemWidth, Math.floor(availableWidth / calculatedItemsPerRow));

    console.log('Screen width:', width, 'Items per row:', calculatedItemsPerRow, 'Item width:', itemWidth);
    
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
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Answer before time runs out");
  const [playerColors, setPlayerColors] = useState({});
  const [myColor, setMyColor] = useState(null);
  const [soundsReady, setSoundsReady] = useState(false);

  const scrollRef = useRef(null);
  const itemRefs = useRef({});
  const currentTurnRef = useRef(currentTurnPlayer.id);
  const intervalRef = useRef(null);
  const hasLeftRef = useRef(false);
  const inputRef = useRef(null);

  const socket = getSocket();
  currentTurnRef.current = currentTurnPlayer.id;

  // Custom hooks
  const { spriteInfo, initialItems, isLoading, error } = useGameData(topicId);
  const { items, setItems, playerSolvedCount, handleItemMatch, solvedCount, incrementPlayerSolvedCount } = useGameLogic();

  // Calculate if it's my turn
  const isMyTurn = currentTurnPlayer.id === playerId;

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

  // Use the custom hook for focus management
  useTurnBasedFocus(isMyTurn, gameOver, inputRef, "marathon");

  // Initialize items when useGameData loads them
  useEffect(() => {
    if (initialItems.length > 0) {
      console.log(`📦 Setting ${initialItems.length} initial items in useGameLogic`);
      setItems(initialItems);
    }
  }, [initialItems, setItems]);

  // Timer functions
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

  // Socket listeners
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

  // Handle input - NO SOUND HERE, only when server confirms
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

      // Scroll to the solved item - WITHOUT aggressive refocus
      setTimeout(() => {
        scrollToItem(itemRefs, scrollRef, matched.id, items, calculatedItemsPerRow, itemWidth);
      }, 100);
    }
  };

  // Return to lobby
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

  // Modal control functions
  const handleCloseGameModal = () => {
    setGameModalVisible(false);
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
          gameMode={1} // Marathon mode
        />

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