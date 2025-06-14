import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer, AUDIO_PLAYER_HEIGHT } from '../contexts/AudioPlayerContext';
import { trackService } from '../services/trackService';
import { TrackUploadData, UploadProgress } from '../types';
import SnippetSelector from '../components/SnippetSelector';

const UploadScreen = ({ navigation }: any) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [audioFile, setAudioFile] = useState<any>(null);
  const [coverArt, setCoverArt] = useState<any>(null);
  const [snippetStartTime, setSnippetStartTime] = useState(0);
  const [snippetEndTime, setSnippetEndTime] = useState(30);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isSnippetSelectorExpanded, setIsSnippetSelectorExpanded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    progress: 0,
    isUploading: false,
  });
  
  const { user } = useAuth();
  const { currentTrack } = useAudioPlayer();

  const pickAudioFile = async () => {
    try {
      console.log('=== FILE PICKER DEBUG ===');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      console.log('DocumentPicker result:', result);

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        console.log('Selected file details:');
        console.log('  URI:', file.uri);
        console.log('  Name:', file.name);
        console.log('  Size:', file.size);
        console.log('  Type:', file.mimeType);
        
        // Check file size (50MB limit)
        if (file.size && file.size > 50 * 1024 * 1024) {
          Alert.alert('Error', 'File size must be less than 50MB');
          return;
        }

        // Validate file size
        if (!file.size || file.size === 0) {
          Alert.alert('Error', 'Selected file appears to be empty. Please try selecting a different file.');
          return;
        }

        // Test file reading capability
        console.log('Testing file reading capability...');
        const testResult = await trackService.testFileReading(file.uri);
        console.log('File reading test result:', testResult);
        
        if (!testResult.success) {
          Alert.alert(
            'File Reading Error', 
            `Cannot read the selected file: ${testResult.error || 'Unknown error'}. Please try selecting a different file.`
          );
          return;
        }
        
        if (testResult.size === 0) {
          Alert.alert('Error', 'The selected file appears to be empty. Please try selecting a different file.');
          return;
        }
        
        console.log('File reading test passed, file size:', testResult.size);

        // Get audio duration
        try {
          console.log('Getting audio duration...');
          const { sound } = await Audio.Sound.createAsync(
            { uri: file.uri },
            { shouldPlay: false }
          );
          
          const status = await sound.getStatusAsync();
          if (status.isLoaded && status.durationMillis) {
            const durationSeconds = Math.floor(status.durationMillis / 1000);
            setAudioDuration(durationSeconds);
            setSnippetEndTime(Math.min(30, durationSeconds));
            console.log('Audio duration:', durationSeconds, 'seconds');
          }
          
          // Unload the sound
          await sound.unloadAsync();
        } catch (durationError) {
          console.error('Error getting audio duration:', durationError);
          // Set default duration if we can't detect it
          setAudioDuration(180); // 3 minutes default
          setSnippetEndTime(30);
        }

        setAudioFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'audio/mpeg',
          size: file.size,
        });
        
        // Reset snippet selector to collapsed state for new file
        setIsSnippetSelectorExpanded(false);
        
        console.log('Audio file set successfully');
      } else {
        console.log('File selection was canceled');
      }
      
      console.log('=== END FILE PICKER DEBUG ===');
    } catch (error) {
      console.error('DocumentPicker error:', error);
      Alert.alert('Error', 'Failed to pick audio file');
    }
  };

  const pickCoverArt = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCoverArt({
          uri: result.assets[0].uri,
          name: 'cover_art.jpg',
          type: 'image/jpeg',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick cover art');
    }
  };

  const handleUpload = async () => {
    if (!audioFile) {
      Alert.alert('Error', 'Please select an audio file');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to upload');
      return;
    }

    const uploadData: TrackUploadData = {
      title: title.trim(),
      description: description.trim() || undefined,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
      audioFile,
      coverArtFile: coverArt,
      snippetStartTime,
      snippetEndTime,
    };

    try {
      await trackService.uploadTrack(uploadData, user.id, setUploadProgress);
      
      Alert.alert(
        'Success',
        'Track uploaded successfully!',
        [{ text: 'OK', onPress: () => navigation.navigate('Feed') }]
      );

      // Reset form
      setTitle('');
      setDescription('');
      setTags('');
      setAudioFile(null);
      setCoverArt(null);
      setSnippetStartTime(0);
      setSnippetEndTime(30);
      setAudioDuration(0);
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message);
    }
  };

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
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Upload Track</Text>
              <View style={{ width: 24 }} />
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
                <Text style={styles.sectionTitle}>Audio File *</Text>
                <TouchableOpacity style={styles.fileButton} onPress={pickAudioFile}>
                  <Ionicons name="musical-notes" size={24} color="#007AFF" />
                  <Text style={styles.fileButtonText}>
                    {audioFile ? audioFile.name : 'Select Audio File (MP3, WAV)'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cover Art</Text>
                <TouchableOpacity style={styles.imageButton} onPress={pickCoverArt}>
                  {coverArt ? (
                    <Image source={{ uri: coverArt.uri }} style={styles.coverPreview} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image" size={32} color="#ccc" />
                      <Text style={styles.imagePlaceholderText}>Add Cover Art</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

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

              {/* Snippet Selector - only show if audio file is selected */}
              {audioFile && audioDuration > 0 && (
                <View style={styles.section}>
                  <TouchableOpacity 
                    style={styles.collapsibleHeader}
                    onPress={() => setIsSnippetSelectorExpanded(!isSnippetSelectorExpanded)}
                  >
                    <Text style={styles.sectionTitle}>Snippet Selection</Text>
                    <View style={styles.collapsibleHeaderRight}>
                      <Text style={styles.snippetPreview}>
                        {Math.floor(snippetStartTime / 60)}:{(snippetStartTime % 60).toString().padStart(2, '0')} - {Math.floor(snippetEndTime / 60)}:{(snippetEndTime % 60).toString().padStart(2, '0')}
                      </Text>
                      <Ionicons 
                        name={isSnippetSelectorExpanded ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#666" 
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {isSnippetSelectorExpanded && (
                    <SnippetSelector
                      audioUri={audioFile.uri}
                      duration={audioDuration}
                      onSnippetSelect={(start, end) => {
                        setSnippetStartTime(start);
                        setSnippetEndTime(end);
                      }}
                      initialStartTime={snippetStartTime}
                      initialEndTime={snippetEndTime}
                    />
                  )}
                </View>
              )}

              {uploadProgress.isUploading && (
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    Uploading... {Math.round(uploadProgress.progress)}%
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${uploadProgress.progress}%` },
                      ]}
                    />
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  (!audioFile || !title.trim() || uploadProgress.isUploading) &&
                    styles.uploadButtonDisabled,
                ]}
                onPress={handleUpload}
                disabled={!audioFile || !title.trim() || uploadProgress.isUploading}
              >
                <Text style={styles.uploadButtonText}>
                  {uploadProgress.isUploading ? 'Uploading...' : 'Upload Track'}
                </Text>
              </TouchableOpacity>
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f8f9ff',
  },
  fileButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#007AFF',
    flex: 1,
  },
  imageButton: {
    alignItems: 'center',
  },
  coverPreview: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  progressContainer: {
    marginVertical: 16,
  },
  progressText: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  collapsibleHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  snippetPreview: {
    marginRight: 12,
    fontSize: 14,
    color: '#666',
  },
});

export default UploadScreen; 