import { useEffect, useState } from "react";
import { 
  View, 
  Button, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  Modal, 
  TouchableOpacity 
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { fetchCategories } from '../services/api';

export default function TopicsScreen() {
  const { categoryId } = useLocalSearchParams(); // from query string
  const categoryIdNum = Number(categoryId); // convert to number
  const [topics, setTopics] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!categoryIdNum) return;
        const categories = await fetchCategories();

        // find the category by id
        const category = categories.find(c => c.id === categoryIdNum);
        if (category) {
          setCategoryName(category.name);
          setTopics(category.topics || []);
        } else {
          console.warn("Category not found for id:", categoryIdNum);
        }
      } catch (err) {
        console.error("Error fetching categories/topics:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [categoryIdNum]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleSelectMode = (mode) => {
    setShowModal(false);
    router.push(`/gameScreen?categoryId=${categoryId}&topicId=${selectedTopic.id}&mode=${mode}`);
  };

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, marginBottom: 10 }}>
        {categoryName ? `Topics for ${categoryName}` : `Topics`}
      </Text>

      {topics.length > 0 ? (
        topics.map(topic => (
          <Button
            key={topic.id}
            title={topic.name}
            onPress={() => {
              setSelectedTopic(topic);
              setShowModal(true);
            }}
          />
        ))
      ) : (
        <Text>No topics found for this category.</Text>
      )}

      {/* Game mode selection modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.5)"
        }}>
          <View style={{
            width: 300,
            backgroundColor: "white",
            borderRadius: 10,
            padding: 20,
            alignItems: "center"
          }}>
            <Text style={{ fontSize: 18, marginBottom: 15 }}>Choose Game Mode</Text>

            <TouchableOpacity
              style={{ padding: 12, backgroundColor: "#007AFF", borderRadius: 8, marginBottom: 10 }}
              onPress={() => handleSelectMode("countdown")}
            >
              <Text style={{ color: "white" }}>Countdown (1 minute)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ padding: 12, backgroundColor: "#34C759", borderRadius: 8 }}
              onPress={() => handleSelectMode("fastest")}
            >
              <Text style={{ color: "white" }}>Fastest (Timer Up)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 15 }}
              onPress={() => setShowModal(false)}
            >
              <Text style={{ color: "red" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
