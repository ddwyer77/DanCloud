import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../screens/LoadingScreen';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main Screens
import FeedScreen from '../screens/FeedScreen';
import UploadScreen from '../screens/UploadScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import InboxScreen from '../screens/InboxScreen';

// Detail Screens
import TrackDetailScreen from '../screens/TrackDetailScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import FollowersListScreen from '../screens/FollowersListScreen';
import ChatScreen from '../screens/ChatScreen';

// Playlist Screens
import PlaylistsScreen from '../screens/PlaylistsScreen';
import CreatePlaylistScreen from '../screens/CreatePlaylistScreen';
import PlaylistDetailScreen from '../screens/PlaylistDetailScreen';
import AddToPlaylistScreen from '../screens/AddToPlaylistScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap;

        if (route.name === 'Feed') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Playlists') {
          iconName = focused ? 'list' : 'list-outline';
        } else if (route.name === 'Upload') {
          iconName = focused ? 'add-circle' : 'add-circle-outline';
        } else if (route.name === 'Inbox') {
          iconName = focused ? 'mail' : 'mail-outline';
        } else if (route.name === 'Notifications') {
          iconName = focused ? 'notifications' : 'notifications-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        } else {
          iconName = 'home-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Feed" component={FeedScreen} />
    <Tab.Screen name="Playlists" component={PlaylistsScreen} />
    <Tab.Screen name="Upload" component={UploadScreen} />
    <Tab.Screen name="Inbox" component={InboxScreen} />
    <Tab.Screen name="Notifications" component={NotificationsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const MainStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
    <Stack.Screen name="TrackDetail" component={TrackDetailScreen} />
    <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="FollowersList" component={FollowersListScreen} />
    <Stack.Screen 
      name="Chat" 
      component={ChatScreen} 
      options={{ headerShown: false }}
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
      options={{ 
        headerShown: false
      }}
    />
  </Stack.Navigator>
);

export const AppNavigator = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {session ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}; 