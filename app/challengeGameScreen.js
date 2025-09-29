import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getSocket } from "../services/socket";
import { fetchTopicById, fetchItemsByTopic } from "../services/api";
import styles from "../styles/GameScreenStyles";

// Default sprite sheet info
const DEFAULT_SPRITE_SIZE = 120;
const DEFAULT_MARGIN = 1;
const DEFAULT_SPRITES_PER_ROW = 10;
const DEFAULT_SHEET_WIDTH = 2381;
const DEFAULT_SHEET_HEIGHT = 2180;

export default function ChallengeGameScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const lobbyId = Number(params.lobbyId);
  const playerId = Number(params.playerId);
  const firstTurnPlayerId = Number(params.firstTurnPlayerId);
  const firstTurnPlayerName = params.firstTurnPlayerName;
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
  const [items, setItems] = useState([]);
  const [spriteInfo, setSpriteInfo] = useState({
    spriteSize: DEFAULT_SPRITE_SIZE,
    margin: DEFAULT_MARGIN,
    spritesPerRow: DEFAULT_SPRITES_PER_ROW,
    sheetWidth: DEFAULT_SHEET_WIDTH,
    sheetHeight: DEFAULT_SHEET_HEIGHT,
    sheetUrl: null,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Answer before time runs out"
  );
  const [playerSolvedCount, setPlayerSolvedCount] = useState(0);

  const scrollRef = useRef(null);
  const itemRefs = useRef({});
  const currentTurnRef = useRef(currentTurnPlayer.id);
  const intervalRef = useRef(null);
  const hasLeftRef = useRef(false);

  const socket = getSocket();
  currentTurnRef.current = currentTurnPlayer.id;

  const localSheets = {
    3: {
      src: require("../assets/images/spritesheet_pokemon.png"),
      width: 2381,
      height: 1531,
    },
    4: {
      src: require("../assets/images/spritesheet_lol.png"),
      width: 1211,
      height: 2179,
    },
  };

  // --- Timer functions ---
  const clearTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
  const startTimer = () => {
    clearTimer();
    setTimer(turnTime);
    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) {
          if (
            !hasLeftRef.current &&
            currentTurnRef.current === playerId &&
            !gameOver
          ) {
            console.log("⏰ Timer expired - auto buttonPress (wrong)");
            socket.emit("buttonPress", { lobbyId, playerId, correct: false });
            setStatusMessage("You lost");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // --- Fetch topic + items using api.js ---
  useEffect(() => {
    if (!topicId) return;

    const fetchData = async () => {
      try {
        const topicData = await fetchTopicById(topicId);
        if (!topicData) return;

        const sheet = localSheets[topicId] || {
          src: require("../../assets/images/spritesheet_pokemon.png"),
          width: DEFAULT_SHEET_WIDTH,
          height: DEFAULT_SHEET_HEIGHT,
        };

        setSpriteInfo({
          spriteSize: topicData.sprite_size || DEFAULT_SPRITE_SIZE,
          margin: DEFAULT_MARGIN,
          spritesPerRow:
            topicData.sprites_per_row || DEFAULT_SPRITES_PER_ROW,
          sheetWidth: sheet.width,
          sheetHeight: sheet.height,
          sheetUrl: sheet.src,
        });

        const itemsData = await fetchItemsByTopic(topicId);

        let sortedItems = [...itemsData];
        if (topicData.sort_field === "order") {
          sortedItems.sort(
            (a, b) =>
              (a.attributes?.order ?? 0) - (b.attributes?.order ?? 0)
          );
        } else if (topicData.sort_field === "name") {
          sortedItems.sort((a, b) => a.name.localeCompare(b.name));
        }

        const initializedItems = sortedItems.map((item, index) => ({
          ...item,
          solved: false,
          order: item.attributes?.order ?? index + 1,
        }));

        setItems(initializedItems);
      } catch (err) {
        console.error("Error fetching topic/items:", err);
      }
    };

    fetchData();
  }, [topicId]);

  // --- Socket listeners ---
  useEffect(() => {
    socket.emit("joinGame", { lobbyId, playerId });

    socket.on("initItems", ({ solvedItems }) => {
      setItems((prev) =>
        prev.map((item) =>
          solvedItems.includes(item.id)
            ? { ...item, solved: true }
            : item
        )
      );
    });

    socket.on("itemSolved", ({ itemId }) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, solved: true } : item
        )
      );

      // Scroll to item
      setTimeout(() => {
        const ref = itemRefs.current[itemId];
        if (ref?.measureLayout && scrollRef.current) {
          ref.measureLayout(
            scrollRef.current,
            (x, y) => {
              scrollRef.current.scrollTo({
                y: Math.max(0, y - 10),
                animated: true,
              });
            },
            (err) => console.warn("measureLayout error:", err)
          );
        }
      }, 50);
    });

    const onTurnChanged = ({ currentTurnId, currentTurnName, timeLeft }) => {
      setCurrentTurnPlayer({
        id: Number(currentTurnId),
        name: currentTurnName,
      });
      setInput("");
      setTimer(timeLeft || turnTime);
      clearTimer();
      startTimer();
    };

    const onGameOver = ({ winner }) => {
      setWinner(winner);
      setGameOver(true);
      setModalVisible(true);
      clearTimer();
      socket.emit("leaveGame", { lobbyId, playerId });

      if (winner.id === playerId) {
        setStatusMessage("You won");
      } else {
        setStatusMessage("You lost");
      }
    };

    socket.on("turnChanged", onTurnChanged);
    socket.on("gameOver", onGameOver);

    startTimer();

    return () => {
      socket.off("initItems");
      socket.off("itemSolved");
      socket.off("turnChanged", onTurnChanged);
      socket.off("gameOver", onGameOver);
      clearTimer();
    };
  }, [lobbyId, playerId]);

  // --- Handle input ---
  const handleInputChange = (text) => {
    setInput(text);
    if (currentTurnRef.current !== playerId || gameOver) return;

    const matched = items.find(
      (item) =>
        !item.solved &&
        item.name.toLowerCase() === text.trim().toLowerCase()
    );

    if (matched) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === matched.id ? { ...item, solved: true } : item
        )
      );
      setInput("");
      setPlayerSolvedCount((c) => c + 1);
      socket.emit("buttonPress", {
        lobbyId,
        playerId,
        correct: true,
        itemId: matched.id,
      });
    }
  };

  const solvedCount = items.filter((item) => item.solved).length;

  // --- Sprite positioning ---
  function getSpritePosition(order) {
    const index = order - 1;
    const row = Math.floor(index / spriteInfo.spritesPerRow);
    const col = index % spriteInfo.spritesPerRow;
    const left = 1 + col * (spriteInfo.spriteSize + spriteInfo.margin);
    const top = 1 + row * (spriteInfo.spriteSize + spriteInfo.margin);
    return { left, top };
  }

  // --- Return to lobby ---
  const handleReturnToLobby = () => {
    hasLeftRef.current = true;
    clearTimer();
    setGameOver(false);
    setWinner(null);
    setModalVisible(false);
    socket.emit("leaveGame", { lobbyId, playerId });
    router.replace({
      pathname: "/waitingRoom",
      params: {
        code: params.code,
        playerId,
        playerName: params.playerName,
      },
    });
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {/* --- TOP ROW --- */}
      <View style={styles.topRow}>
  <View style={styles.rowLeft}>
    <TouchableOpacity onPress={handleReturnToLobby}>
      <Text style={{ color: "blue", fontSize: 16 }}>Return to Lobby</Text>
    </TouchableOpacity>
  </View>

  <View style={styles.rowSection}>
    <Text
      style={[
        styles.statusMessage,
        statusMessage === "Answer before time runs out" && { color: "yellow" },
        statusMessage === "You lost" && { color: "red" },
        statusMessage === "You won" && { color: "green" },
      ]}
    >
      {statusMessage}
    </Text>
  </View>

  <View style={styles.rowRight}>
    <Text style={styles.counter}>
      {solvedCount} / {items.length}
    </Text>
  </View>
</View>

      {/* --- BOTTOM ROW --- */}
      <View style={styles.bottomRow}>
  <View style={styles.rowLeft}>
    <Text style={styles.countdown}>{timer}s</Text>
  </View>

  <View style={styles.rowSection}>
    <Text
      style={[
        styles.counter,
        currentTurnPlayer.id === playerId && { color: "green" },
      ]}
    >
      {currentTurnPlayer.id === playerId
        ? "Your turn!"
        : `${currentTurnPlayer.name}'s turn`}
    </Text>
  </View>

  <View style={styles.rowRight}>
    <Text style={styles.counter}>
      You solved {playerSolvedCount}
    </Text>
  </View>
</View>


      {/* --- INPUT --- */}
      <TextInput
        placeholder={
          currentTurnPlayer.id === playerId
            ? "Type item name..."
            : "Wait for your turn..."
        }
        value={input}
        onChangeText={handleInputChange}
        style={[
          styles.input,
          currentTurnPlayer.id !== playerId && { backgroundColor: "#ddd" },
        ]}
        autoCapitalize="none"
        autoCorrect={false}
        editable={currentTurnPlayer.id === playerId && !gameOver}
      />

      {/* --- GRID --- */}
      <ScrollView contentContainerStyle={styles.grid} ref={scrollRef}>
        {items.map((item) => {
          const { left, top } = getSpritePosition(item.order);
          const isSolvedOrGameOver = item.solved || gameOver;

          return (
            <View key={item.id} style={styles.itemContainer}>
              <View
                style={styles.itemSquare}
                ref={(ref) => (itemRefs.current[item.id] = ref)}
              >
                {item.solved && spriteInfo.sheetUrl ? (
                  <View
                    style={{
                      width: spriteInfo.spriteSize,
                      height: spriteInfo.spriteSize,
                      overflow: "hidden",
                    }}
                  >
                    <Image
                      source={spriteInfo.sheetUrl}
                      style={{
                        width: spriteInfo.sheetWidth,
                        height: spriteInfo.sheetHeight,
                        transform: [
                          { translateX: -left },
                          { translateY: -top },
                        ],
                      }}
                    />
                  </View>
                ) : null}
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

      {/* --- MODAL --- */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Game Over</Text>
            {winner && (
              <Text style={{ fontWeight: "bold", marginBottom: 8 }}>
                Winner: {winner.name}
              </Text>
            )}
            <Text style={styles.modalText}>
              Solved {solvedCount} / {items.length} items
            </Text>

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: "red", fontSize: 16, marginTop: 10 }}>
                Close
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleReturnToLobby}>
              <Text style={{ color: "blue", fontSize: 16, marginTop: 10 }}>
                Return to Lobby
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
