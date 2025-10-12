import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
  SectionList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { fetchAllLobbies, createLobby, joinLobby, fetchCategories } from '../services/api';
import { getPlayer } from '../services/session';
import styles from '../styles/LobbiesScreenStyles';

export default function LobbiesScreen() {
  const router = useRouter();

  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);

  // Create lobby modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [topicModalVisible, setTopicModalVisible] = useState(false);
  const [newLobbyName, setNewLobbyName] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(null);

  // Join lobby modal
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [modalCode, setModalCode] = useState('');
  const [selectedLobbyId, setSelectedLobbyId] = useState(null);

  const [player, setPlayer] = useState(null);

  // Load player session and categories
  useEffect(() => {
    async function loadData() {
      const p = await getPlayer();
      if (!p?.id) {
        Alert.alert('Error', 'You must be logged in first.');
        router.push('/');
        return;
      }
      setPlayer(p);

      // Load categories for topic selection
      const cats = await fetchCategories();
      setCategories(cats);
    }
    loadData();
  }, []);

  // Fetch all lobbies
  const loadLobbies = async () => {
    setLoading(true);
    const data = await fetchAllLobbies();
    setLobbies(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (player) loadLobbies();
  }, [player]);

  // Group lobbies by topic
  const groupedLobbies = lobbies.reduce((acc, lobby) => {
    const topicName = lobby.topic?.name || 'No Topic';
    if (!acc[topicName]) {
      acc[topicName] = [];
    }
    acc[topicName].push(lobby);
    return acc;
  }, {});

  // Convert to SectionList format
  const sectionData = Object.keys(groupedLobbies).map(topicName => ({
    title: topicName,
    data: groupedLobbies[topicName],
  }));

  // Handle creating a new lobby - step 1: show topic selection
  const handleCreateLobby = () => {
    setCreateModalVisible(true);
  };

  // Handle topic selection - step 2: show name input
  const handleTopicSelect = (topic) => {
    setSelectedTopic(topic);
    setTopicModalVisible(true);
    setCreateModalVisible(false);
  };

  // Handle final lobby creation
  const handleCreateConfirm = async () => {
    if (!newLobbyName.trim()) {
      Alert.alert('Error', 'Please enter a lobby name');
      return;
    }

    const lobby = await createLobby(selectedTopic.id, newLobbyName.trim(), player.id);
    if (!lobby) return;

    setTopicModalVisible(false);
    setNewLobbyName('');
    setSelectedTopic(null);
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
        {item.code} - {item.name} ({item.players?.length || 0} players)
      </Text>
      <TouchableOpacity
        style={styles.joinButton}
        onPress={() => openJoinModal(item)}
      >
        <Text style={{ color: 'white' }}>Join</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderTopicItem = ({ item }) => (
    <TouchableOpacity
      style={styles.topicItem}
      onPress={() => handleTopicSelect(item)}
    >
      <Text style={styles.topicText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
  <TouchableOpacity 
    style={styles.backButton}
    onPress={() => router.push('/')}
  >
    <Text style={styles.backButtonText}>← Back</Text>
  </TouchableOpacity>
  <Text style={styles.title}>Multiplayer Lobbies</Text>
</View>

      <Text style={styles.label}>Hello, {player?.name || 'Player'}!</Text>

      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreateLobby}
      >
        <Text style={{ color: 'white' }}>Create New Lobby</Text>
      </TouchableOpacity>

      <Text style={styles.subTitle}>Available Lobbies:</Text>
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 20 }} color="#007AFF" />
      ) : lobbies.length === 0 ? (
        <Text style={{ marginTop: 10, color: '#007AFF' }}>No lobbies found. Create one!</Text>
      ) : (
        <SectionList
          sections={sectionData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLobby}
          renderSectionHeader={renderSectionHeader}
          style={{ width: '100%', marginTop: 10 }}
        />
      )}

      {/* Topic Selection Modal */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Topic</Text>
            <FlatList
              data={categories.flatMap(cat => cat.topics || [])}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderTopicItem}
              style={{ maxHeight: 400 }}
            />
            <View style={styles.modalButtons}>
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

      {/* Lobby Name Input Modal */}
      <Modal
        visible={topicModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTopicModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Lobby</Text>
            <Text style={{ color: '#007AFF', marginBottom: 10 }}>
              Topic: {selectedTopic?.name}
            </Text>
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
                onPress={() => setTopicModalVisible(false)}
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