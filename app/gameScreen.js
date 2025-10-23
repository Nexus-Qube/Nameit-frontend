import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  Modal,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { fetchTopicById, fetchItemsByTopic } from '../services/api';
import { getSpriteSheetConfig } from "../config/spriteSheetConfigs";
import { initializeGameItems } from "../helpers/gameLogicHelpers";
import { scrollToItem } from "../helpers/scrollHelpers";
import { getSpritePosition, calculateSpriteScale } from "../helpers/spriteHelpers";
import { useGameLogic } from "../hooks/useGameLogic";
import styles from "../styles/GameScreenStyles";

import GameModals from "../components/GameModals";
import soundService from "../services/soundService";

const solvedBorder = require("../assets/images/solved_border_default.png");
const itemUnsolved = require("../assets/images/item_unsolved.png");

export default function GameScreen() {
  const { width } = Dimensions.get('window');
  const { topicId, mode } = useLocalSearchParams();
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

  const [input, setInput] = useState("");
  const [time, setTime] = useState(mode === "countdown" ? 60 : 0);
  const [gameOver, setGameOver] = useState(false);
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [soundsReady, setSoundsReady] = useState(false);

  const [spriteInfo, setSpriteInfo] = useState({
  spriteSize: 0,        // Will be set from API (always available)
  margin: 1,            // Hardcoded since it's always 1
  spritesPerRow: 0,     // Will be set from API (always available)
  sheetWidth: 0,        // Will be set from sprite config
  sheetHeight: 0,       // Will be set from sprite config
  sheetUrl: null,       // Will be set from sprite config
  noSpriteSheet: false, // Will be set from sprite config
});

  const scrollRef = useRef(null);
  const itemRefs = useRef({});
  const intervalRef = useRef(null);
  const inputRef = useRef(null);

  // Custom hooks
  const { items, setItems, playerSolvedCount, handleItemMatch, solvedCount, incrementPlayerSolvedCount } = useGameLogic();

  // Initialize sound service on component mount
  useEffect(() => {
    let mounted = true;
    const initializeSounds = async () => {
      try {
        console.log('🎮 Starting sound initialization for single player game...');
        
        // Wait for sounds to load with timeout
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

  // --- Fetch topic + items using API ---
  useEffect(() => {
    const topicNum = Number(topicId);
    if (!topicNum) return;

    const fetchData = async () => {
      try {
        const topicData = await fetchTopicById(topicNum);
        if (!topicData) return;

        // Get sprite sheet configuration from JSON config
        const spriteConfig = getSpriteSheetConfig(topicNum);

        setSpriteInfo({
  spriteSize: topicData.sprite_size,      // No fallback needed - API always provides
  margin: 1,                              // Hardcoded
  spritesPerRow: topicData.sprites_per_row, // No fallback needed - API always provides
  sheetWidth: spriteConfig.width,
  sheetHeight: spriteConfig.height,
  sheetUrl: spriteConfig.src,
  noSpriteSheet: spriteConfig.noSpriteSheet || false,
});

        const itemsData = await fetchItemsByTopic(topicNum);
        const initializedItems = initializeGameItems(itemsData, topicData);
        setItems(initializedItems);
        
        if (spriteConfig.noSpriteSheet) {
          console.log(`ℹ️ No sprite sheet for topic ${topicNum}, using gray squares with checkmarks`);
        } else {
          console.log(`✅ Loaded sprite sheet for topic ${topicNum}: ${spriteConfig.fileName}`);
        }
      } catch (err) {
        console.error("Error fetching topic/items:", err);
      }
    };

    fetchData();
  }, [topicId]);

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
 
  // --- Handle input ---
const handleInputChange = async (text) => {
  setInput(text);
  
  const matched = handleItemMatch(text, 1, 1, gameOver);
  
  if (matched) {
    console.log(`🎯 Matched item: ${matched.name}`);
    
    incrementPlayerSolvedCount();

    // Play item solved sound
    if (soundsReady) {
        console.log('🔊 Playing item-solved sound');
        await soundService.playSound('item-solved');
      } else {
        console.log('🔇 Sounds not ready, skipping sound');
      }

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

    // Clear input after a short delay, but maintain focus
    setTimeout(() => {
      console.log(`⌨️ Delayed input clear`);
      setInput("");
      
      // Force focus restoration after clear
      setTimeout(() => {
        if (inputRef.current) {
          console.log(`⌨️ Restoring focus after delayed clear`);
          inputRef.current.focus();
        }
      }, 10);
    }, 50);
  }
};

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleExitGame = () => {
    clearTimer();
    setGameOver(false);
    setGameModalVisible(false);
    router.replace("/");
  };

  const handleRestartGame = async () => {
    clearTimer();
    setGameOver(false);
    setGameModalVisible(false);
    setTime(mode === "countdown" ? 60 : 0);
    setInput(""); // Reset input on restart
    setItems(prev => prev.map(item => ({ ...item, solved: false })));
    startTimer();
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
        {/* Top Row */}
        <View style={styles.topRow}>
          <View style={styles.rowLeft}>
            <TouchableOpacity onPress={handleExitGame}>
              <Text style={{ color: "blue", fontSize: 16 }}>Exit Game</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rowSection}>
            <Text style={styles.counter}>
              {solvedCount} / {items.length}
            </Text>
          </View>

          <View style={styles.rowRight}>
            <Text style={styles.countdown}>
              {mode === "countdown" ? `${time}s` : formatTime(time)}
            </Text>
          </View>
        </View>

        {/* Player Stats Row */}
        <View style={styles.bottomRow}>
          <View style={styles.rowSection}>
            <Text style={styles.counter}>
              You solved {playerSolvedCount}
            </Text>
          </View>
        </View>

        {/* Input Field */}
        <TextInput
          ref={inputRef}
          placeholder="Type item name..."
          value={input}
          onChangeText={handleInputChange}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!gameOver}
          onBlur={() => {
            console.log('🛑 BLUR EVENT DETECTED - immediately refocusing');
            if (!gameOver) {
              // Immediate refocus with multiple attempts
              const refocusAttempt = (attempt = 0) => {
                if (attempt < 5 && inputRef.current) {
                  setTimeout(() => {
                    inputRef.current.focus();
                    console.log(`🛑 Refocus attempt ${attempt + 1}`);
                    if (document.activeElement !== inputRef.current) {
                      refocusAttempt(attempt + 1);
                    }
                  }, attempt * 50);
                }
              };
              refocusAttempt(0);
            }
          }}
        />

        {/* Game Grid */}
        <ScrollView 
          contentContainerStyle={styles.grid} 
          ref={scrollRef}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          // Add these props to prevent focus stealing
          onScrollBeginDrag={(e) => {
            console.log('🛑 Scroll began - preventing focus loss');
            // Prevent focus loss when scroll starts
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }}
          onTouchStart={(e) => {
            console.log('🛑 Touch started - maintaining focus');
            // Prevent touch events from stealing focus
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }}
          // Web-specific focus prevention
          {...(Platform.OS === 'web' && {
            onMouseDown: (e) => {
              console.log('🛑 Mouse down - maintaining focus');
              // Prevent mouse events from stealing focus on web
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }
          })}
        >
          {items.map((item) => {
            const { left, top } = getSpritePosition(item.order, spriteInfo);
            const isSolvedOrGameOver = item.solved || gameOver;
            
            const scale = calculateSpriteScale(spriteInfo.spriteSize, 100);

            return (
              <View key={item.id} style={[styles.itemContainer, { width: itemWidth }]}>
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
                  
                  {/* Border overlay - only for solved items */}
                  {item.solved && (
                    <Image 
                      source={solvedBorder}
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