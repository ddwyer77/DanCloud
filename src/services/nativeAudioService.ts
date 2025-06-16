import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { Platform } from 'react-native';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  url: string;
  artwork?: string;
  duration?: number;
}

export interface PlaybackStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
}

class NativeAudioService {
  private sound: Audio.Sound | null = null;
  private currentTrack: Track | null = null;
  private playbackStatusUpdateCallback: ((status: PlaybackStatus) => void) | null = null;
  private onTrackFinishedCallback: (() => void) | null = null;
  private onNextTrackCallback: (() => void) | null = null;
  private onPreviousTrackCallback: (() => void) | null = null;

  constructor() {
    this.initializeAudio();
  }

  private async initializeAudio() {
    try {
      // Configure audio session for background playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
      });

      console.log('🎵 Audio session configured for background playback');
      console.log('⚠️  Note: Full iOS Now Playing requires a development build, not Expo Go');
    } catch (error) {
      console.error('❌ Failed to configure audio session:', error);
    }
  }

  async loadTrack(track: Track): Promise<void> {
    try {
      console.log('🎵 Loading track:', track.title);
      
      // Unload previous track
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      // Create new sound instance
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        {
          shouldPlay: false,
          isLooping: false,
          volume: 1.0,
          progressUpdateIntervalMillis: 1000,
        },
        this.onPlaybackStatusUpdate.bind(this)
      );

      this.sound = sound;
      this.currentTrack = track;

      console.log(`✅ Track loaded: ${track.title} by ${track.artist}`);
    } catch (error) {
      console.error('❌ Failed to load track:', error);
      throw error;
    }
  }

  async play(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.playAsync();
        console.log('▶️ Playback started');
      }
    } catch (error) {
      console.error('❌ Failed to play:', error);
      throw error;
    }
  }

  async pause(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.pauseAsync();
        console.log('⏸️ Playback paused');
      }
    } catch (error) {
      console.error('❌ Failed to pause:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
        this.currentTrack = null;
        console.log('⏹️ Playback stopped');
      }
    } catch (error) {
      console.error('❌ Failed to stop:', error);
      throw error;
    }
  }

  async seek(position: number): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.setPositionAsync(position);
        console.log(`⏭️ Seeked to position: ${position}ms`);
      }
    } catch (error) {
      console.error('❌ Failed to seek:', error);
      throw error;
    }
  }

  async setVolume(volume: number): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
      }
    } catch (error) {
      console.error('❌ Failed to set volume:', error);
      throw error;
    }
  }

  private onPlaybackStatusUpdate(status: any): void {
    if (status.isLoaded) {
      const playbackStatus: PlaybackStatus = {
        isLoaded: status.isLoaded,
        isPlaying: status.isPlaying || false,
        position: status.positionMillis || 0,
        duration: status.durationMillis || 0,
        volume: status.volume || 1.0,
      };

      // Call status update callback
      if (this.playbackStatusUpdateCallback) {
        this.playbackStatusUpdateCallback(playbackStatus);
      }

      // Check if track finished
      if (status.didJustFinish && this.onTrackFinishedCallback) {
        console.log('🎵 Track finished playing');
        this.onTrackFinishedCallback();
      }
    } else if (status.error) {
      console.error('❌ Playback error:', status.error);
    }
  }

  // Event listeners
  setPlaybackStatusUpdateCallback(callback: (status: PlaybackStatus) => void): void {
    this.playbackStatusUpdateCallback = callback;
  }

  setOnTrackFinishedCallback(callback: () => void): void {
    this.onTrackFinishedCallback = callback;
  }

  setOnNextTrackCallback(callback: () => void): void {
    this.onNextTrackCallback = callback;
  }

  setOnPreviousTrackCallback(callback: () => void): void {
    this.onPreviousTrackCallback = callback;
  }

  getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  async getPlaybackStatus(): Promise<PlaybackStatus | null> {
    try {
      if (this.sound) {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          return {
            isLoaded: status.isLoaded,
            isPlaying: status.isPlaying || false,
            position: status.positionMillis || 0,
            duration: status.durationMillis || 0,
            volume: status.volume || 1.0,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get playback status:', error);
      return null;
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }
      this.currentTrack = null;
      this.playbackStatusUpdateCallback = null;
      this.onTrackFinishedCallback = null;
      this.onNextTrackCallback = null;
      this.onPreviousTrackCallback = null;
      console.log('🧹 Native audio service cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup audio service:', error);
    }
  }
}

export const nativeAudioService = new NativeAudioService(); 