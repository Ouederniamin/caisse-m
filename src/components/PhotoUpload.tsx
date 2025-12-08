import React, { useState } from 'react';
import { StyleSheet, View, Image, Alert, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

interface PhotoUploadProps {
  onUploadComplete: (url: string) => void;
  onUploadError?: (error: Error) => void;
  tourId?: string;
  type: 'depart' | 'retour' | 'hygiene';
  label?: string;
  required?: boolean;
  currentPhotoUrl?: string;
  accentColor?: string;
  multiple?: boolean; // Allow multiple photos
  existingPhotos?: string[]; // Existing photos for multiple mode
  onPhotosChange?: (photos: string[]) => void; // Callback for multiple photos
}

export default function PhotoUpload({
  onUploadComplete,
  onUploadError,
  tourId,
  type,
  label = 'Photo de preuve',
  required = false,
  currentPhotoUrl,
  accentColor = '#4CAF50',
  multiple = false,
  existingPhotos = [],
  onPhotosChange,
}: PhotoUploadProps) {
  const [photoUri, setPhotoUri] = useState<string | null>(currentPhotoUrl || null);
  const [photos, setPhotos] = useState<string[]>(existingPhotos);
  const [isLoading, setIsLoading] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const requestPermission = async (type: 'camera' | 'library'): Promise<boolean> => {
    try {
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showAlert('Permission requise', 'Veuillez autoriser l\'accès à la caméra.');
          return false;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showAlert('Permission requise', 'Veuillez autoriser l\'accès à la galerie.');
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  const pickImage = async (source: 'camera' | 'library') => {
    const hasPermission = await requestPermission(source);
    if (!hasPermission) return;

    setIsLoading(true);
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: Platform.OS === 'web',
        allowsMultipleSelection: multiple && source === 'library', // Allow multiple only from library
      };

      let result: ImagePicker.ImagePickerResult;
      
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets.length > 0) {
        // Process all selected images
        for (const asset of result.assets) {
          let imageData: string;
          
          if (Platform.OS === 'web') {
            imageData = asset.uri;
          } else {
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            imageData = `data:image/jpeg;base64,${base64}`;
          }

          if (multiple) {
            // Multiple mode: add to photos array
            setPhotos(prev => {
              const newPhotos = [...prev, imageData];
              onPhotosChange?.(newPhotos);
              return newPhotos;
            });
            onUploadComplete(imageData);
          } else {
            // Single mode: replace current photo
            setPhotoUri(Platform.OS === 'web' ? imageData : asset.uri);
            onUploadComplete(imageData);
          }
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      showAlert('Erreur', 'Impossible de sélectionner l\'image.');
      onUploadError?.(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakePhoto = () => pickImage('camera');
  const handleSelectFromLibrary = () => pickImage('library');

  const handleRemovePhoto = (index?: number) => {
    const doRemove = () => {
      if (multiple && index !== undefined) {
        setPhotos(prev => {
          const newPhotos = prev.filter((_, i) => i !== index);
          onPhotosChange?.(newPhotos);
          return newPhotos;
        });
      } else {
        setPhotoUri(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Supprimer cette photo ?')) {
        doRemove();
      }
    } else {
      Alert.alert('Supprimer', 'Supprimer cette photo ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: doRemove },
      ]);
    }
  };

  // Multiple photos mode
  if (multiple) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>📸 {label} ({photos.length}) {required && <Text style={styles.required}>*</Text>}</Text>

        {/* Add photo buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, { backgroundColor: accentColor }]} onPress={handleTakePhoto}>
            <Text style={styles.buttonText}>📷 Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleSelectFromLibrary}>
            <Text style={[styles.buttonText, { color: accentColor }]}>🖼️ Galerie</Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={styles.loadingInline}>
            <ActivityIndicator size="small" color={accentColor} />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        )}

        {/* Photos grid */}
        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
            <View style={styles.photosRow}>
              {photos.map((uri, index) => (
                <View key={index} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.thumbImage} />
                  <TouchableOpacity 
                    style={styles.removeBtn} 
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {required && photos.length === 0 && (
          <Text style={styles.requiredHint}>⚠️ Au moins une photo requise</Text>
        )}
      </View>
    );
  }

  // Single photo mode
  return (
    <View style={styles.container}>
      <Text style={styles.label}>📸 {label} {required && <Text style={styles.required}>*</Text>}</Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : photoUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photoUri }} style={styles.preview} />
          <View style={styles.previewActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: accentColor }]} onPress={handleTakePhoto}>
              <Text style={styles.actionBtnText}>📷 Reprendre</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleRemovePhoto()}>
              <Text style={styles.actionBtnText}>🗑️ Supprimer</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.successBadge}>
            <Text style={styles.successText}>✅ Photo capturée</Text>
          </View>
        </View>
      ) : (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, { backgroundColor: accentColor }]} onPress={handleTakePhoto}>
            <Text style={styles.buttonText}>📷 Prendre une photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleSelectFromLibrary}>
            <Text style={[styles.buttonText, { color: accentColor }]}>🖼️ Galerie</Text>
          </TouchableOpacity>
        </View>
      )}

      {required && !photoUri && (
        <Text style={styles.requiredHint}>⚠️ Une photo est requise</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  required: {
    color: '#F44336',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  previewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  previewActions: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteBtn: {
    backgroundColor: '#F44336',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  successBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  successText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  requiredHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#F57C00',
  },
  // Multiple photos styles
  loadingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  photosScroll: {
    marginTop: 12,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoThumb: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
