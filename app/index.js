import { useState, useEffect } from 'react';
import { View, Button, TextInput, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { login, register } from '../services/api';
import { savePlayer, getPlayer, clearPlayer } from '../services/session'; // <-- added clearPlayer

export default function HomeScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [player, setPlayer] = useState(null);

  // --- On page load: check session ---
  useEffect(() => {
    (async () => {
      const savedPlayer = await getPlayer();
      if (savedPlayer?.id) {
        setPlayer(savedPlayer);
        // Session exists, no need to show modal
        setModalVisible(false);
      } else {
        // No session → show login modal
        setModalVisible(true);
      }
    })();
  }, []);

  const handleLoginOrRegister = async () => {
    try {
      let p;
      if (isRegister) {
        p = await register(name, email, password);
      } else {
        p = await login(email, password);
      }

      if (p?.id) {
        await savePlayer(p);
        setPlayer(p);
        setModalVisible(false);
      } else {
        alert('Invalid credentials or registration failed');
      }
    } catch (err) {
      alert(err?.error || 'Error connecting to server');
    }
  };

  const handleSinglePlayer = () => {
    if (!player) return;
    // Go to single player categories screen
    router.push('/categoriesScreen');
  };

  const handleMultiplayer = () => {
    if (!player) return;
    router.push('/lobbiesScreen');
  };

  const handleDisconnect = async () => {
    await clearPlayer();
    setPlayer(null);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {player && (
        <View style={{ width: '80%', marginTop: 50 }}>
          <Button title="Single Player" onPress={handleSinglePlayer} />
          <View style={{ height: 10 }} />
          <Button title="Multiplayer" onPress={handleMultiplayer} />
          <View style={{ height: 10 }} />
          <Button title="Disconnect" color="red" onPress={handleDisconnect} />
        </View>
      )}

      {/* Login/Register Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={{ fontSize: 18, marginBottom: 10 }}>
            {isRegister ? 'Register' : 'Login'}
          </Text>

          {isRegister && (
            <TextInput
              placeholder="Name"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
          )}

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />

          <Button title={isRegister ? 'Register' : 'Login'} onPress={handleLoginOrRegister} />

          <TouchableOpacity onPress={() => setIsRegister(!isRegister)} style={{ marginTop: 10 }}>
            <Text style={{ color: '#007AFF' }}>
              {isRegister ? 'Already have an account? Login' : 'No account? Register'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000aa',
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    width: '80%',
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'white',
  },
});
