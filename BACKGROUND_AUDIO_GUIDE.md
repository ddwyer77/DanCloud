# Background Audio Playback Guide

## Overview

DanCloud now supports **background audio playback**, allowing music to continue playing even when:
- The app is minimized or backgrounded
- The phone screen is locked
- You switch to other apps
- You receive phone calls (with proper audio ducking)

## Features

### ✅ What's Implemented

1. **Background Playback**
   - Music continues when app is backgrounded
   - Playback persists when screen is locked
   - Audio session properly configured for background mode

2. **System Media Controls**
   - Integration with iOS Control Center
   - Android notification media controls
   - Lock screen media controls
   - Now Playing information display

3. **Audio Session Management**
   - Proper audio interruption handling
   - Audio ducking for phone calls
   - Silent mode playback (iOS)
   - Background task management

4. **Playlist Continuity**
   - Auto-play next track in background
   - Shuffle and repeat functionality
   - Playlist management across app states

## Technical Implementation

### Core Components

1. **AudioPlayerContext** (`src/contexts/AudioPlayerContext.tsx`)
   - Enhanced with background audio configuration
   - Media session metadata updates
   - Background task integration

2. **MediaSessionService** (`src/services/mediaSessionService.ts`)
   - Handles system media controls
   - Updates Now Playing information
   - Cross-platform media session management

3. **BackgroundAudioService** (`src/services/backgroundAudioService.ts`)
   - Manages background tasks
   - Ensures app stays alive for audio playback
   - Background fetch integration

### Configuration

#### App Configuration (`app.json`)
```json
{
  "ios": {
    "infoPlist": {
      "UIBackgroundModes": ["audio", "background-fetch"]
    }
  },
  "android": {
    "permissions": [
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.WAKE_LOCK"
    ]
  }
}
```

#### Audio Session Setup
```typescript
await Audio.setAudioModeAsync({
  allowsRecordingIOS: false,
  staysActiveInBackground: true,
  playsInSilentModeIOS: true,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
});
```

## User Experience

### Visual Indicators

1. **Background Audio Status Component**
   - Shows when background audio is active
   - Displays background task status
   - Appears only during playback

2. **Enhanced Audio Player**
   - Persistent bottom player
   - System media control integration
   - Real-time playback status

### System Integration

1. **iOS**
   - Control Center integration
   - Lock screen controls
   - Now Playing info with artwork
   - Siri integration (future)

2. **Android**
   - Notification media controls
   - Lock screen playback controls
   - Android Auto integration (future)

## Usage Instructions

### For Users

1. **Start Background Playback**
   - Play any track in the app
   - Background mode activates automatically
   - Status indicator appears at top of screen

2. **Control Playback**
   - Use system media controls (Control Center/Notification)
   - Lock screen controls work normally
   - In-app controls remain functional

3. **Manage Interruptions**
   - Phone calls automatically pause music
   - Music resumes after call ends
   - Other audio apps will duck DanCloud audio

### For Developers

1. **Testing Background Audio**
   ```bash
   # Run the app
   npm start
   
   # Test scenarios:
   # 1. Play music, then minimize app
   # 2. Lock device while music plays
   # 3. Switch to other apps
   # 4. Make/receive phone calls
   ```

2. **Debug Background Tasks**
   - Check console logs for background task status
   - Monitor BackgroundAudioStatus component
   - Use device settings to verify background app refresh

## Troubleshooting

### Common Issues

1. **Music Stops When App Backgrounded**
   - Check background app refresh settings
   - Verify UIBackgroundModes in app.json
   - Ensure audio session is properly configured

2. **No System Media Controls**
   - Check media session service initialization
   - Verify Now Playing info updates
   - Test on physical device (not simulator)

3. **Background Tasks Not Running**
   - Check background fetch permissions
   - Verify task registration
   - Monitor background task status

### Platform-Specific Notes

#### iOS
- Background audio requires physical device testing
- Simulator may not accurately reflect background behavior
- Control Center integration requires proper Now Playing setup

#### Android
- Foreground service permissions required
- Notification channel setup needed for media controls
- Battery optimization settings may affect background playback

## Future Enhancements

### Planned Features

1. **Enhanced Media Controls**
   - Seek bar in system controls
   - Repeat/shuffle buttons in notifications
   - Voice control integration

2. **Smart Playback**
   - Auto-pause for low battery
   - Sleep timer functionality
   - Crossfade between tracks

3. **Platform Integration**
   - CarPlay support (iOS)
   - Android Auto integration
   - Wear OS companion controls

### Performance Optimizations

1. **Battery Efficiency**
   - Optimized background task intervals
   - Smart audio session management
   - Reduced CPU usage during background playback

2. **Memory Management**
   - Efficient audio buffer handling
   - Automatic cleanup of unused resources
   - Smart preloading of next tracks

## Dependencies

### Required Packages
```json
{
  "expo-av": "^15.1.6",
  "expo-media-library": "^latest",
  "expo-background-fetch": "^latest",
  "expo-task-manager": "^latest"
}
```

### Permissions Required
- iOS: Background App Refresh, Media & Apple Music
- Android: Background Activity, Device Admin Apps

## Testing Checklist

- [ ] Music plays in background when app minimized
- [ ] Playback continues when screen locked
- [ ] System media controls work (play/pause/next/previous)
- [ ] Now Playing info displays correctly
- [ ] Audio ducks properly during phone calls
- [ ] Playlist auto-advance works in background
- [ ] Background audio status indicator appears
- [ ] App doesn't crash when backgrounded during playback
- [ ] Battery usage is reasonable
- [ ] Works on both iOS and Android devices

## Support

For issues with background audio playback:
1. Check device background app refresh settings
2. Verify app permissions
3. Test on physical device (not simulator)
4. Check console logs for error messages
5. Report issues with device model and OS version 