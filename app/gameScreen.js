import { useEffect, useState, useRef, useMemo } from "react";
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
//import solvedBorder from "../assets/images/solved_border_default.png";
//import itemUnsolved from "../assets/images/item_unsolved.png";
//import { getImageSource } from '../utils/imageUtils';

//const solvedBorder = require("../assets/images/solved_border_default.png");
//const itemUnsolved = require("../assets/images/item_unsolved.png");

const solvedBorder = Platform.select({
  web: { uri: '/assets/images/solved_border_default.png' },
  default: require("../assets/images/solved_border_default.png")
});

const itemUnsolved = Platform.select({
  web: { uri: '/assets/images/item_unsolved.png' },
  default: require("../assets/images/item_unsolved.png")
});

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

  // Custom hooks
  const { items, setItems, playerSolvedCount, handleItemMatch, solvedCount, incrementPlayerSolvedCount } = useGameLogic();

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
      clearTimer();
    }
  }, [solvedCount, items, mode]);

  
  // --- Handle input ---
const handleInputChange = (text) => {
  setInput(text);
  
  const matched = handleItemMatch(text, 1, 1, gameOver); // Using 1 for single player
  
  if (matched) {
    console.log(`🎯 Matched item: ${matched.name}`);
    setInput("");
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
      scrollToItem(itemRefs, scrollRef, matched.id, items, calculatedItemsPerRow, itemWidth);
    }, 100);
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
    router.replace("/");
  };

  const handleRestartGame = () => {
    clearTimer();
    setGameOver(false);
    setTime(mode === "countdown" ? 60 : 0);
    setInput(""); // Reset input on restart
    setItems(prev => prev.map(item => ({ ...item, solved: false })));
    startTimer();
  };

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
          placeholder="Type item name..."
          value={input}
          onChangeText={handleInputChange}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!gameOver}
        />

        {/* Game Grid */}
        <ScrollView 
          contentContainerStyle={styles.grid} 
          ref={scrollRef}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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

        {/* Game Over Modal */}
        <Modal visible={gameOver} transparent animationType="fade">
          <View style={styles.modalBackground}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Game Over</Text>
              
              {mode === "countdown" ? (
                <Text style={styles.modalText}>
                  You got {solvedCount} / {items.length} correct!
                </Text>
              ) : (
                <Text style={styles.modalText}>
                  Completed in {formatTime(time)}!
                </Text>
              )}
              
              <Text style={styles.modalText}>
                You solved {playerSolvedCount} items
              </Text>

              <TouchableOpacity onPress={handleRestartGame} style={styles.modalButton}>
                <Text style={{ color: "blue", fontSize: 16 }}>
                  Play Again
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleExitGame} style={styles.modalButton}>
                <Text style={{ color: "red", fontSize: 16 }}>
                  Exit Game
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}