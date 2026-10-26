import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';

const REPORT_REASONS = [
  'False or misleading information',
  'Scam or fraud',
  'Inappropriate content',
  'Safety concern',
  'Other',
];

interface ReportDialogProps {
  visible: boolean;
  title: string;
  targetLabel: string;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (reason: string, details: string) => Promise<boolean>;
}

export function ReportDialog({
  visible,
  title,
  targetLabel,
  submitting = false,
  onCancel,
  onSubmit,
}: ReportDialogProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const close = () => {
    setReason('');
    setDetails('');
    onCancel();
  };

  const submit = async () => {
    if (!reason || submitting) return;
    const saved = await onSubmit(reason, details.trim());
    if (saved) {
      setReason('');
      setDetails('');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="flag-outline" size={20} color={Brand.error} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{targetLabel}</Text>
            </View>
            <TouchableOpacity
              onPress={close}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Close report dialog"
            >
              <Ionicons name="close" size={24} color={Brand.gray500} />
            </TouchableOpacity>
          </View>

          <Text style={styles.prompt}>Why are you reporting this?</Text>
          <ScrollView style={styles.reasonList} keyboardShouldPersistTaps="handled">
            {REPORT_REASONS.map(option => {
              const selected = option === reason;
              return (
                <TouchableOpacity
                  key={option}
                  style={styles.reasonRow}
                  onPress={() => setReason(option)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? Brand.terracotta : Brand.gray400}
                  />
                  <Text style={styles.reasonText}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TextInput
            style={styles.details}
            placeholder="Add details (optional)"
            placeholderTextColor={Brand.gray400}
            value={details}
            onChangeText={setDetails}
            maxLength={1000}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Report details"
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={close}
              disabled={submitting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, (!reason || submitting) && styles.submitDisabled]}
              onPress={submit}
              disabled={!reason || submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color={Brand.white} />
                : <Text style={styles.submitText}>Submit report</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(12, 20, 36, 0.5)',
  },
  sheet: {
    maxHeight: '85%',
    backgroundColor: Brand.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.error + '15',
  },
  headerText: { flex: 1 },
  title: { color: Brand.navy, fontSize: 17, fontWeight: '700' },
  subtitle: { color: Brand.gray500, fontSize: 12, marginTop: 2 },
  prompt: { color: Brand.navy, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  reasonList: { maxHeight: 220 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  reasonText: { color: Brand.navy, fontSize: 14 },
  details: {
    minHeight: 82,
    maxHeight: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.gray200,
    padding: 12,
    marginTop: 12,
    color: Brand.navy,
    fontSize: 14,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: Brand.gray100,
  },
  cancelText: { color: Brand.navy, fontWeight: '600' },
  submitButton: {
    flex: 1.4,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: Brand.terracotta,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: Brand.white, fontWeight: '700' },
});
