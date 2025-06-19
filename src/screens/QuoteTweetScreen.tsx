import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import TweetCard from '../components/TweetCard';
import { tweetService } from '../services/tweetService';
import { useAuth } from '../contexts/AuthContext';
import { Tweet } from '../types';

interface RouteParams {
  tweet: Tweet;
}

const QuoteTweetScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { tweet } = route.params as RouteParams;
  const { user } = useAuth();

  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!content.trim() && !imageUri) {
      Alert.alert('Please write something or select an image');
      return;
    }
    if (!user) {
      Alert.alert('You must be logged in to post');
      return;
    }
    try {
      setLoading(true);
      await tweetService.quoteTweet(
        tweet.id,
        content.trim(),
        user.id,
        imageUri
          ? {
              uri: imageUri,
              name: 'quote-img.jpg',
              type: 'image/jpeg',
            }
          : undefined
      );
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert('Error posting quote tweet');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: '#1DA1F2', fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.postButton, content.trim().length === 0 && !imageUri && { opacity: 0.5 }]}
          onPress={handlePost}
          disabled={loading || (content.trim().length === 0 && !imageUri)}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Post</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Add a comment..."
        multiline
        value={content}
        onChangeText={setContent}
      />

      {imageUri ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
          <TouchableOpacity style={styles.removeImageButton} onPress={() => setImageUri(null)}>
            <Ionicons name="close-circle" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
          <Ionicons name="image-outline" size={24} color="#1DA1F2" />
          <Text style={{ marginLeft: 6, color: '#1DA1F2' }}>Add Image</Text>
        </TouchableOpacity>
      )}

      <Text style={{ marginTop: 12, fontWeight: '600' }}>Quoting</Text>
      <TweetCard tweet={tweet} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  postButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#1DA1F2',
    borderRadius: 20,
  },
  input: { fontSize: 18, minHeight: 100, textAlignVertical: 'top' },
  addImageButton: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  imagePreviewContainer: { marginTop: 12, position: 'relative' },
  imagePreview: { width: '100%', height: 200, borderRadius: 12 },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    padding: 2,
  },
});

export default QuoteTweetScreen; 