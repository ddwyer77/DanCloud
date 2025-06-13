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
import TrackCard from '../components/TrackCard';

const FeedScreen = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async (refresh = false) => {
    if (loading || (!hasMore && !refresh)) return;

    setLoading(true);
    try {
      const currentPage = refresh ? 0 : page;
      const newTracks = await trackService.getFeedTracks(currentPage);
      
      if (refresh) {
        setTracks(newTracks);
        setPage(1);
      } else {
        setTracks(prev => [...prev, ...newTracks]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(newTracks.length === 20);
    } catch (error) {
      console.error('Error loading tracks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTracks(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadTracks();
    }
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

  const renderTrack = ({ item }: { item: Track }) => (
    <TrackCard
      track={item}
      onPress={() => navigation.navigate('TrackDetail', { trackId: item.id })}
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
        keyExtractor={(item) => item.id}
        renderItem={renderTrack}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={!loading ? renderEmpty : null}
        showsVerticalScrollIndicator={false}
        style={styles.list}
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