import { View, Text, FlatList, TouchableOpacity, StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { fetchCategories } from '../services/api';
import { clearPlayer } from '../services/session'; // <-- import logout

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    async function loadCategories() {
      const data = await fetchCategories();
      setCategories(data);
    }
    loadCategories();
  }, []);

  const handleLogout = async () => {
    await clearPlayer();
    router.push('/'); // back to login screen
  };

  return (
    <View style={styles.container}>
      <Button title="Logout" onPress={handleLogout} color="red" />
      
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push(`/topicsScreen?categoryId=${item.id}`)}
          >
            <Text style={styles.buttonText}>{item.name}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingVertical: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  button: { backgroundColor: '#007AFF', padding: 15, marginVertical: 5, borderRadius: 8 },
  buttonText: { color: 'white', fontSize: 16 },
});
