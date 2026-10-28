import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage } from '../../types';
import { Brand } from '../../constants/Colors';

interface ChatBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  onRetry?: () => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isCurrentUser, onRetry }) => {
  const msgType = message.type ?? 'text';

  if (msgType === 'viewing_confirmation') {
    return (
      <View style={[styles.bubbleContainer, isCurrentUser ? styles.alignRight : styles.alignLeft]}>
        <View style={[styles.viewingCard, styles.viewingCardConfirmed]}>
          <View style={styles.viewingHeader}>
            <Ionicons name="checkmark-circle" size={20} color={Brand.success} />
            <Text style={styles.viewingTitle}>Viewing Confirmed</Text>
          </View>
          <Text style={styles.viewingMessage}>{message.text}</Text>
          {message.viewingDetails && (
            <View style={styles.viewingDetails}>
              <Text style={styles.viewingTimeText}>&#128197; {message.viewingDetails.date}</Text>
              <Text style={styles.viewingTimeText}>&#9200; {message.viewingDetails.time}</Text>
            </View>
          )}
          <Text style={[styles.timestamp, styles.timestampOther]}>{message.timestamp}</Text>
        </View>
      </View>
    );
  }

  if (msgType === 'viewing_request') {
    return (
      <View style={[styles.bubbleContainer, isCurrentUser ? styles.alignRight : styles.alignLeft]}>
        <View style={[styles.viewingCard, styles.viewingCardPending]}>
          <View style={styles.viewingHeader}>
            <Ionicons name="calendar" size={20} color={Brand.warning} />
            <Text style={styles.viewingTitle}>Viewing Request</Text>
          </View>
          <Text style={styles.viewingMessage}>{message.text}</Text>
          {message.viewingDetails && (
            <View style={styles.viewingDetails}>
              <Text style={styles.viewingTimeText}>&#128197; {message.viewingDetails.date}</Text>
              <Text style={styles.viewingTimeText}>&#9200; {message.viewingDetails.time}</Text>
            </View>
          )}
          <Text style={[styles.timestamp, styles.timestampOther]}>{message.timestamp}</Text>
        </View>
      </View>
    );
  }

  if (msgType === 'property_inquiry') {
    return (
      <View style={[styles.bubbleContainer, isCurrentUser ? styles.alignRight : styles.alignLeft]}>
        <View style={[styles.bubble, styles.bubbleInquiry]}>
          <View style={styles.inquiryHeader}>
            <Ionicons name="home-outline" size={16} color={Brand.terracotta} />
            <Text style={styles.inquiryLabel}>Property Inquiry</Text>
          </View>
          <Text style={[styles.text, isCurrentUser ? styles.textCurrent : styles.textOther]}>
            {message.text}
          </Text>
          <Text style={[styles.timestamp, isCurrentUser ? styles.timestampCurrent : styles.timestampOther]}>
            {message.timestamp}
          </Text>
        </View>
      </View>
    );
  }

  if (msgType === 'system') {
    return (
      <View style={styles.systemContainer}>
        <View style={styles.systemBubble}>
          <Ionicons name="information-circle-outline" size={14} color={Brand.gray500} />
          <Text style={styles.systemText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleContainer, isCurrentUser ? styles.alignRight : styles.alignLeft]}>
      <View
        style={[
          styles.bubble,
          isCurrentUser ? styles.bubbleCurrent : styles.bubbleOther,
        ]}
      >
        <Text
          style={[
            styles.text,
            isCurrentUser ? styles.textCurrent : styles.textOther,
          ]}
        >
          {message.text}
        </Text>
        <Text
          style={[
            styles.timestamp,
            isCurrentUser ? styles.timestampCurrent : styles.timestampOther,
          ]}
        >
          {message.timestamp}
        </Text>
        {message.deliveryStatus === 'sending' && (
          <Text style={[styles.deliveryStatus, isCurrentUser ? styles.deliveryStatusCurrent : styles.deliveryStatusOther]}>
            Sending…
          </Text>
        )}
        {message.deliveryStatus === 'failed' && onRetry && (
          <TouchableOpacity onPress={onRetry} accessibilityLabel="Retry sending message">
            <Text style={styles.deliveryFailed}>Failed to send · Tap to retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bubbleContainer: {
    marginVertical: 4,
    maxWidth: '82%',
  },
  alignRight: {
    alignSelf: 'flex-end',
  },
  alignLeft: {
    alignSelf: 'flex-start',
  },
  systemContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  systemBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  systemText: {
    fontSize: 12,
    color: Brand.gray500,
    fontWeight: '500',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleInquiry: {
    backgroundColor: Brand.white,
    borderWidth: 1.5,
    borderColor: Brand.terracotta + '60',
  },
  inquiryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  inquiryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.terracotta,
  },
  bubbleCurrent: {
    backgroundColor: Brand.terracotta,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Brand.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Brand.gray200,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  textCurrent: {
    color: Brand.white,
  },
  textOther: {
    color: Brand.navy,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timestampCurrent: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  timestampOther: {
    color: Brand.gray400,
  },
  deliveryStatus: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  deliveryStatusCurrent: { color: Brand.white },
  deliveryStatusOther: { color: Brand.gray500 },
  deliveryFailed: { fontSize: 10, color: Brand.error, marginTop: 4, alignSelf: 'flex-end', fontWeight: '700' },
  viewingCard: {
    backgroundColor: Brand.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  viewingCardPending: {
    borderColor: Brand.warning,
  },
  viewingCardConfirmed: {
    borderColor: Brand.success,
  },
  viewingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  viewingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Brand.navy,
  },
  viewingMessage: {
    fontSize: 13,
    color: Brand.navy,
    marginBottom: 8,
  },
  viewingDetails: {
    backgroundColor: Brand.creamDark,
    padding: 8,
    borderRadius: 8,
    gap: 4,
  },
  viewingTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Brand.navy,
  },
});
