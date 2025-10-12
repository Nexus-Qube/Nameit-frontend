import { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  Modal, 
  TouchableOpacity,
  SectionList 
} from "react-native";
import { useRouter } from "expo-router";
import { fetchCategories } from '../services/api';
import styles from '../styles/SingleplayerScreenStyles';

export default function SingleplayerScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const categoriesData = await fetchCategories();
        setCategories(categoriesData || []);
      } catch (err) {
        console.error("Error fetching categories:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Transform categories data for SectionList
  const sectionData = categories.map(category => ({
    title: category.name,
    data: category.topics || [],
  }));

  const handleSelectMode = (mode) => {
    setShowModal(false);
    router.push(`/gameScreen?topicId=${selectedTopic.id}&mode=${mode}`);
  };

  const renderTopicItem = ({ item }) => (
    <TouchableOpacity
      style={styles.topicItem}
      onPress={() => {
        setSelectedTopic(item);
        setShowModal(true);
      }}
    >
      <Text style={styles.topicText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

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
        <Text style={styles.title}>Single Player</Text>
      </View>

      {categories.length === 0 ? (
        <Text style={styles.emptyText}>No categories found.</Text>
      ) : (
        <SectionList
          sections={sectionData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTopicItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Game mode selection modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Game Mode</Text>
            <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 15 }}>
              {selectedTopic?.name}
            </Text>

            <TouchableOpacity
              style={[styles.modeButton, { backgroundColor: "#007AFF" }]}
              onPress={() => handleSelectMode("countdown")}
            >
              <Text style={styles.modeButtonText}>Countdown (1 minute)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeButton, { backgroundColor: "#34C759" }]}
              onPress={() => handleSelectMode("fastest")}
            >
              <Text style={styles.modeButtonText}>Fastest (Timer Up)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}