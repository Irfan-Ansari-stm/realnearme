import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ScrollView, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, Radius, VIBES, VIBE_EMOJI, CATEGORY_COLOR } from '@/theme';
import { SheetModal, Button, Chip, Badge } from '@/components/ui';
import { postsApi } from '@/api';
import { useToast, extractApiError } from '@/hooks';
import { Camera, ImageIcon, X } from 'lucide-react-native';

interface Props {
  placeId: string;
  placeName: string;
  placeCategory: string;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePostSheet({ placeId, placeName, placeCategory, visible, onClose, onSuccess }: Props) {
  const [caption, setCaption] = useState('');
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'gif'>('image');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [storageRef, setStorageRef] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to add posts.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85, allowsEditing: true, aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      // In production: upload to Firebase Storage and get the ref
      setStorageRef(`users/local/posts/${Date.now()}.jpg`);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access to take photos.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85, allowsEditing: true, aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setStorageRef(`users/local/posts/${Date.now()}.jpg`);
    }
  };

  const toggleVibe = (v: string) => {
    setSelectedVibes(prev =>
      prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v].slice(0, 3)
    );
  };

  const submit = async () => {
    if (!storageRef) { toast.error('Please select or take a photo'); return; }
    setLoading(true);
    try {
      await postsApi.create({
        place_id: placeId,
        caption: caption || undefined,
        category: placeCategory,
        vibes: selectedVibes,
        storage_ref: storageRef,
        media_type: mediaType,
        safe_search_scores: {
          adult: 'VERY_UNLIKELY', violence: 'VERY_UNLIKELY',
          racy: 'VERY_UNLIKELY', spoof: 'UNLIKELY', medical: 'VERY_UNLIKELY',
        },
      });
      toast.success('Post created! It will appear after moderation.');
      setCaption(''); setSelectedVibes([]); setImageUri(null); setStorageRef('');
      onSuccess(); onClose();
    } catch (e) {
      toast.error(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SheetModal visible={visible} onClose={onClose} title={`Add Post — ${placeName}`}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

        {/* Image picker */}
        {imageUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
            <Pressable style={styles.removeImg} onPress={() => { setImageUri(null); setStorageRef(''); }}>
              <X size={16} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.pickerRow}>
            <Pressable style={[styles.pickerBtn, { flex: 1, marginRight: 8 }]} onPress={pickImage}>
              <ImageIcon size={20} color={Colors.brand[400]} />
              <Text style={styles.pickerText}>Gallery</Text>
            </Pressable>
            <Pressable style={[styles.pickerBtn, { flex: 1 }]} onPress={takePhoto}>
              <Camera size={20} color={Colors.brand[400]} />
              <Text style={styles.pickerText}>Camera</Text>
            </Pressable>
          </View>
        )}

        {/* Caption */}
        <Text style={styles.label}>Caption (optional)</Text>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          maxLength={500}
          multiline
          numberOfLines={3}
          placeholder="Tell people what makes this place special..."
          placeholderTextColor={Colors.surface[500]}
          style={styles.textarea}
        />
        <Text style={styles.charCount}>{caption.length}/500</Text>

        {/* Media type */}
        <Text style={styles.label}>Media Type</Text>
        <View style={styles.mediaTypeRow}>
          {(['image', 'video', 'gif'] as const).map((t) => (
            <Pressable
              key={t}
              style={[styles.mediaTypeBtn, mediaType === t && styles.mediaTypeBtnSelected]}
              onPress={() => setMediaType(t)}
            >
              <Text style={[styles.mediaTypeText, mediaType === t && styles.mediaTypeTextSelected]}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Vibes */}
        <Text style={styles.label}>Vibes (up to 3)</Text>
        <View style={styles.chipRow}>
          {VIBES.map((v) => (
            <Chip
              key={v}
              label={`${VIBE_EMOJI[v]} ${v.replace('_', ' ')}`}
              selected={selectedVibes.includes(v)}
              onPress={() => toggleVibe(v)}
            />
          ))}
        </View>

        {/* Info */}
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>⏳</Text>
          <Text style={styles.infoText}>Your post will appear after moderation review.</Text>
        </View>

        <Button onPress={submit} loading={loading} fullWidth>
          Submit Post
        </Button>
      </ScrollView>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  previewWrap: { position: 'relative', borderRadius: Radius.xl, overflow: 'hidden', marginBottom: Spacing[4] },
  preview: { width: '100%', height: 180 },
  removeImg: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  pickerRow: { flexDirection: 'row', marginBottom: Spacing[4] },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: Spacing[4], backgroundColor: Colors.surface[150],
    borderWidth: 1, borderColor: Colors.surface[300], borderRadius: Radius.lg,
  },
  pickerText: { fontFamily: Typography.families.bodyMedium, fontSize: Typography.sizes.sm, color: Colors.brand[400] },
  label: {
    fontFamily: Typography.families.displayMedium, fontSize: Typography.sizes.xs,
    color: Colors.surface[600], textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: Spacing[2], marginTop: Spacing[4],
  },
  textarea: {
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[300],
    borderRadius: Radius.lg, padding: Spacing[4],
    fontFamily: Typography.families.body, fontSize: Typography.sizes.base,
    color: Colors.surface[900], minHeight: 80, textAlignVertical: 'top',
  },
  charCount: { fontFamily: Typography.families.body, fontSize: 11, color: Colors.surface[500], textAlign: 'right', marginTop: 4 },
  mediaTypeRow: { flexDirection: 'row', gap: 8 },
  mediaTypeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: Radius.lg,
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[300],
    alignItems: 'center',
  },
  mediaTypeBtnSelected: { backgroundColor: Colors.brand[500], borderColor: Colors.brand[500] },
  mediaTypeText: { fontFamily: Typography.families.bodyMedium, fontSize: Typography.sizes.sm, color: Colors.surface[600] },
  mediaTypeTextSelected: { color: '#fff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${Colors.brand[500]}10`, borderWidth: 1,
    borderColor: `${Colors.brand[500]}25`, borderRadius: Radius.lg,
    padding: Spacing[3], marginBottom: Spacing[4], marginTop: Spacing[2],
  },
  infoIcon: { fontSize: 16 },
  infoText: { flex: 1, fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[600] },
});
