import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer, AUDIO_PLAYER_HEIGHT } from '../contexts/AudioPlayerContext';
import { trackService } from '../services/trackService';
import { Track } from '../types';

const EditTrackScreen = ({ route, navigation }: any) => {
  const { trackId } = route.params;
  const [track, setTrack] = useState<Track | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [newCoverImage, setNewCoverImage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const { user } = useAuth();
  const { currentTrack } = useAudioPlayer();

  useEffect(() => {
    loadTrack();
  }, [trackId]);

  const loadTrack = async () => {
    setLoading(true);
    try {
      const trackData = await trackService.getTrack(trackId, user?.id);
      setTrack(trackData);
      setTitle(trackData.title);
      setDescription(trackData.description || '');
      setTags(Array.isArray(trackData.tags) ? trackData.tags.join(', ') : '');
      setCoverImage(trackData.cover_image_url || null);
    } catch (error) {
      console.error('Error loading track:', error);
      Alert.alert('Error', 'Failed to load track details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handlePickCoverImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setNewCoverImage(asset);
        setCoverImage(asset.uri);
      }
    } catch (error) {
      console.error('Error picking cover image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleRemoveCoverImage = () => {
    Alert.alert(
      'Remove Cover Image',
      'Are you sure you want to remove the cover image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setCoverImage(null);
            setNewCoverImage(null);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!user || !track) {
      Alert.alert('Error', 'Unable to save changes');
      return;
    }

    // Check if user owns this track
    if (track.user_id !== user.id) {
      Alert.alert('Error', 'You can only edit your own tracks');
      return;
    }

    setSaving(true);
    try {
      if (newCoverImage) {
        // Use the new function that handles cover image uploads
        const updatedTrack = await trackService.updateTrackWithCover(
          trackId,
          {
            title: title.trim(),
            description: description.trim() || null,
            tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
          },
          newCoverImage,
          user.id
        );
      } else {
        // Use the regular update function for text-only changes
        const updatedTrack = await trackService.updateTrack(trackId, {
          title: title.trim(),
          description: description.trim() || null,
          tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        });
      }

      Alert.alert(
        'Success',
        'Track updated successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update track');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading track details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!track) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleCancel}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Edit Track</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.content} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.scrollContent,
                currentTrack && { paddingBottom: AUDIO_PLAYER_HEIGHT }
              ]}
            >
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Enter track title"
                  maxLength={100}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe your track..."
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tags</Text>
                <TextInput
                  style={styles.input}
                  value={tags}
                  onChangeText={setTags}
                  placeholder="Enter tags separated by commas (e.g., hip-hop, electronic)"
                  maxLength={200}
                  returnKeyType="done"
                />
                <Text style={styles.helperText}>Separate tags with commas</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cover Image</Text>
                {coverImage ? (
                  <View style={styles.coverImageContainer}>
                    <Image source={{ uri: coverImage }} style={styles.coverImagePreview} />
                    <View style={styles.coverImageActions}>
                      <TouchableOpacity style={styles.imageActionButton} onPress={handlePickCoverImage}>
                        <Ionicons name="camera-outline" size={20} color="#007AFF" />
                        <Text style={styles.imageActionText}>Change Image</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.imageActionButton} onPress={handleRemoveCoverImage}>
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                        <Text style={[styles.imageActionText, { color: '#FF3B30' }]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addImageButton} onPress={handlePickCoverImage}>
                    <Ionicons name="camera-outline" size={32} color="#007AFF" />
                    <Text style={styles.addImageText}>Add Cover Image</Text>
                    <Text style={styles.addImageSubtext}>Tap to select an image</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Audio File</Text>
                <View style={styles.audioInfo}>
                  <Ionicons name="musical-notes" size={24} color="#007AFF" />
                  <Text style={styles.audioText}>
                    Audio file cannot be changed after upload
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  audioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e8f0',
  },
  audioText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  coverImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
  },
  coverImagePreview: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 16,
  },
  coverImageActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageActionButton: {
    padding: 8,
  },
  imageActionText: {
    fontSize: 16,
    color: '#007AFF',
  },
  addImageButton: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
  },
  addImageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  addImageSubtext: {
    fontSize: 12,
    color: '#666',
  },
});

export default EditTrackScreen; 