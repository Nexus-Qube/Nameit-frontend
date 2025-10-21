// frontend\app\gameScreen.js
import { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGameData } from "../hooks/useGameData";
import { useGameLogic } from "../hooks/useGameLogic";
import { useTurnBasedFocus } from "../hooks/useTurnBasedFocus";
import { scrollToItem } from "../helpers/scrollHelpers";
import styles from "../styles/GameScreenStyles";

import GameHeader from "../components/GameHeader";
import GameGrid from "../components/GameGrid";
import GameModals from "../components/GameModals";

export default function GameScreen() {
  const { width } = Dimensions.get('window');
  const { topicId, mode } = useLocalSearchParams();
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

  const [input, setInput] = useState("");
  const [time, setTime] = useState(mode === "countdown" ? 60 : 0);
  const [gameOver, setGameOver] = useState(false);
  const [gameModalVisible, setGameModalVisible] = useState(false);

  const scrollRef = useRef(null);
  const itemRefs = useRef({});
  const intervalRef = useRef(null);
  const inputRef = useRef(null);

  // Custom hooks
  const { spriteInfo, initialItems, isLoading, error } = useGameData(Number(topicId));
  const { items, setItems, playerSolvedCount, handleItemMatch, solvedCount, incrementPlayerSolvedCount } = useGameLogic();

  // Initialize items when useGameData loads them
  useEffect(() => {
    if (initialItems.length > 0) {
      console.log(`📦 Setting ${initialItems.length} initial items in useGameLogic`);
      setItems(initialItems);
    }
  }, [initialItems, setItems]);

  // --- AUTO-FOCUS ON EVERY RENDER ---
  useEffect(() => {
    // Focus input on every render, but only if game is not over
    if (!gameOver && inputRef.current) {
      const focusInput = () => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          console.log('⌨️ Auto-focusing input on render');
          inputRef.current.focus();
        }
      };
      
      // Immediate focus
      focusInput();
      
      // Additional focus attempts to ensure it sticks
      setTimeout(focusInput, 10);
      setTimeout(focusInput, 50);
      setTimeout(focusInput, 100);
    }
  }); // No dependencies - runs on every render

  // --- Timer functions ---
  const clearTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const startTimer = () => {
    clearTimer();
    
    if (mode === "countdown") {
      intervalRef.current = setInterval(() => {
        setTime((prev) => {
          if (prev <= 0) {
            setGameOver(true);
            setGameModalVisible(true);
            clearTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (mode === "fastest") {
      intervalRef.current = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
  };

  // Start timer on component mount
  useEffect(() => {
    startTimer();
    return () => clearTimer();
  }, [mode]);

  // Check for game completion
  useEffect(() => {
    if (mode === "fastest" && items.length > 0 && solvedCount === items.length) {
      setGameOver(true);
      setGameModalVisible(true);
      clearTimer();
    }
  }, [solvedCount, items, mode]);

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // --- Handle input ---
  const handleInputChange = (text) => {
    setInput(text);
    
    const matched = handleItemMatch(text, 1, 1, gameOver);
    
    if (matched) {
      console.log(`🎯 Matched item: ${matched.name}`);
      
      incrementPlayerSolvedCount();

      // MANUALLY UPDATE ITEMS TO MARK AS SOLVED
      setItems(prev => prev.map(item => 
        item.id === matched.id ? { ...item, solved: true, solvedBy: 1 } : item
      ));

      // Add time bonus in countdown mode
      if (mode === "countdown") {
        setTime(prev => prev + 5);
      }

      // Scroll to the solved item
      setTimeout(() => {
        console.log(`⌨️ Starting scroll process`);
        scrollToItem(itemRefs, scrollRef, matched.id, items, calculatedItemsPerRow, itemWidth, inputRef);
      }, 150);

      // Clear input after a short delay
      setTimeout(() => {
        console.log(`⌨️ Delayed input clear`);
        setInput("");
      }, 50);
    }
  };

  const handleExitGame = () => {
    clearTimer();
    setGameOver(false);
    setGameModalVisible(false);
    router.replace("/");
  };

  const handleRestartGame = () => {
    clearTimer();
    setGameOver(false);
    setGameModalVisible(false);
    setTime(mode === "countdown" ? 60 : 0);
    setInput("");
    setItems(prev => prev.map(item => ({ ...item, solved: false })));
    startTimer();
  };

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
          onExitGame={handleExitGame}
          isSinglePlayer={true}
          gameMode={mode}
          formattedTime={mode === "countdown" ? `${time}s` : formatTime(time)}
          solvedCount={solvedCount}
          items={items}
          playerSolvedCount={playerSolvedCount}
          gameOver={gameOver}
          input={input}
          onInputChange={handleInputChange}
          inputRef={inputRef}
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
          playerColors={{}}
          gameMode={1}
          isSinglePlayer={true}
        />

        {/* Game Modals Component */}
        <GameModals
          gameModalVisible={gameModalVisible}
          onCloseGameModal={handleCloseGameModal}
          winner={{ name: "You" }}
          solvedCount={solvedCount}
          playerSolvedCount={playerSolvedCount}
          items={items}
          onReturnToLobby={handleRestartGame}
          onLeaveGame={handleExitGame}
          gameMode={1}
        />
      </View>
    </KeyboardAvoidingView>
  );
}