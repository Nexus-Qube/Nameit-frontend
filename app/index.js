import { useState, useEffect } from 'react';
import { View, TextInput, Text, Modal, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { login, register } from '../services/api';
import { savePlayer, getPlayer, clearPlayer } from '../services/session';
import styles from '../styles/HomeScreenStyles';

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
    // Go to the new singleplayer screen
    router.push('/singleplayerScreen');
  };

  const handleMultiplayer = () => {
    if (!player) return;
    router.push('/lobbiesScreen');
  };

  const handleDisconnect = async () => {
    await clearPlayer();
    setPlayer(null);
    setModalVisible(true);
    // Clear form fields
    setEmail('');
    setName('');
    setPassword('');
    setIsRegister(false);
  };

  return (
    <View style={styles.container}>
      {player && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.mainButton} onPress={handleSinglePlayer}>
            <Text style={styles.mainButtonText}>Single Player</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.mainButton} onPress={handleMultiplayer}>
            <Text style={styles.mainButtonText}>Multiplayer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
            <Text style={styles.disconnectButtonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Login/Register Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </Text>

            {isRegister && (
              <TextInput
                placeholder="Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholderTextColor="#888"
              />
            )}

            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor="#888"
            />
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              placeholderTextColor="#888"
            />

            <TouchableOpacity style={styles.authButton} onPress={handleLoginOrRegister}>
              <Text style={styles.authButtonText}>
                {isRegister ? 'Create Account' : 'Login'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.switchAuthButton} 
              onPress={() => setIsRegister(!isRegister)}
            >
              <Text style={styles.switchAuthButtonText}>
                {isRegister ? 'Already have an account? Login' : 'No account? Create one'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}