import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  View,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGameData } from "../hooks/useGameData";
import { useGameLogic } from "../hooks/useGameLogic";
import { scrollToItem } from "../helpers/scrollHelpers";
import styles from "../styles/GameScreenStyles";

import GameHeader from "../components/GameHeader";
import GameGrid from "../components/GameGrid";
import GameModals from "../components/GameModals";
import soundService from "../services/soundService";

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
  const [soundsReady, setSoundsReady] = useState(false);

  const scrollRef = useRef(null);
  const itemRefs = useRef({});
  const intervalRef = useRef(null);
  const inputRef = useRef(null);
  const isProcessingRef = useRef(false);
  const focusLockRef = useRef(false);
  const pendingInputRef = useRef(""); // NEW: Buffer for characters typed during processing
  const lastMatchedTextRef = useRef(""); // NEW: Track what we matched

  // Custom hooks
  const { spriteInfo, initialItems, isLoading, error } = useGameData(Number(topicId));
  const { items, setItems, playerSolvedCount, handleItemMatch, solvedCount, incrementPlayerSolvedCount } = useGameLogic();

  // Initialize sound service on component mount
  useEffect(() => {
    let mounted = true;

    const initializeSounds = async () => {
      try {
        console.log('🎮 Starting sound initialization for single player game...');
        
        const loadPromise = soundService.loadSounds();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sound loading timeout')), 10000)
        );
        
        await Promise.race([loadPromise, timeoutPromise]);
        
        if (mounted) {
          setSoundsReady(true);
          console.log('✅ Sounds ready for single player game');
        }
      } catch (error) {
        console.error('❌ Sound initialization failed:', error);
        if (mounted) {
          setSoundsReady(false);
        }
      }
    };

    initializeSounds();

    return () => {
      mounted = false;
    };
  }, []);

  // Initialize items when useGameData loads them
  useEffect(() => {
    if (initialItems.length > 0) {
      console.log(`📦 Setting ${initialItems.length} initial items in useGameLogic`);
      setItems(initialItems);
    }
  }, [initialItems, setItems]);

  // PERMANENT FOCUS LOCK
  useEffect(() => {
    if (!gameOver && inputRef.current) {
      console.log('⌨️ Setting up permanent focus lock');
      
      // Immediate focus
      inputRef.current.focus();
      
      // Set up permanent focus protection
      const protectFocus = () => {
        if (inputRef.current && document.activeElement !== inputRef.current && !gameOver) {
          console.log('⌨️ Focus protection: restoring focus');
          inputRef.current.focus();
        }
      };

      // Aggressive focus protection
      const focusInterval = setInterval(protectFocus, 100);
      
      // Also protect on any user interaction
      const events = ['click', 'touchstart', 'keydown', 'mousedown'];
      const protectOnInteraction = () => {
        setTimeout(protectFocus, 10);
      };
      
      events.forEach(event => {
        document.addEventListener(event, protectOnInteraction, true);
      });

      return () => {
        clearInterval(focusInterval);
        events.forEach(event => {
          document.removeEventListener(event, protectOnInteraction, true);
        });
      };
    }
  }, [gameOver]);

  // --- Timer functions ---
  const clearTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const startTimer = useCallback(() => {
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
  }, [mode, clearTimer]);

  // Start timer on component mount
  useEffect(() => {
    startTimer();
    return () => clearTimer();
  }, [startTimer, clearTimer]);

  // Check for game completion
  useEffect(() => {
    if (mode === "fastest" && items.length > 0 && solvedCount === items.length) {
      setGameOver(true);
      setGameModalVisible(true);
      clearTimer();
    }
  }, [solvedCount, items, mode, clearTimer]);

  // Format time for display
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // --- Handle input ---
  const handleInputChange = useCallback(async (text) => {
  // If we're processing a previous match, buffer the input
  if (isProcessingRef.current) {
    console.log(`⌨️ Buffering input during processing: "${text}"`);
    pendingInputRef.current = text;
    setInput(text); // Still show the text to user
    return;
  }
  
  setInput(text);
  
  const matched = handleItemMatch(text, 1, 1, gameOver);
  
  if (matched) {
    console.log(`🎯 Matched item: ${matched.name}`);
    
    // CRITICAL FIX: Set processing flag IMMEDIATELY to catch rapid typing
    isProcessingRef.current = true;
    
    // Store what we matched and capture any extra characters typed DURING this function call
    lastMatchedTextRef.current = text;
    
    // Calculate what comes AFTER the matched text RIGHT NOW
    const matchedLength = matched.name.length;
    const extraText = text.length > matchedLength ? text.slice(matchedLength) : "";
    
    // If there are extra characters, store them BEFORE we start processing
    if (extraText) {
      console.log(`⌨️ Extra text detected immediately after match: "${extraText}"`);
      pendingInputRef.current = extraText;
    }
    
    // Lock focus during processing
    focusLockRef.current = true;
    if (inputRef.current) {
      inputRef.current.focus();
    }

    incrementPlayerSolvedCount();

    // Play item solved sound (non-blocking)
    if (soundsReady) {
      console.log('🔊 Playing item-solved sound');
      soundService.playSound('item-solved').catch(console.error);
    }

    // Update items state
    setItems(prev => prev.map(item => 
      item.id === matched.id ? { ...item, solved: true, solvedBy: 1 } : item
    ));

    // Add time bonus in countdown mode
    if (mode === "countdown") {
      setTime(prev => prev + 5);
    }

    // Clear the matched part but keep extra text visible
    if (extraText) {
  setInput(extraText);
} else {
  // Only clear if there's no extra text to show
  setInput("");
}

    // Start scroll with smooth animation
    setTimeout(() => {
      console.log(`⌨️ Starting scroll process`);
      scrollToItem(itemRefs, scrollRef, matched.id, items, calculatedItemsPerRow, itemWidth, inputRef);
    }, 100);

    // Reset processing flag and apply buffered input
    setTimeout(() => {
      isProcessingRef.current = false;
      focusLockRef.current = false;
      
      // Apply any buffered input that came in during processing
      if (pendingInputRef.current) {
        console.log(`⌨️ Applying buffered input: "${pendingInputRef.current}"`);
        const buffered = pendingInputRef.current;
        pendingInputRef.current = "";
        setInput(buffered);
      }
      
      // Final focus assurance
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 300);
  }
}, [gameOver, soundsReady, mode, calculatedItemsPerRow, itemWidth, items, handleItemMatch, incrementPlayerSolvedCount, setItems]);

  const handleExitGame = useCallback(() => {
    clearTimer();
    setGameOver(false);
    setGameModalVisible(false);
    router.replace("/");
  }, [clearTimer, router]);

  const handleRestartGame = useCallback(async () => {
    clearTimer();
    setGameOver(false);
    setGameModalVisible(false);
    setTime(mode === "countdown" ? 60 : 0);
    setInput("");
    pendingInputRef.current = "";
    lastMatchedTextRef.current = "";
    setItems(prev => prev.map(item => ({ ...item, solved: false })));
    startTimer();
    isProcessingRef.current = false;
    focusLockRef.current = false;
    
    // Focus input after restart
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 500);
  }, [clearTimer, mode, startTimer, setItems]);

  const handleCloseGameModal = useCallback(() => {
    setGameModalVisible(false);
  }, []);

  const formattedTime = mode === "countdown" ? `${time}s` : formatTime(time);

  return (
    <View 
      style={{ flex: 1 }}
      onStartShouldSetResponder={() => true}
      onResponderGrant={() => {
        // Prevent focus stealing when tapping on the game area
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }}
    >
      {/* Game Header Component */}
      <GameHeader
        onExitGame={handleExitGame}
        isSinglePlayer={true}
        gameMode={mode}
        formattedTime={formattedTime}
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
        onGridInteraction={() => {
          // If user interacts with grid, refocus input
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }}
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
  );
}