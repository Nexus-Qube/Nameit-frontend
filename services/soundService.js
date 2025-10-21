// frontend/services/soundService.js
import { Audio } from 'expo-av';

class SoundService {
  constructor() {
    this.sounds = {};
    this.isEnabled = true;
  }

  async loadSounds() {
    try {
      // Load all game sounds
      this.sounds['item-solved'] = await Audio.Sound.createAsync(
        require('../assets/sounds/item-solved.mp3')
      );
      this.sounds['opponent-solved'] = await Audio.Sound.createAsync(
        require('../assets/sounds/opponent-solved.mp3')
      );
      this.sounds['hide-seek-found'] = await Audio.Sound.createAsync(
        require('../assets/sounds/hide-seek-found.mp3')
      );
      this.sounds['trap-triggered'] = await Audio.Sound.createAsync(
        require('../assets/sounds/trap-triggered.mp3')
      );
      this.sounds['your-turn'] = await Audio.Sound.createAsync(
        require('../assets/sounds/your-turn.mp3')
      );

      console.log('🔊 All sounds loaded successfully');
    } catch (error) {
      console.error('Error loading sounds:', error);
    }
  }

  async playSound(soundName) {
    if (!this.isEnabled || !this.sounds[soundName]) {
      return;
    }

    try {
      const soundObject = this.sounds[soundName];
      await soundObject.sound.replayAsync();
    } catch (error) {
      console.error(`Error playing sound ${soundName}:`, error);
    }
  }

  async stopSound(soundName) {
    if (!this.sounds[soundName]) {
      return;
    }

    try {
      const soundObject = this.sounds[soundName];
      await soundObject.sound.stopAsync();
    } catch (error) {
      console.error(`Error stopping sound ${soundName}:`, error);
    }
  }

  async setVolume(soundName, volume) {
    if (!this.sounds[soundName]) {
      return;
    }

    try {
      const soundObject = this.sounds[soundName];
      await soundObject.sound.setVolumeAsync(volume);
    } catch (error) {
      console.error(`Error setting volume for ${soundName}:`, error);
    }
  }

  toggleSound(enabled) {
    this.isEnabled = enabled;
  }

  async unloadSounds() {
    try {
      for (const soundName in this.sounds) {
        if (this.sounds[soundName]) {
          await this.sounds[soundName].sound.unloadAsync();
        }
      }
      this.sounds = {};
      console.log('🔊 All sounds unloaded');
    } catch (error) {
      console.error('Error unloading sounds:', error);
    }
  }
}

// Create a singleton instance
const soundService = new SoundService();
export default soundService;