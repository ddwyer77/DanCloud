import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer, AUDIO_PLAYER_HEIGHT } from '../contexts/AudioPlayerContext';
import { trackService } from '../services/trackService';
import { Track } from '../types';
import TrackCard from '../components/TrackCard';

const ProfileScreen = ({ navigation }: any) => {
  const { user, signOut } = useAuth();
  const { currentTrack } = useAudioPlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserTracks();
    }
  }, [user]);

  const loadUserTracks = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const userTracks = await trackService.getUserTracks(user.id);
      setTracks(userTracks);
    } catch (error) {
      console.error('Error loading user tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleDeleteTrack = (trackId: string) => {
    Alert.alert(
      'Delete Track',
      'Are you sure you want to delete this track? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await trackService.deleteTrack(trackId, user!.id);
              setTracks(prev => prev.filter(track => track.id !== trackId));
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleLike = async (track: Track) => {
    if (!user) return;

    try {
      const isLiked = await trackService.toggleLike(track.id, user.id);
      
      setTracks(prev =>
        prev.map(t =>
          t.id === track.id
            ? {
                ...t,
                is_liked: isLiked,
                like_count: isLiked ? t.like_count + 1 : t.like_count - 1,
              }
            : t
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleRepost = async (track: Track) => {
    if (!user) return;

    try {
      const isReposted = await trackService.toggleRepost(track.id, user.id);
      
      setTracks(prev =>
        prev.map(t =>
          t.id === track.id
            ? {
                ...t,
                is_reposted: isReposted,
                repost_count: isReposted ? t.repost_count + 1 : t.repost_count - 1,
              }
            : t
        )
      );
    } catch (error) {
      console.error('Error toggling repost:', error);
    }
  };

  const handleTrackPress = (track: Track) => {
    // Pass the user's tracks as playlist for shuffle functionality
    navigation.navigate('TrackDetail', { 
      trackId: track.id, 
      playlist: tracks 
    });
  };

  const renderTrack = ({ item }: { item: Track }) => (
    <View style={styles.trackContainer}>
      <TrackCard
        track={item}
        playlist={tracks}
        onPress={() => handleTrackPress(item)}
        onUserPress={() => {}}
        onLike={() => handleLike(item)}
        onRepost={() => handleRepost(item)}
        onComment={() => navigation.navigate('TrackDetail', { trackId: item.id, openComments: true })}
      />
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteTrack(item.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.profileInfo}>
        <Image
          key={user?.profile_image_url}
          source={{
            uri: user?.profile_image_url || 'https://via.placeholder.com/120',
          }}
          style={styles.profileImage}
          onError={(error) => {
            console.log('Profile image load error:', error);
            console.log('Attempted URL:', user?.profile_image_url);
          }}
          onLoad={() => {
            console.log('Profile image loaded successfully');
            console.log('Current profile image URL:', user?.profile_image_url);
          }}
        />
        <Text style={styles.username}>{user?.username}</Text>
        {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
        
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{tracks.length}</Text>
            <Text style={styles.statLabel}>Tracks</Text>
          </View>
          <TouchableOpacity
            style={styles.stat}
            onPress={() => navigation.navigate('FollowersList', { userId: user!.id, type: 'followers' })}
          >
            <Text style={styles.statNumber}>{user?.follower_count || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stat}
            onPress={() => navigation.navigate('FollowersList', { userId: user!.id, type: 'following' })}
          >
            <Text style={styles.statNumber}>{user?.following_count || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Tracks</Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="musical-notes-outline" size={48} color="#ccc" />
      <Text style={styles.emptyText}>No tracks yet</Text>
      <Text style={styles.emptySubtext}>Upload your first track to get started!</Text>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={() => navigation.navigate('Upload')}
      >
        <Text style={styles.uploadButtonText}>Upload Track</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        renderItem={renderTrack}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmpty : null}
        refreshing={loading}
        onRefresh={loadUserTracks}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          currentTrack && { paddingBottom: AUDIO_PLAYER_HEIGHT }
        ]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    flexGrow: 1,
  },
  profileHeader: {
    backgroundColor: '#fff',
    paddingBottom: 16,
    marginBottom: 8,
  },
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
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
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  stats: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  stat: {
    alignItems: 'center',
    marginHorizontal: 24,
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
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    padding: 12,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  trackContainer: {
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
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
    marginBottom: 24,
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen; 