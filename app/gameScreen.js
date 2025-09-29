import { useEffect, useState, useRef } from "react";
import { View, Text, ScrollView, TextInput, Modal, TouchableOpacity, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import styles from "../styles/GameScreenStyles";
import { fetchTopicById, fetchItemsByTopic } from '../services/api';

const DEFAULT_SPRITE_SIZE = 84;
const DEFAULT_MARGIN = 1;
const DEFAULT_SPRITES_PER_ROW = 28;
const DEFAULT_SHEET_WIDTH = 2381;
const DEFAULT_SHEET_HEIGHT = 1531;

export default function GameScreen() {
  const { topicId, mode } = useLocalSearchParams();
  const router = useRouter();
  const scrollRef = useRef(null);
  const itemRefs = useRef({});

  const [items, setItems] = useState([]);
  const [input, setInput] = useState("");
  const [time, setTime] = useState(mode === "countdown" ? 60 : 0);
  const [gameOver, setGameOver] = useState(false);
  const [spriteInfo, setSpriteInfo] = useState({
    spriteSize: DEFAULT_SPRITE_SIZE,
    margin: DEFAULT_MARGIN,
    spritesPerRow: DEFAULT_SPRITES_PER_ROW,
    sheetWidth: DEFAULT_SHEET_WIDTH,
    sheetHeight: DEFAULT_SHEET_HEIGHT
  });

  const localSheets = {
    3: { src: require("../assets/images/spritesheet_pokemon.png"), width: 2381, height: 1531 },
    4: { src: require("../assets/images/spritesheet_lol.png"), width: 1211, height: 2179 }
  };

  useEffect(() => {
  const fetchData = async () => {
    try {
      const topicNum = Number(topicId);
      if (!topicNum) return;

      // Fetch topic via api.js
      const topicData = await fetchTopicById(topicNum);
      if (!topicData) return;

      // Pick sprite sheet
      const sheet = localSheets[topicData.id] || {
        src: require("../assets/images/spritesheet_pokemon.png"),
        width: DEFAULT_SHEET_WIDTH,
        height: DEFAULT_SHEET_HEIGHT
      };

      setSpriteInfo({
        spriteSize: topicData.sprite_size || DEFAULT_SPRITE_SIZE,
        margin: DEFAULT_MARGIN,
        spritesPerRow: topicData.sprites_per_row || DEFAULT_SPRITES_PER_ROW,
        sheetWidth: sheet.width,
        sheetHeight: sheet.height,
        sheetUrl: sheet.src
      });

      // Fetch items via api.js
      const itemsData = await fetchItemsByTopic(topicNum);

      // Sort items
      let sortedItems = [...itemsData];
      if (topicData.sort_field === "order") {
        sortedItems.sort((a, b) => (a.attributes?.order ?? 0) - (b.attributes?.order ?? 0));
      } else if (topicData.sort_field === "name") {
        sortedItems.sort((a, b) => a.name.localeCompare(b.name));
      }

      setItems(
        sortedItems.map(item => ({
          ...item,
          solved: false,
          order: item.attributes?.order
        }))
      );
    } catch (err) {
      console.error("Error fetching topic/items:", err);
    }
  };

  fetchData();
}, [topicId]);

  // Timer logic
  useEffect(() => {
    if (mode === "countdown") {
      if (time <= 0) return setGameOver(true);
      const timer = setInterval(() => setTime(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (mode === "fastest") {
      if (gameOver) return;
      const timer = setInterval(() => setTime(prev => prev + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [time, mode, gameOver]);

  const handleInputChange = text => {
    setInput(text);
    const matched = items.find(
      item => !item.solved && item.name.toLowerCase() === text.trim().toLowerCase()
    );

    if (matched) {
      setItems(prev =>
        prev.map(item => item.id === matched.id ? { ...item, solved: true } : item)
      );
      setInput("");

      if (mode === "countdown") {
        setTime(prev => prev + 5);
      }

      const ref = itemRefs.current[matched.id];
      if (ref?.scrollIntoView) ref.scrollIntoView({ behavior: "smooth", block: "center" });
      else if (ref?.measureLayout) ref.measureLayout(scrollRef.current, (x, y) => {
        scrollRef.current.scrollTo({ y: y - 10, animated: true });
      });
    }
  };

  const solvedCount = items.filter(item => item.solved).length;

  useEffect(() => {
    if (mode === "fastest" && items.length > 0 && solvedCount === items.length) setGameOver(true);
  }, [solvedCount, items, mode]);

  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  function getSpritePosition(order) {
    const index = order - 1;
    const row = Math.floor(index / spriteInfo.spritesPerRow);
    const col = index % spriteInfo.spritesPerRow;
    const left = 1 + col * (spriteInfo.spriteSize + spriteInfo.margin);
    const top = 1 + row * (spriteInfo.spriteSize + spriteInfo.margin);
    return { left, top };
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <View style={styles.topRow}>
        <Text style={styles.countdown}>{mode === "countdown" ? `${time}s` : formatTime(time)}</Text>
        <Text style={styles.counter}>{solvedCount} / {items.length}</Text>
      </View>

      <TextInput
        placeholder="Type item name..."
        value={input}
        onChangeText={handleInputChange}
        style={styles.input}
        placeholderTextColor="#888"
      />

      <ScrollView contentContainerStyle={styles.grid} ref={scrollRef}>
        {items.map(item => {
          const { left, top } = getSpritePosition(item.order);

          return (
            <View key={item.id} style={styles.itemContainer}>
              <View
                style={[styles.itemSquare, item.solved ? styles.solved : null]}
                ref={ref => (itemRefs.current[item.id] = ref)}
              >
                {item.solved && item.order ? (
                  <View
                    style={{
                      width: spriteInfo.spriteSize,
                      height: spriteInfo.spriteSize,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: "green",
                    }}
                  >
                    <Image
                      source={spriteInfo.sheetUrl}
                      style={{
                        width: spriteInfo.sheetWidth,
                        height: spriteInfo.sheetHeight,
                        transform: [
                          { translateX: -left },
                          { translateY: -top }
                        ],
                      }}
                    />
                  </View>
                ) : item.solved && !item.order ? (
                  <Text style={styles.itemText}>{item.name}</Text>
                ) : null}
              </View>
              {item.solved && <Text style={styles.pokemonName}>{item.name}</Text>}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={gameOver} transparent animationType="slide">
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Game Over</Text>
            {mode === "countdown" ? (
              <Text style={styles.modalText}>You got {solvedCount} / {items.length} correct!</Text>
            ) : (
              <Text style={styles.modalText}>Completed in {formatTime(time)}!</Text>
            )}
            <TouchableOpacity style={styles.modalButton} onPress={() => { setGameOver(false); router.replace("/"); }}>
              <Text style={styles.modalButtonText}>Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
