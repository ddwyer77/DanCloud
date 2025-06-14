import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Track } from '../types';
import { trackService } from '../services/trackService';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer, AUDIO_PLAYER_HEIGHT } from '../contexts/AudioPlayerContext';
import TrackCard from '../components/TrackCard';

const FeedScreen = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { currentTrack } = useAudioPlayer();
  const navigation = useNavigation<any>();

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    setLoading(true);
    try {
      const feedTracks = await trackService.getFeedWithReposts(user?.id);
      setTracks(feedTracks);
    } catch (error) {
      console.error('Error loading tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTracks().finally(() => setRefreshing(false));
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
    // Pass the entire feed as playlist for shuffle functionality
    navigation.navigate('TrackDetail', { 
      trackId: track.id, 
      playlist: tracks 
    });
  };

  const renderTrack = ({ item }: { item: Track }) => (
    <TrackCard
      track={item}
      playlist={tracks}
      onPress={() => handleTrackPress(item)}
      onUserPress={() => navigation.navigate('UserProfile', { userId: item.user_id })}
      onLike={() => handleLike(item)}
      onRepost={() => handleRepost(item)}
      onComment={() => navigation.navigate('TrackDetail', { trackId: item.id, openComments: true })}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No tracks yet</Text>
      <Text style={styles.emptySubtext}>Be the first to upload a track!</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DanCloud</Text>
      </View>
      
      <FlatList
        data={tracks}
        keyExtractor={(item) => {
          const repostId = (item as any).repost_id;
          return repostId ? `repost-${repostId}` : `track-${item.id}`;
        }}
        renderItem={renderTrack}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReachedThreshold={0.1}
        ListEmptyComponent={!loading ? renderEmpty : null}
        showsVerticalScrollIndicator={false}
        style={styles.list}
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
  header: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
  },
});

export default FeedScreen; 