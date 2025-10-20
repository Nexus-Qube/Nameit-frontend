// frontend\components\GameGrid.js
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { getSpritePosition, calculateSpriteScale } from "../helpers/spriteHelpers";
import { PLAYER_COLORS, getColorById } from "../constants/PlayerColors";
import styles from "../styles/GameScreenStyles";

const itemUnsolved = require("../assets/images/item_unsolved.png");
const solvedBorderDefault = require("../assets/images/solved_border_default.png"); // ADD THIS BACK

// Import border images
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

const HIDE_SEEK_BORDERS = {
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

export default function GameGrid({
  // Grid data
  items,
  spriteInfo,
  
  // Layout
  itemWidth,
  calculatedItemsPerRow,
  
  // References
  scrollRef,
  itemRefs,
  
  // Game state
  gameOver,
  playerColors,
  
  // Game mode specific
  gameMode = 1, // 1: Marathon, 2: Hide & Seek, 3: Trap
  mySpecialItem = null, // hide & seek or trap item
  playerSelections = {},
  eliminatedPlayers = new Set(),
  
  // Single player support
  isSinglePlayer = false, // ADD THIS PROP
}) {
  const getBorderImage = (solvedByPlayerId, isSpecialItem = false) => {
    // For single player, always use default border
    if (isSinglePlayer) {
      return solvedBorderDefault;
    }
    
    const colorId = playerColors[solvedByPlayerId];
    if (!colorId) return solvedBorderDefault; // Fallback to default
    
    const color = getColorById(colorId);
    if (!color || !color.name) return solvedBorderDefault; // Fallback to default
    
    const colorName = color.name.toLowerCase();
    
    // Use special borders for hide & seek and trap modes
    if (isSpecialItem && (gameMode === 2 || gameMode === 3)) {
      return HIDE_SEEK_BORDERS[colorName] || solvedBorderDefault;
    }
    
    return COLORED_BORDERS[colorName] || solvedBorderDefault;
  };

  const renderItem = (item) => {
    const { left, top } = getSpritePosition(item.order, spriteInfo);
    const isSolvedOrGameOver = item.solved || gameOver;
    const scale = calculateSpriteScale(spriteInfo.spriteSize, 100);
    
    // Determine if this is a special item (hide & seek or trap)
    const isSpecialItem = item.isHideSeekItem || item.trapSprung;
    const borderImage = item.solvedBy ? getBorderImage(item.solvedBy, isSpecialItem) : null;
    
    // Check if this is the current player's special item
    const isMySpecialItem = mySpecialItem && mySpecialItem.id === item.id;
    
    // Special item indicators based on game mode
    const getSpecialItemText = () => {
      if (gameMode === 2) return "YOUR ITEM";
      if (gameMode === 3) return "YOUR TRAP";
      return "";
    };

    const getSpecialItemColor = () => {
      if (gameMode === 2) return "#FFD700"; // Gold for hide & seek
      if (gameMode === 3) return "#FF4444"; // Red for trap
      return "#fff";
    };

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
            {/* Special item indicator - show if it's my item and not solved */}
            {isMySpecialItem && !item.solved && (
              <View style={styles.myHideSeekIndicator}>
                <Text style={[styles.myHideSeekText, { color: getSpecialItemColor() }]}>
                  {getSpecialItemText()}
                </Text>
              </View>
            )}

            {/* Trap sprung indicator */}
            {item.trapSprung && (
              <View style={styles.trapSprungIndicator}>
                <Text style={styles.trapSprungText}>💀 TRAP!</Text>
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
          
          {/* Colored border overlay */}
          {item.solved && borderImage && (
            <Image 
              source={borderImage}
              style={styles.borderOverlay}
            />
          )}
        </View>

        {/* Show item name only if it's solved OR game over OR it's my special item */}
        {(isSolvedOrGameOver || isMySpecialItem) && (
          <Text
            style={{
              color: item.solved ? "#fff" : isMySpecialItem ? getSpecialItemColor() : "gray",
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
  );
}