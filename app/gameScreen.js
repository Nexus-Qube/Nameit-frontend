import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  Modal,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { fetchTopicById, fetchItemsByTopic } from '../services/api';
import { getSpriteSheetConfig } from "../config/spriteSheetConfigs";
import { initializeGameItems } from "../helpers/gameLogicHelpers";
import { scrollToItem } from "../helpers/scrollHelpers";
import { getSpritePosition, calculateSpriteScale } from "../helpers/spriteHelpers";
import { useGameLogic } from "../hooks/useGameLogic";
import styles from "../styles/GameScreenStyles";
import solvedBorder from "../assets/images/solved_border2.png";
import itemUnsolved from "../assets/images/item_unsolved.png";

// Default sprite sheet info
const DEFAULT_SPRITE_SIZE = 120;
const DEFAULT_MARGIN = 1;
const DEFAULT_SPRITES_PER_ROW = 10;
const DEFAULT_SHEET_WIDTH = 2381;
const DEFAULT_SHEET_HEIGHT = 2180;

export default function GameScreen() {
  const { width } = Dimensions.get('window');
  const itemWidth = width >= 400 ? 120 : '30%';

  const { topicId, mode } = useLocalSearchParams();
  const router = useRouter();

  const [input, setInput] = useState(""); // ADD THIS LINE - input state was missing
  const [time, setTime] = useState(mode === "countdown" ? 60 : 0);
  const [gameOver, setGameOver] = useState(false);
  const [spriteInfo, setSpriteInfo] = useState({
    spriteSize: DEFAULT_SPRITE_SIZE,
    margin: DEFAULT_MARGIN,
    spritesPerRow: DEFAULT_SPRITES_PER_ROW,
    sheetWidth: DEFAULT_SHEET_WIDTH,
    sheetHeight: DEFAULT_SHEET_HEIGHT,
    sheetUrl: null,
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
          spriteSize: topicData.sprite_size || DEFAULT_SPRITE_SIZE,
          margin: DEFAULT_MARGIN,
          spritesPerRow: topicData.sprites_per_row || DEFAULT_SPRITES_PER_ROW,
          sheetWidth: spriteConfig.width,
          sheetHeight: spriteConfig.height,
          sheetUrl: spriteConfig.src,
        });

        const itemsData = await fetchItemsByTopic(topicNum);
        const initializedItems = initializeGameItems(itemsData, topicData);
        setItems(initializedItems);
        
        console.log(`✅ Loaded sprite sheet for topic ${topicNum}: ${spriteConfig.fileName}`);
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

      // Add time bonus in countdown mode
      if (mode === "countdown") {
        setTime(prev => prev + 5);
      }

      // Scroll to the solved item (no flip animation)
      setTimeout(() => {
        scrollToItem(itemRefs, scrollRef, matched.id);
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
                  {/* Show unsolved background or solved sprite */}
                  {!item.solved ? (
                    <Image 
                      source={itemUnsolved}
                      style={styles.unsolvedBackground}
                    />
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
  );
}