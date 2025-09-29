import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { fetchAllLobbies, createLobby, joinLobby } from '../services/api'; // <- updated
import { getPlayer } from '../services/session';

export default function LobbiesScreen() {
  const router = useRouter();

  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create lobby modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newLobbyName, setNewLobbyName] = useState('');

  // Join lobby modal
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [modalCode, setModalCode] = useState('');
  const [selectedLobbyId, setSelectedLobbyId] = useState(null);

  const [player, setPlayer] = useState(null);

  // Load player session
  useEffect(() => {
    async function loadPlayer() {
      const p = await getPlayer();
      if (!p?.id) {
        Alert.alert('Error', 'You must be logged in first.');
        router.push('/'); // redirect to login
        return;
      }
      setPlayer(p);
    }
    loadPlayer();
  }, []);

  // Fetch all lobbies
  const loadLobbies = async () => {
    setLoading(true);
    const data = await fetchAllLobbies(); // <- returns all lobbies with topic info, ordered newest
    setLobbies(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (player) loadLobbies();
  }, [player]);

  // Handle creating a new lobby
  const handleCreateConfirm = async () => {
    if (!newLobbyName.trim()) {
      Alert.alert('Error', 'Please enter a lobby name');
      return;
    }

    const lobby = await createLobby(null, newLobbyName.trim(), player.id); // topicId optional
    if (!lobby) return;

    setCreateModalVisible(false);
    setNewLobbyName('');
    loadLobbies();
  };

  // Handle joining a lobby
  const handleJoinConfirm = async () => {
    if (!modalCode.trim() || !selectedLobbyId) {
      Alert.alert('Error', 'Please select a lobby and enter the code');
      return;
    }

    try {
      const joinedPlayer = await joinLobby(
        selectedLobbyId,
        player.name,
        modalCode.trim(),
        player.id
      );

      if (!joinedPlayer) {
        Alert.alert('Error', 'Failed to join lobby. Check the code or try again.');
        return;
      }

      setJoinModalVisible(false);
      router.push(
        `waitingRoom?code=${modalCode.trim()}&playerId=${joinedPlayer.id}&playerName=${player.name}`
      );
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to join lobby. Try again later.');
    }
  };

  const openJoinModal = (lobby) => {
    setSelectedLobbyId(lobby.id);
    setModalCode(lobby.code || '');
    setJoinModalVisible(true);
  };

  const renderLobby = ({ item }) => (
    <View style={styles.lobbyItem}>
      <Text style={styles.lobbyText}>
        {item.code} - {item.name} ({item.topic?.name || 'No topic'})
      </Text>
      <TouchableOpacity
        style={styles.joinButton}
        onPress={() => openJoinModal(item)}
      >
        <Text style={{ color: 'white' }}>Join</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Hello, {player?.name || 'Player'}!</Text>

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setCreateModalVisible(true)}
      >
        <Text style={{ color: 'white' }}>Create New Lobby</Text>
      </TouchableOpacity>

      <Text style={styles.subTitle}>Available Lobbies:</Text>
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} color="#007AFF" />
      ) : lobbies.length === 0 ? (
        <Text style={{ marginTop: 10, color: '#007AFF' }}>No lobbies found. Create one!</Text>
      ) : (
        <FlatList
          data={lobbies}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLobby}
          style={{ width: '100%', marginTop: 10 }}
        />
      )}

      {/* Create Lobby Modal */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Lobby Name</Text>
            <TextInput
              placeholder="Enter lobby name"
              placeholderTextColor="#888"
              value={newLobbyName}
              onChangeText={setNewLobbyName}
              style={styles.modalInput}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#007AFF' }]}
                onPress={handleCreateConfirm}
              >
                <Text style={{ color: 'white' }}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#ccc' }]}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join Lobby Modal */}
      <Modal
        visible={joinModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Lobby</Text>
            <Text style={{ marginBottom: 10, color: '#007AFF' }}>
              Joining as: {player?.name}
            </Text>
            <TextInput
              placeholder="Lobby Code"
              placeholderTextColor="#888"
              value={modalCode}
              onChangeText={setModalCode}
              style={styles.modalInput}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#007AFF' }]}
                onPress={handleJoinConfirm}
              >
                <Text style={{ color: 'white' }}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#ccc' }]}
                onPress={() => setJoinModalVisible(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#000' },
  label: { fontWeight: 'bold', marginBottom: 10, color: '#007AFF' },
  subTitle: { marginVertical: 15, fontWeight: 'bold', color: '#007AFF' },
  lobbyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    width: '100%',
  },
  lobbyText: { flex: 1, color: '#007AFF' },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#007AFF' },
  modalInput: {
    borderWidth: 1,
    borderColor: '#007AFF',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    color: '#fff',
    backgroundColor: '#000',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: {
    flex: 1,
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
});
