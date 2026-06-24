import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, Radius, REPORT_REASONS } from '@/theme';
import { SheetModal, Button } from '@/components/ui';
import { reportsApi } from '@/api';
import { useToast, extractApiError } from '@/hooks';
import { Flag } from 'lucide-react-native';

interface Props {
  postId: string;
  visible: boolean;
  onClose: () => void;
}

const REASON_LABELS: Record<string, string> = {
  inappropriate: '🚫 Inappropriate content',
  spam: '📢 Spam',
  violence: '⚠️ Violence',
  copyright: '©️ Copyright violation',
  other: '❓ Other',
};

export function ReportSheet({ postId, visible, onClose }: Props) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!reason) { toast.error('Please select a reason'); return; }
    setLoading(true);
    try {
      await reportsApi.submit({ post_id: postId, reason, description: description || undefined });
      toast.success('Report submitted. Our team will review it.');
      onClose();
    } catch (e) {
      toast.error(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SheetModal visible={visible} onClose={onClose} title="Report Content">
      <View style={styles.warning}>
        <Flag size={16} color={Colors.error} />
        <Text style={styles.warningText}>
          Reports are reviewed by our team. False reports may result in account suspension.
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {REPORT_REASONS.map((r) => (
          <Pressable
            key={r}
            onPress={() => setReason(r)}
            style={[styles.option, reason === r && styles.optionSelected]}
          >
            <Text style={[styles.optionText, reason === r && styles.optionTextSelected]}>
              {REASON_LABELS[r]}
            </Text>
          </Pressable>
        ))}

        <Text style={styles.label}>Additional details (optional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          maxLength={500}
          multiline
          numberOfLines={3}
          placeholder="Describe the issue..."
          placeholderTextColor={Colors.surface[500]}
          style={styles.textarea}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>
      </ScrollView>

      <View style={styles.actions}>
        <Button variant="ghost" onPress={onClose} style={{ flex: 1, marginRight: 8 }}>Cancel</Button>
        <Button
          variant="danger"
          onPress={submit}
          loading={loading}
          disabled={!reason}
          style={{ flex: 1 }}
        >
          Submit Report
        </Button>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  warning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: `${Colors.error}12`, borderWidth: 1,
    borderColor: `${Colors.error}25`, borderRadius: Radius.lg,
    padding: Spacing[3], marginBottom: Spacing[4],
  },
  warningText: { flex: 1, fontFamily: Typography.families.body, fontSize: 12, color: Colors.surface[700] },
  option: {
    padding: Spacing[4], borderRadius: Radius.lg,
    backgroundColor: Colors.surface[150], borderWidth: 1,
    borderColor: Colors.surface[200], marginBottom: Spacing[2],
  },
  optionSelected: {
    backgroundColor: `${Colors.brand[500]}12`,
    borderColor: `${Colors.brand[500]}40`,
  },
  optionText: { fontFamily: Typography.families.bodyMedium, fontSize: Typography.sizes.base, color: Colors.surface[700] },
  optionTextSelected: { color: Colors.brand[400] },
  label: {
    fontFamily: Typography.families.displayMedium, fontSize: Typography.sizes.xs,
    color: Colors.surface[600], textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: Spacing[4], marginBottom: Spacing[2],
  },
  textarea: {
    backgroundColor: Colors.surface[150], borderWidth: 1, borderColor: Colors.surface[300],
    borderRadius: Radius.lg, padding: Spacing[4],
    fontFamily: Typography.families.body, fontSize: Typography.sizes.base,
    color: Colors.surface[900], minHeight: 80, textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: Typography.families.body, fontSize: 11,
    color: Colors.surface[500], textAlign: 'right', marginTop: 4, marginBottom: Spacing[2],
  },
  actions: { flexDirection: 'row', marginTop: Spacing[4] },
});
