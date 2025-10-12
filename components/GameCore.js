import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  Animated,
} from "react-native";
import { useGameAnimations } from "../hooks/useGameAnimations";
import { useGameLogic } from "../hooks/useGameLogic";
import { scrollToItem } from "../helpers/scrollHelpers";
import { getSpritePosition, calculateSpriteScale } from "../helpers/spriteHelpers";
import { getSpriteSheetConfig } from "../config/spriteSheetConfigs";
import styles from "../styles/GameScreenStyles";
import solvedBorder from "../assets/images/solved_border2.png";
import itemUnsolved from "../assets/images/item_unsolved.png";

// Default constants
const DEFAULT_SPRITE_SIZE = 120;
const DEFAULT_MARGIN = 1;
const DEFAULT_SPRITES_PER_ROW = 10;

export const GameCore = ({
  // Required props
  items,
  setItems,
  spriteInfo,
  setSpriteInfo,
  topicId,
  currentTurnPlayer,
  gameOver,
  input,
  setInput,
  onItemSolved, // Callback when item is solved
  onInputMatch,  // Callback when input matches an item
  
  // Optional props with defaults
  playerSolvedCount = 0,
  showTurnInfo = false,
  showPlayerStats = false,
  autoScroll = true,
}) => {
  const scrollRef = useRef(null);
  const itemRefs = useRef({});

  // Custom hooks
  const { flipItem, getBackTransform, getFrontTransform } = useGameAnimations();
  const { handleItemMatch, solvedCount, incrementPlayerSolvedCount } = useGameLogic();

  // Load sprite sheet when topicId changes
  useEffect(() => {
    if (!topicId) return;

    const loadSpriteSheet = async () => {
      try {
        const spriteConfig = getSpriteSheetConfig(topicId);
        setSpriteInfo(prev => ({
          ...prev,
          sheetWidth: spriteConfig.width,
          sheetHeight: spriteConfig.height,
          sheetUrl: spriteConfig.src,
        }));
      } catch (err) {
        console.error("Error loading sprite sheet:", err);
      }
    };

    loadSpriteSheet();
  }, [topicId]);

  const handleInputChange = (text) => {
    setInput(text);
    
    const matched = handleItemMatch(text, currentTurnPlayer?.id, 0, gameOver); // playerId 0 for single player
    
    if (matched) {
      console.log(`🎯 Matched item: ${matched.name}`);
      setInput("");
      incrementPlayerSolvedCount();
      
      // Notify parent component
      onInputMatch?.(matched);
      onItemSolved?.(matched.id);
    }
  };

  const handleItemSolved = (itemId) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, solved: true } : item
    ));

    if (autoScroll) {
      setTimeout(() => {
        scrollToItem(itemRefs, scrollRef, itemId, () => {
          console.log(`🎬 Triggering flip for item ${itemId}`);
          flipItem(itemId);
        });
      }, 100);
    } else {
      flipItem(itemId);
    }
  };

  // Render game grid
  const renderGameGrid = () => {
    const { left, top } = getSpritePosition(item.order);
    const isSolvedOrGameOver = item.solved || gameOver;
    
    const scale = calculateSpriteScale(spriteInfo.spriteSize, 100);

    return (
      <ScrollView 
        contentContainerStyle={styles.grid} 
        ref={scrollRef}
        showsVerticalScrollIndicator={true}
      >
        {items.map((item) => (
          <View key={item.id} style={styles.itemContainer}>
            <View style={styles.outerContainer}>
              <View 
                style={styles.animationContainer}
                ref={(ref) => (itemRefs.current[item.id] = ref)}
              >
                {/* Back side (unsolved) - rotates away */}
                <Animated.View 
                  style={[
                    styles.cardSide,
                    item.solved && getBackTransform(item.id),
                  ]}
                >
                  <Image 
                    source={itemUnsolved}
                    style={styles.unsolvedBackground}
                  />
                </Animated.View>
                
                {/* Front side (solved) - rotates in */}
                <Animated.View 
                  style={[
                    styles.cardSide,
                    styles.cardFront,
                    item.solved && getFrontTransform(item.id),
                  ]}
                >
                  <View style={styles.imageContainer}>
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
                  </View>
                </Animated.View>
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
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {/* Game Header - Customizable per game mode */}
      <View style={styles.topRow}>
        <View style={styles.rowLeft}>
          {/* Can be customized by parent */}
          {props.renderHeaderLeft?.() || <Text>Game</Text>}
        </View>

        <View style={styles.rowSection}>
          <Text style={styles.counter}>
            {solvedCount} / {items.length}
          </Text>
        </View>

        <View style={styles.rowRight}>
          {showPlayerStats && (
            <Text style={styles.counter}>
              Solved: {playerSolvedCount}
            </Text>
          )}
        </View>
      </View>

      {/* Turn Info - Only show in multiplayer */}
      {showTurnInfo && currentTurnPlayer && (
        <View style={styles.bottomRow}>
          <View style={styles.rowSection}>
            <Text style={styles.counter}>
              {currentTurnPlayer.id === playerId
                ? "Your turn!"
                : `${currentTurnPlayer.name}'s turn`}
            </Text>
          </View>
        </View>
      )}

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
      {renderGameGrid()}
    </View>
  );
};