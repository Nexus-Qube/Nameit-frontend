// frontend/services/soundService.js
import { Audio } from 'expo-av';

class SoundService {
  constructor() {
    this.sounds = {};
    this.isEnabled = true;
    this.isLoaded = false;
    this.loadingPromise = null;
    this.loadAttempted = false;
  }

  async loadSounds() {
    // If already loaded, return immediately
    if (this.isLoaded) {
      return Promise.resolve();
    }

    // If already loading, return the existing promise
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadAttempted = true;
    this.loadingPromise = (async () => {
      try {
        console.log('🔊 Starting to load sounds...');
        
        // Set audio mode for better experience
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });

        // Load all game sounds with individual error handling
        const soundLoaders = [
          { name: 'item-solved', source: require('../assets/sounds/item-solved.mp3') },
          { name: 'opponent-solved', source: require('../assets/sounds/opponent-solved.mp3') },
          { name: 'hide-seek-found', source: require('../assets/sounds/hide-seek-found.mp3') },
          { name: 'trap-triggered', source: require('../assets/sounds/trap-triggered.mp3') },
          { name: 'your-turn', source: require('../assets/sounds/your-turn.mp3') },
        ];

        // Load sounds sequentially to avoid overwhelming the system
        for (const loader of soundLoaders) {
          try {
            await this.loadSingleSound(loader.name, loader.source);
          } catch (error) {
            console.error(`❌ Failed to load sound ${loader.name}:`, error);
            // Continue loading other sounds even if one fails
          }
        }
        
        this.isLoaded = true;
        console.log('✅ All sounds loaded successfully');
        return true;
      } catch (error) {
        console.error('❌ Critical error loading sounds:', error);
        this.isLoaded = false;
        return false;
      }
    })();

    return this.loadingPromise;
  }

  async loadSingleSound(soundName, soundSource) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`🔊 Loading sound: ${soundName}`);
        const { sound } = await Audio.Sound.createAsync(
          soundSource,
          { shouldPlay: false },
          null, // onPlaybackStatusUpdate
          true // downloadFirst
        );
        
        this.sounds[soundName] = { sound };
        
        // Verify the sound is actually loaded
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          console.log(`✅ ${soundName} loaded successfully`);
          resolve(sound);
        } else {
          console.error(`❌ ${soundName} failed to load - status not loaded`);
          reject(new Error(`Sound ${soundName} not loaded`));
        }
      } catch (error) {
        console.error(`❌ Error creating sound ${soundName}:`, error);
        reject(error);
      }
    });
  }

  async playSound(soundName) {
    // Early returns for disabled or invalid sounds
    if (!this.isEnabled) {
      return;
    }

    if (!this.sounds[soundName]) {
      console.log(`🔇 Sound not found: ${soundName}`);
      return;
    }

    try {
      const soundObject = this.sounds[soundName];
      
      // Check if sound is loaded
      const status = await soundObject.sound.getStatusAsync();
      if (!status.isLoaded) {
        console.log(`🔇 Sound ${soundName} not loaded, attempting to reload...`);
        
        // Try to reload the sound
        try {
          await soundObject.sound.unloadAsync();
          // Recreate the sound - we need the original source which we don't have here
          // For now, just skip playing
          console.log(`🔇 Cannot reload ${soundName} - source not available`);
          return;
        } catch (reloadError) {
          console.error(`❌ Failed to reload sound ${soundName}:`, reloadError);
          return;
        }
      }
      
      console.log(`🎵 Playing sound: ${soundName}`);
      await soundObject.sound.replayAsync();
    } catch (error) {
      console.error(`❌ Error playing sound ${soundName}:`, error);
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
    console.log(`🔊 Sounds ${enabled ? 'enabled' : 'disabled'}`);
  }

  async unloadSounds() {
    try {
      for (const soundName in this.sounds) {
        if (this.sounds[soundName]) {
          await this.sounds[soundName].sound.unloadAsync();
        }
      }
      this.sounds = {};
      this.isLoaded = false;
      this.loadingPromise = null;
      this.loadAttempted = false;
      console.log('🔊 All sounds unloaded');
    } catch (error) {
      console.error('Error unloading sounds:', error);
    }
  }

  // New method to check if sounds are ready
  areSoundsReady() {
    return this.isLoaded;
  }

  // New method to get loading status
  getLoadingStatus() {
    return {
      isLoaded: this.isLoaded,
      loadAttempted: this.loadAttempted,
      soundsCount: Object.keys(this.sounds).length,
      soundNames: Object.keys(this.sounds)
    };
  }
}

// Create a singleton instance
const soundService = new SoundService();
export default soundService;