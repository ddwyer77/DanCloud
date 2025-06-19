import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { tweetService } from '../services/tweetService';
import { useAuth } from '../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

const TWEET_MAX_LENGTH = 280;

const CreateTweetScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!content.trim() && !imageUri) {
      Alert.alert('Please enter text or select an image');
      return;
    }

    if (!user) {
      Alert.alert('You must be logged in to post');
      return;
    }

    try {
      setLoading(true);
      await tweetService.createTweet(content.trim(), user.id, imageUri ? {
        uri: imageUri,
        name: 'tweet-image.jpg',
        type: 'image/jpeg',
      } : undefined);
      navigation.goBack();
    } catch (error) {
      console.error('Error posting tweet', error);
      Alert.alert('Error', 'Failed to post tweet');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveImage = () => setImageUri(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.postButton,
            content.trim().length === 0 && !imageUri && { opacity: 0.5 },
          ]}
          onPress={handlePost}
          disabled={loading || (content.trim().length === 0 && !imageUri)}
        >
          <Text style={styles.postText}>Post</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        multiline
        placeholder="What's happening?"
        value={content}
        onChangeText={setContent}
        maxLength={TWEET_MAX_LENGTH}
      />

      {imageUri ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
          <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveImage}>
            <Ionicons name="close-circle" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.addImageButton} onPress={handlePickImage}>
          <Ionicons name="image-outline" size={24} color="#1DA1F2" />
          <Text style={styles.addImageText}>Add Image</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.charCount}>{content.length}/{TWEET_MAX_LENGTH}</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    color: '#1DA1F2',
    fontSize: 16,
  },
  postButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#1DA1F2',
    borderRadius: 20,
  },
  postText: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontSize: 18,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    color: '#888',
    paddingVertical: 8,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  addImageText: {
    marginLeft: 6,
    color: '#1DA1F2',
  },
  imagePreviewContainer: {
    marginTop: 12,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    padding: 2,
  },
});

export default CreateTweetScreen; 