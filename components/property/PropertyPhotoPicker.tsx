import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';

interface PropertyPhotoPickerProps {
  pickedImages: string[];
  uploadStates: Record<string, 'uploading' | 'uploaded' | 'failed'>;
  pickingImage: boolean;
  onPickImage: () => void;
  onRemoveImage: (uri: string) => void;
  onRetryUpload: (uri: string) => void;
  maxPhotos?: number;
}

export function PropertyPhotoPicker({
  pickedImages,
  uploadStates,
  pickingImage,
  onPickImage,
  onRemoveImage,
  onRetryUpload,
  maxPhotos = 8,
}: PropertyPhotoPickerProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Property Photos</Text>
      <Text style={styles.photoHint}>Add up to {maxPhotos} photos from your gallery</Text>
      <View style={styles.photoGrid}>
        {pickedImages.map((img, i) => (
          <View key={img + i} style={styles.photoTile}>
            <Image
              source={{ uri: img }}
              style={styles.photoTileImage}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
            />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => onRemoveImage(img)}
              accessibilityLabel={`Remove photo ${i + 1}`}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={12} color={Brand.white} />
            </TouchableOpacity>
            {uploadStates[img] === 'uploading' && (
              <View style={styles.photoStatus}>
                <ActivityIndicator size="small" color={Brand.white} />
                <Text style={styles.photoStatusText}>Uploading</Text>
              </View>
            )}
            {uploadStates[img] === 'uploaded' && (
              <View style={styles.photoStatus}>
                <Ionicons name="checkmark-circle" size={14} color={Brand.white} />
                <Text style={styles.photoStatusText}>Uploaded</Text>
              </View>
            )}
            {uploadStates[img] === 'failed' && (
              <View style={styles.photoStatus}>
                <Text style={styles.photoStatusText}>Failed</Text>
                <TouchableOpacity
                  onPress={() => onRetryUpload(img)}
                  accessibilityLabel={`Retry uploading photo ${i + 1}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.photoRetry}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        {pickedImages.length < maxPhotos && (
          <TouchableOpacity
            style={[styles.photoTile, styles.photoTileAdd]}
            onPress={onPickImage}
            disabled={pickingImage}
            accessibilityRole="button"
            accessibilityLabel="Choose property photos"
          >
            {pickingImage ? (
              <ActivityIndicator color={Brand.terracotta} />
            ) : (
              <>
                <Ionicons name="camera" size={28} color={Brand.gray400} />
                <Text style={styles.photoAddText}>Add Photo</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: Brand.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.navy,
    marginBottom: 14,
  },
  photoHint: {
    fontSize: 12,
    color: Brand.gray500,
    marginBottom: 12,
    marginTop: -8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoTile: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  photoTileImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoStatus: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 24,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 3,
  },
  photoStatusText: { color: Brand.white, fontSize: 9, fontWeight: '700' },
  photoRetry: { color: Brand.white, fontSize: 10, fontWeight: '800', textDecorationLine: 'underline' },
  photoTileAdd: {
    backgroundColor: Brand.gray100,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Brand.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoAddText: {
    fontSize: 9,
    fontWeight: '600',
    color: Brand.gray500,
    textAlign: 'center',
  },
});
