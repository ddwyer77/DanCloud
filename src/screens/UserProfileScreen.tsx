import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { trackService } from '../services/trackService';
import { chatService } from '../services/chatService';
import TrackCard from '../components/TrackCard';
import { User, Track } from '../types';

const UserProfileScreen = ({ route, navigation }: any) => {
  const { userId } = route.params;
  const [user, setUser] = useState<User | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadUserProfile();
    loadUserTracks();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      const userData = await userService.getUserProfile(userId);
      setUser(userData);
      
      if (currentUser) {
        const followStatus = await userService.isFollowing(currentUser.id, userId);
        setIsFollowing(followStatus);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
      navigation.goBack();
    }
  };

  const loadUserTracks = async () => {
    setLoading(true);
    try {
      const userTracks = await trackService.getUserTracks(userId);
      setTracks(userTracks);
    } catch (error) {
      console.error('Error loading user tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !user) return;

    try {
      const newFollowStatus = await userService.toggleFollow(currentUser.id, user.id);
      setIsFollowing(newFollowStatus);
      
      // Update follower count
      setUser(prev => prev ? {
        ...prev,
        follower_count: newFollowStatus 
          ? (prev.follower_count || 0) + 1 
          : Math.max((prev.follower_count || 0) - 1, 0),
      } : null);
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const handleMessage = async () => {
    if (!currentUser || !user) return;

    try {
      const conversation = await chatService.getOrCreateConversation(currentUser.id, user.id);
      navigation.navigate('Chat', { conversation });
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const handleTrackPress = (track: Track) => {
    navigation.navigate('TrackDetail', { trackId: track.id });
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const renderTrack = ({ item }: { item: Track }) => (
    <TrackCard
      track={item}
      onPress={() => handleTrackPress(item)}
    />
  );

  const renderHeader = () => {
    if (!user) return null;

    return (
      <View style={styles.header}>
        <Image
          source={{
            uri: (user.profile_image_url && user.profile_image_url.trim() !== '') 
              ? user.profile_image_url 
              : 'https://via.placeholder.com/120',
          }}
          style={styles.profileImage}
          onError={(error) => {
            console.log('Profile image load error:', error);
            console.log('Attempted URL:', user.profile_image_url);
          }}
          onLoad={() => {
            console.log('Profile image loaded successfully');
            console.log('Current profile image URL:', user.profile_image_url);
          }}
        />
        
        <Text style={styles.username}>{user.username}</Text>
        
        {user.bio && (
          <Text style={styles.bio}>{user.bio}</Text>
        )}
        
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatCount(tracks.length)}</Text>
            <Text style={styles.statLabel}>Tracks</Text>
          </View>
          
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => navigation.navigate('FollowersList', { userId: user.id, type: 'followers' })}
          >
            <Text style={styles.statNumber}>{formatCount(user.follower_count || 0)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => navigation.navigate('FollowersList', { userId: user.id, type: 'following' })}
          >
            <Text style={styles.statNumber}>{formatCount(user.following_count || 0)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {currentUser && currentUser.id !== user.id && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollow}
            >
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.messageButton}
              onPress={handleMessage}
            >
              <Ionicons name="mail-outline" size={20} color="#007AFF" />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tracks</Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="musical-notes-outline" size={48} color="#ccc" />
      <Text style={styles.emptyText}>No tracks yet</Text>
      <Text style={styles.emptySubtext}>
        {user?.username} hasn't uploaded any tracks
      </Text>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navigationHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.navigationTitle}>{user.username}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={renderTrack}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmpty : null}
        refreshing={loading}
        onRefresh={loadUserTracks}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tracks.length === 0 ? styles.emptyContentContainer : undefined}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  navigationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  followButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#007AFF',
  },
  sectionHeader: {
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  messageButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 8,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default UserProfileScreen; 