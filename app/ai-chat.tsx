import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Pressable,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { aiSearch } from '../lib/ai';
import { hasRealAiSession, aiUnavailableMessage } from '../lib/aiAvailability';
import { filterMockProperties } from '../lib/propertyFilters';
import { Brand } from '../constants/Colors';
import { formatDistance } from '../lib/coordinates';
import { getCurrentUserLocation, findNearestLocation } from '../lib/locationService';
import type { Property } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant';

interface TextMessage {
  id: string;
  role: MessageRole;
  kind: 'text';
  text: string;
  timestamp: Date;
}

interface ResultsMessage {
  id: string;
  role: 'assistant';
  kind: 'results';
  text: string;          // Intro sentence above the cards
  properties: Property[];
  query: string;
  source: 'ai' | 'basic';
  timestamp: Date;
}

interface ThinkingMessage {
  id: string;
  role: 'assistant';
  kind: 'thinking';
  timestamp: Date;
}

type ChatMessage = TextMessage | ResultsMessage | ThinkingMessage;

// ─── Quick-prompt chips ───────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Houses and apartments near my location',
  'Nearby houses or apartments in Harare',
  'Furnished apartment in Avondale',
  '3 bedroom house in Borrowdale',
  '2 bed flat in Bulawayo under $300',
  'Budget room in Gweru with wifi',
];

// ─── Helper ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function bedroomLabel(n: number): string {
  if (n === 0) return 'Studio';
  return `${n} Bed${n === 1 ? '' : 's'}`;
}

function formatPrice(price: number): string {
  return `$${price.toLocaleString()}/mo`;
}

// ─── Property Result Card ────────────────────────────────────────────────────

const ResultCard = React.memo(({ property, onPress }: { property: Property; onPress: () => void }) => (
  <Pressable style={styles.card} onPress={onPress} android_ripple={{ color: Brand.creamDark }}>
    <Image source={{ uri: property.images[0] }} style={styles.cardImage} resizeMode="cover" />
    <View style={styles.cardBody}>
      {/* Badges row */}
      <View style={styles.cardBadgeRow}>
        <View style={styles.badge}>
          <Ionicons name="bed-outline" size={11} color={Brand.terracotta} />
          <Text style={styles.badgeText}>{bedroomLabel(property.bedrooms)}</Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name="home-outline" size={11} color={Brand.navy} />
          <Text style={[styles.badgeText, { color: Brand.navy }]}>
            {property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}
          </Text>
        </View>
        {property.distanceKm != null && Number.isFinite(property.distanceKm) && (
          <View style={[styles.badge, styles.badgeNearby]}>
            <Ionicons name="navigate-outline" size={11} color={Brand.terracotta} />
            <Text style={[styles.badgeText, { color: Brand.terracotta }]}>
              {formatDistance(property.distanceKm)}
            </Text>
          </View>
        )}
        {property.verified && (
          <View style={[styles.badge, styles.badgeVerified]}>
            <Ionicons name="checkmark-circle" size={11} color={Brand.success} />
            <Text style={[styles.badgeText, { color: Brand.success }]}>Verified</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.cardTitle} numberOfLines={1}>{property.title}</Text>

      {/* Location */}
      <View style={styles.cardLocationRow}>
        <Ionicons name="location-outline" size={12} color={Brand.gray500} />
        <Text style={styles.cardLocation} numberOfLines={1}>
          {property.suburb}, {property.city}
        </Text>
      </View>

      {/* Room details */}
      <View style={styles.cardRoomRow}>
        <View style={styles.roomStat}>
          <Ionicons name="bed-outline" size={14} color={Brand.terracotta} />
          <Text style={styles.roomStatText}>
            {property.bedrooms === 0 ? 'Studio' : `${property.bedrooms} bedroom${property.bedrooms !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <View style={styles.roomDivider} />
        <View style={styles.roomStat}>
          <Ionicons name="water-outline" size={14} color={Brand.navy} />
          <Text style={styles.roomStatText}>
            {property.bathrooms} bathroom{property.bathrooms !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.roomDivider} />
        <View style={styles.roomStat}>
          <Ionicons name="people-outline" size={14} color={Brand.gray500} />
          <Text style={styles.roomStatText}>Max {property.maxOccupants}</Text>
        </View>
      </View>

      {/* Price row */}
      <View style={styles.cardPriceRow}>
        <Text style={styles.cardPrice}>{formatPrice(property.price)}</Text>
        {property.rating != null && (
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={11} color={Brand.warning} />
            <Text style={styles.ratingText}>{property.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </View>
  </Pressable>
));

ResultCard.displayName = 'ResultCard';

// ─── Message Renderers ───────────────────────────────────────────────────────

const AssistantBubble = ({ text }: { text: string }) => (
  <View style={styles.bubbleRow}>
    <View style={styles.avatarBot}>
      <Ionicons name="sparkles" size={14} color={Brand.white} />
    </View>
    <View style={[styles.bubble, styles.bubbleBot]}>
      <Text style={styles.bubbleTextBot}>{text}</Text>
    </View>
  </View>
);

const UserBubble = ({ text }: { text: string }) => (
  <View style={[styles.bubbleRow, styles.bubbleRowUser]}>
    <View style={[styles.bubble, styles.bubbleUser]}>
      <Text style={styles.bubbleTextUser}>{text}</Text>
    </View>
  </View>
);

const ThinkingBubble = () => (
  <View style={styles.bubbleRow}>
    <View style={styles.avatarBot}>
      <Ionicons name="sparkles" size={14} color={Brand.white} />
    </View>
    <View style={[styles.bubble, styles.bubbleBot, styles.thinkingBubble]}>
      <ActivityIndicator size="small" color={Brand.terracotta} />
      <Text style={styles.thinkingText}>Searching…</Text>
    </View>
  </View>
);

const ResultsBubble = ({ msg, onOpen }: { msg: ResultsMessage; onOpen: (id: string) => void }) => (
  <View style={styles.bubbleRow}>
    <View style={styles.avatarBot}>
      <Ionicons name="sparkles" size={14} color={Brand.white} />
    </View>
    <View style={styles.resultsWrapper}>
      <Text style={styles.bubbleTextBot}>{msg.text}</Text>
      {msg.source === 'basic' && (
        <Text style={styles.sourceNote}>Using local search · sign in for AI results</Text>
      )}
      {msg.properties.map(p => (
        <ResultCard key={p.id} property={p} onPress={() => onOpen(p.id)} />
      ))}
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AiChatScreen() {
  const { properties } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: 'assistant',
      kind: 'text',
      text: "Hi! 👋 I'm your ImbaFind assistant. Tell me what you're looking for — a city, number of bedrooms, budget, or anything else — and I'll find matching homes for you.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const allCities = useMemo(
    () => [...new Set(properties.map(p => p.city))].sort(),
    [properties],
  );

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  const push = useCallback((msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
    scrollToBottom();
  }, [scrollToBottom]);

  const sendQuery = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;

    Keyboard.dismiss();
    setInput('');

    // 1. Show user bubble
    push({ id: uid(), role: 'user', kind: 'text', text: trimmed, timestamp: new Date() });

    // 2. Show thinking indicator
    const thinkingId = uid();
    setMessages(prev => [
      ...prev,
      { id: thinkingId, role: 'assistant', kind: 'thinking', timestamp: new Date() },
    ]);
    scrollToBottom();
    setIsLoading(true);

    try {
      // 3. Run AI search (calls Gemini Edge Function if signed in, falls back to local parser)
      const hasAuth = await hasRealAiSession();
      const result = await aiSearch(trimmed, allCities);

      // 3b. If searching near current location and no reference coordinates returned, use device GPS
      if (
        /\b(?:near (?:my |current )?location|near me|closest to me)\b/i.test(trimmed) &&
        !result.filters.referenceCoordinates
      ) {
        const userLoc = await getCurrentUserLocation();
        if (userLoc.status === 'granted') {
          result.filters.referenceCoordinates = userLoc.coords;
          result.filters.nearby = true;
          const match = findNearestLocation(userLoc.coords);
          if (match && !result.filters.city) {
            result.filters.city = match.city;
          }
        }
      }

      // 4. Filter properties
      const matched = filterMockProperties(properties, result.filters);
      const top = matched.slice(0, 6);

      // 5. Replace thinking with results
      const signinHint = !hasAuth
        ? '\n\n💡 Sign in to your ImbaFind account for full Gemini AI search.'
        : '';
      const notice =
        result.source === 'basic' && result.unavailable && hasAuth
          ? `\n\n${aiUnavailableMessage(result.unavailable)}`
          : signinHint;

      const intro =
        (top.length > 0
          ? `Found ${top.length} propert${top.length === 1 ? 'y' : 'ies'} matching "${result.summary || trimmed}":${
              top.length > 3 ? '\n\nHere are the best matches 👇' : ''
            }`
          : `I couldn't find any properties matching "${result.summary || trimmed}". Try a different city, broader budget, or fewer requirements.`) +
        notice;

      setMessages(prev =>
        prev.map(m =>
          m.id === thinkingId
            ? ({
                id: thinkingId,
                role: 'assistant',
                kind: top.length > 0 ? 'results' : 'text',
                text: intro,
                properties: top,
                query: trimmed,
                source: result.source,
                timestamp: new Date(),
              } as ChatMessage)
            : m,
        ),
      );
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === thinkingId
            ? ({ id: thinkingId, role: 'assistant', kind: 'text', text: 'Something went wrong. Please try again.', timestamp: new Date() } as TextMessage)
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [allCities, isLoading, properties, push, scrollToBottom]);

  const handleSend = useCallback(() => sendQuery(input), [input, sendQuery]);

  const handleSuggestion = useCallback((s: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendQuery(s);
  }, [sendQuery]);

  const openProperty = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/property-details?id=${id}`);
  }, []);

  const showSuggestions = messages.length <= 1;

  const renderItem = useCallback(({ item }: { item: ChatMessage }) => {
    if (item.kind === 'text' && item.role === 'user') return <UserBubble text={item.text} />;
    if (item.kind === 'text') return <AssistantBubble text={item.text} />;
    if (item.kind === 'thinking') return <ThinkingBubble />;
    if (item.kind === 'results') return <ResultsBubble msg={item} onOpen={openProperty} />;
    return null;
  }, [openProperty]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color={Brand.navy} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={16} color={Brand.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Property Search</Text>
            <Text style={styles.headerSubtitle}>Ask anything · rooms, budget, location</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            showSuggestions ? (
              <View style={styles.suggestionsWrapper}>
                <Text style={styles.suggestionsLabel}>Try asking…</Text>
                {SUGGESTIONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={styles.suggestionChip}
                    onPress={() => handleSuggestion(s)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="search-outline" size={13} color={Brand.terracotta} style={{ marginRight: 6 }} />
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : undefined
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="e.g. 3 bed house in Bulawayo under $400…"
            placeholderTextColor={Brand.gray400}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={200}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Brand.white} />
            ) : (
              <Ionicons name="arrow-up" size={18} color={Brand.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.cream },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Brand.white,
    borderBottomWidth: 1,
    borderBottomColor: Brand.gray200,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Brand.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: Brand.navy },
  headerSubtitle: { fontSize: 11, color: Brand.gray500, marginTop: 1 },

  // List
  listContent: { padding: 16, paddingBottom: 8, gap: 12 },

  // Bubbles
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  avatarBot: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: Brand.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleBot: {
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.gray200,
    borderTopLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: Brand.terracotta,
    borderTopRightRadius: 4,
  },
  bubbleTextBot: { fontSize: 14, color: Brand.navy, lineHeight: 20 },
  bubbleTextUser: { fontSize: 14, color: Brand.white, lineHeight: 20 },
  thinkingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { fontSize: 13, color: Brand.gray500 },

  // Results
  resultsWrapper: { flex: 1, gap: 8 },
  sourceNote: {
    fontSize: 11,
    color: Brand.gray400,
    fontStyle: 'italic',
    marginTop: -2,
    marginBottom: 2,
  },

  // Property Card
  card: {
    backgroundColor: Brand.white,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Brand.gray200,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginTop: 4,
  },
  cardImage: { width: '100%', height: 140 },
  cardBody: { padding: 12, gap: 5 },
  cardBadgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Brand.creamDark,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeVerified: { backgroundColor: Brand.successLight },
  badgeNearby: { backgroundColor: Brand.terracotta + '15' },
  badgeText: { fontSize: 11, fontWeight: '600', color: Brand.terracotta },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Brand.navy, marginTop: 1 },
  cardLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardLocation: { fontSize: 12, color: Brand.gray500, flex: 1 },

  // Room details strip
  cardRoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.gray50,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
  },
  roomStat: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  roomStatText: { fontSize: 11, color: Brand.navy, fontWeight: '600' },
  roomDivider: { width: 1, height: 14, backgroundColor: Brand.gray200, marginHorizontal: 4 },

  cardPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  cardPrice: { fontSize: 15, fontWeight: '800', color: Brand.terracotta },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Brand.warningLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  ratingText: { fontSize: 11, fontWeight: '700', color: Brand.warning },

  // Suggestions
  suggestionsWrapper: { marginTop: 8, gap: 8 },
  suggestionsLabel: { fontSize: 12, color: Brand.gray400, fontWeight: '600', marginBottom: 2 },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: Brand.gray200,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  suggestionText: { fontSize: 13, color: Brand.navy, fontWeight: '500' },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: Brand.white,
    borderTopWidth: 1,
    borderTopColor: Brand.gray200,
  },
  input: {
    flex: 1,
    backgroundColor: Brand.cream,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: Brand.navy,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.terracotta,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: Brand.gray300,
    shadowOpacity: 0,
    elevation: 0,
  },
});
