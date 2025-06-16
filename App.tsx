import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import contexts
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AudioPlayerProvider } from './src/contexts/AudioPlayerContext';

// Import components
import BottomAudioPlayer from './src/components/BottomAudioPlayer';

// Import screens
import FeedScreen from './src/screens/FeedScreen';
// import FYPScreen from './src/screens/FYPScreen'; // TEMPORARILY DISABLED - See FYPScreen.tsx for details
import UploadScreen from './src/screens/UploadScreen';
import SearchScreen from './src/screens/SearchScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import TrackDetailScreen from './src/screens/TrackDetailScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import FollowersListScreen from './src/screens/FollowersListScreen';
import EditTrackScreen from './src/screens/EditTrackScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import ChatScreen from './src/screens/ChatScreen';

// Playlist screens
import PlaylistsScreen from './src/screens/PlaylistsScreen';
import CreatePlaylistScreen from './src/screens/CreatePlaylistScreen';
import PlaylistDetailScreen from './src/screens/PlaylistDetailScreen';
import AddToPlaylistScreen from './src/screens/AddToPlaylistScreen';
import InboxScreen from './src/screens/InboxScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Feed') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Playlists') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Upload') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Inbox') {
            iconName = focused ? 'mail' : 'mail-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Playlists" component={PlaylistsScreen} />
      <Tab.Screen name="Upload" component={UploadScreen} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthenticatedNavigator() {
  return (
    <Stack.Navigator initialRouteName="Main">
      <Stack.Screen 
        name="Main" 
        component={MainTabs} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="TrackDetail" 
        component={TrackDetailScreen}
        options={{ title: 'Track Details' }}
      />
      <Stack.Screen 
        name="UserProfile" 
        component={UserProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen 
        name="EditTrack" 
        component={EditTrackScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="FollowersList" 
        component={FollowersListScreen}
        options={{ title: 'Followers' }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{ title: 'Chat' }}
      />
      <Stack.Screen 
        name="CreatePlaylist" 
        component={CreatePlaylistScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PlaylistDetail" 
        component={PlaylistDetailScreen} 
        options={{ title: 'Playlist' }}
      />
      <Stack.Screen 
        name="AddToPlaylist" 
        component={AddToPlaylistScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function UnauthenticatedNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return user ? <AuthenticatedNavigator /> : <UnauthenticatedNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AudioPlayerProvider>
            <AppNavigator />
            <BottomAudioPlayer />
          </AudioPlayerProvider>
          <StatusBar style="auto" />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
