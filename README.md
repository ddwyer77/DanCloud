# 🎵 DanCloud - Music Streaming App

A React Native music streaming application built with Expo and Supabase, featuring audio upload, playback, and social features.

## ✨ Features

- 🎵 **Audio Upload & Playback** - Upload and stream MP3 files
- 👤 **User Authentication** - Secure login/register with Supabase Auth
- 📱 **Social Features** - Like, repost, and comment on tracks
- 🔍 **Search & Discovery** - Find tracks and users
- 📊 **User Profiles** - Customizable profiles with follower system
- 🔔 **Real-time Notifications** - Stay updated on interactions
- 📱 **Cross-platform** - Works on iOS and Android

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator or Android Emulator (or Expo Go app)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ddwyer77/DanCloud.git
   cd DanCloud
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

## 🔧 Configuration

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL migrations in the `supabase/migrations/` directory
3. Set up storage buckets for `audio` and `images`
4. Configure Row Level Security (RLS) policies
5. Add your Supabase URL and anon key to `.env`

### Environment Variables

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🐛 Recent Bug Fix: Audio Upload Issue

### Problem
Audio files were being uploaded to Supabase storage but resulted in 0-byte empty files, causing playback to fail with "Sound creation timeout" errors.

### Root Cause
React Native's `fetch()` API couldn't properly read local file URIs, and attempting to create `Blob` objects from `ArrayBuffer` data is not supported in React Native.

### Solution
- **Fixed file upload logic** in `src/services/trackService.ts`
- **Enhanced file validation** in `src/screens/UploadScreen.tsx`
- **Improved error handling** throughout the audio pipeline
- **Added comprehensive debugging** for troubleshooting

### Key Changes
```javascript
// Before (broken)
const audioBlob = await response.blob(); // Empty blob

// After (working)
const audioBlob = {
  uri: trackData.audioFile.uri,
  type: trackData.audioFile.type,
  name: trackData.audioFile.name,
}; // Supabase handles file URIs directly
```

## 📁 Project Structure

```
DanCloud/
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/           # React contexts (Auth, AudioPlayer)
│   ├── navigation/         # Navigation configuration
│   ├── screens/           # App screens
│   ├── services/          # API services (Supabase)
│   └── types/             # TypeScript type definitions
├── supabase/              # Database migrations and config
├── assets/                # Images and static assets
└── App.tsx               # Main app component
```

## 🛠 Tech Stack

- **Frontend**: React Native + Expo
- **Backend**: Supabase (PostgreSQL + Storage + Auth)
- **Audio**: expo-av (deprecated, migrating to expo-audio)
- **Navigation**: React Navigation
- **State Management**: React Context
- **Language**: TypeScript

## 📱 Screenshots

*Coming soon...*

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- Backend powered by [Supabase](https://supabase.com/)
- Audio handling with [expo-av](https://docs.expo.dev/versions/latest/sdk/av/)

## 📞 Support

If you encounter any issues or have questions, please [open an issue](https://github.com/ddwyer77/DanCloud/issues) on GitHub.

---

**Status**: ✅ Audio upload and playback issues resolved! App is fully functional. 