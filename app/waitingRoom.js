import { useState, useEffect, useRef } from "react";
import { View, Text, Button, FlatList, StyleSheet, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getPlayer } from "../services/session";
import { getLobby } from "../services/api";
import { getSocket, removeWaitingRoomListeners } from "../services/socket"; // ← CHANGED IMPORT

export default function WaitingRoom() {
  const router = useRouter();
  const { code } = useLocalSearchParams();

  const [lobby, setLobby] = useState(null);
  const [player, setPlayer] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const socketRef = useRef(null);
  const fetchedLobbyRef = useRef(null);
  const isNavigatingToGameRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const savedPlayer = await getPlayer();
      console.log("👤 Player loaded:", savedPlayer);

      if (!savedPlayer?.id) {
        router.push("/");
        return;
      }
      if (!isMounted) return;

      setPlayer(savedPlayer);

      // ✅ Use single socket
      const s = getSocket();
      socketRef.current = s;

      console.log("✅ Socket connected for waiting room:", s.id);

      try {
        const data = await getLobby(code);
        console.log("📥 Lobby fetched:", data);
        if (!isMounted) return;

        setLobby(data);
        fetchedLobbyRef.current = data;

        // CHANGED: Use joinWaitingRoom instead of joinLobby
        s.emit("joinWaitingRoom", {
          lobbyId: data.id,
          playerId: savedPlayer.id,
          name: savedPlayer.name,
        });
        console.log("➡️ joinWaitingRoom emitted:", {
          lobbyId: data.id,
          playerId: savedPlayer.id,
          name: savedPlayer.name,
        });
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to join lobby.");
      }

      // 🟢 Event listeners - same events but on single socket
      s.on("lobbyUpdate", (updatedLobby) => {
        console.log("📊 lobbyUpdate:", updatedLobby);
        if (!updatedLobby) return;

        if (fetchedLobbyRef.current?.topic_id && !updatedLobby.topic_id) {
          updatedLobby.topic_id = fetchedLobbyRef.current.topic_id;
        }

        setLobby(updatedLobby);
        fetchedLobbyRef.current = updatedLobby;

        const me = updatedLobby.players?.find(
          (p) => String(p.id) === String(savedPlayer.id)
        );
        if (me) {
          setIsReady(me.is_ready);
        }
      });

      s.on("countdown", ({ timeLeft }) => {
        console.log("⏳ Countdown:", timeLeft);
        setCountdown(timeLeft);
      });

      s.on("gameStarted", ({ firstTurnPlayerId, firstTurnPlayerName, turnTime }) => {
        console.log("🎮 Game started:", {
          firstTurnPlayerId,
          firstTurnPlayerName,
          turnTime,
        });

        const topicId = fetchedLobbyRef.current?.topic_id;
        console.log("📝 Starting game with topic_id:", topicId);

        // Mark that we're navigating to game
        isNavigatingToGameRef.current = true;

        // Remove waiting room listeners but keep socket connection
        removeWaitingRoomListeners();

        // Navigate to challenge game screen - no socket switching needed!
        router.push({
          pathname: "challengeGameScreen",
          params: {
            lobbyId: Number(fetchedLobbyRef.current?.id),
            playerId: Number(savedPlayer.id),
            playerName: savedPlayer.name,
            code: fetchedLobbyRef.current?.code,
            firstTurnPlayerId: Number(firstTurnPlayerId),
            firstTurnPlayerName,
            turnTime: Number(turnTime),
            topicId: Number(topicId),
          },
        });
      });

      s.on("playerLeft", ({ playerId, playerName }) => {
        console.log(`❌ Player ${playerName} left the lobby`);
        // Update UI if needed
      });

    })();

    return () => {
      console.log("👋 Leaving WaitingRoom — cleaning up listeners");

      // Only leave the lobby if we're NOT navigating to the game
      if (!isNavigatingToGameRef.current) {
        const s = socketRef.current;
        if (s && fetchedLobbyRef.current?.id && player?.id) {
          s.emit("leaveLobby", {
            lobbyId: fetchedLobbyRef.current.id,
            playerId: player.id,
          });
        }
      }

      // Remove waiting room listeners but keep socket connection
      removeWaitingRoomListeners();
      isMounted = false;
    };
  }, [code]);

  const handleReady = () => {
    if (!socketRef.current || !lobby?.id || !player?.id) return;
    const newReady = !isReady;
    setIsReady(newReady);

    socketRef.current.emit("setReady", {
      lobbyId: lobby.id,
      playerId: player.id,
      isReady: newReady,
    });
  };

  const handleStart = () => {
    if (!socketRef.current || !lobby?.id) return;
    if (String(player.id) !== String(lobby.ownerId)) return;

    console.log("🚀 Start game by owner:", player.id);
    socketRef.current.emit("startGame", { lobbyId: lobby.id });
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!lobby || !player)
    return <Text style={{ color: "#fff" }}>Loading lobby...</Text>;

  const allReady = lobby.players?.every((p) => p.is_ready);
  const isOwner = String(player.id) === String(lobby.ownerId);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lobby Code: {lobby.code || "N/A"}</Text>

      <FlatList
        data={lobby.players || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Text style={styles.playerText}>
            {item.name} - {item.is_ready ? "✅ Ready" : "❌ Not ready"}
          </Text>
        )}
        style={{ width: "100%", marginBottom: 20 }}
      />

      <Button title={isReady ? "Unready" : "Ready"} onPress={handleReady} />

      {isOwner && (
        <View style={{ marginTop: 10 }}>
          <Button
            title="Start"
            onPress={handleStart}
            disabled={!allReady || countdown !== null}
          />
        </View>
      )}

      {countdown !== null && (
        <Text style={styles.countdownText}>
          Game starts in {countdown} s
        </Text>
      )}

      <View style={{ marginTop: 20 }}>
        <Button
          title="Leave Lobby"
          color="red"
          onPress={() => {
            if (socketRef.current && lobby?.id) {
              socketRef.current.emit("leaveLobby", {
                lobbyId: lobby.id,
                playerId: player.id,
              });
            }
            removeWaitingRoomListeners();
            router.replace("/lobbiesScreen");
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#000",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 15,
  },
  playerText: { color: "#fff", marginBottom: 5 },
  countdownText: {
    color: "#ff0",
    fontSize: 20,
    marginTop: 15,
    fontWeight: "bold",
  },
});