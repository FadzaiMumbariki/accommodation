import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';
import { Property } from '../../types';
import {
  performListingTrustCheck,
  type TrustCheckResult,
} from '../../lib/trustCheck';

interface Props {
  property: Property;
  allProperties?: Property[];
  onReportPress?: () => void;
}

export function ListingTrustCheckCard({
  property,
  allProperties = [],
  onReportPress,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<TrustCheckResult | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    performListingTrustCheck(property, allProperties)
      .then((res) => {
        if (isMounted) {
          setResult(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[TrustCheck] Failed to run trust check:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [allProperties, property]);

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.iconBox}>
            <Ionicons name="shield-checkmark" size={20} color={Brand.navy} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.title}>AI Listing Trust Check</Text>
            <Text style={styles.subtitle}>Scanning market prices & scam signals...</Text>
          </View>
          <ActivityIndicator size="small" color={Brand.terracotta} />
        </View>
      </View>
    );
  }

  if (!result) return null;

  const isHighRisk = result.status === 'high_risk';
  const isModerateRisk = result.status === 'moderate_risk';

  const badgeColor = isHighRisk ? '#EF4444' : isModerateRisk ? '#F59E0B' : '#10B981';
  const badgeBg = isHighRisk ? '#FEE2E2' : isModerateRisk ? '#FEF3C7' : '#D1FAE5';
  const badgeText = isHighRisk
    ? 'High Risk Flags'
    : isModerateRisk
    ? 'Caution: Verify Details'
    : 'Standard Market Listing';

  return (
    <View style={[styles.card, isHighRisk && styles.cardHighRisk]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: badgeBg }]}>
          <Ionicons
            name={isHighRisk ? 'warning' : 'shield-checkmark'}
            size={22}
            color={badgeColor}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.badgeRow}>
            <Text style={styles.title}>AI Listing Trust Check</Text>
            <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.statusBadgeText, { color: badgeColor }]}>
                {badgeText}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>{result.headline}</Text>
        </View>
      </View>

      {/* Plain Language AI Explanation */}
      <View style={styles.explanationBox}>
        <Text style={styles.explanationText}>{result.explanation}</Text>
      </View>

      {/* Quick Checklist Matrix */}
      <View style={styles.checklist}>
        {/* Price Verification */}
        <View style={styles.checkItem}>
          <Ionicons
            name={
              result.priceAnalysis.isUnusuallyLow
                ? 'alert-circle'
                : 'checkmark-circle'
            }
            size={18}
            color={
              result.priceAnalysis.isUnusuallyLow ? '#EF4444' : '#10B981'
            }
          />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.checkTitle}>Price vs Local Area</Text>
            <Text style={styles.checkDesc}>{result.priceAnalysis.message}</Text>
          </View>
        </View>

        {/* Advance Deposit Warning */}
        <View style={styles.checkItem}>
          <Ionicons
            name={
              result.flags.some((f) => f.title.includes('Advance Payment'))
                ? 'close-circle'
                : 'checkmark-circle'
            }
            size={18}
            color={
              result.flags.some((f) => f.title.includes('Advance Payment'))
                ? '#EF4444'
                : '#10B981'
            }
          />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.checkTitle}>Viewing Fee / Deposit Policy</Text>
            <Text style={styles.checkDesc}>
              {result.flags.some((f) => f.title.includes('Advance Payment'))
                ? 'Red flag: Advance payment or viewing fee mentioned.'
                : 'No suspicious advance fee or deposit demanded before viewing.'}
            </Text>
          </View>
        </View>

        {/* Location Specificity */}
        <View style={styles.checkItem}>
          <Ionicons
            name={
              result.flags.some((f) => f.title.includes('Neighborhood'))
                ? 'alert-circle'
                : 'checkmark-circle'
            }
            size={18}
            color={
              result.flags.some((f) => f.title.includes('Neighborhood'))
                ? '#F59E0B'
                : '#10B981'
            }
          />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.checkTitle}>Address Clarity</Text>
            <Text style={styles.checkDesc}>
              {property.suburb ? `Located in ${property.suburb}, ${property.city}` : 'Specific suburb not specified.'}
            </Text>
          </View>
        </View>
      </View>

      {/* Detailed Flags Accordion */}
      {result.flags.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.expandButtonText}>
              {expanded
                ? 'Hide Verification Details'
                : `View All ${result.flags.length} Trust Signals`}
            </Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Brand.navy}
            />
          </TouchableOpacity>

          {expanded && (
            <View style={styles.flagsList}>
              {result.flags.map((flag, idx) => (
                <View key={idx} style={styles.flagItem}>
                  <Ionicons
                    name={
                      flag.severity === 'high'
                        ? 'close-circle'
                        : flag.severity === 'medium'
                        ? 'alert-circle'
                        : 'information-circle'
                    }
                    size={16}
                    color={
                      flag.severity === 'high'
                        ? '#EF4444'
                        : flag.severity === 'medium'
                        ? '#F59E0B'
                        : '#3B82F6'
                    }
                  />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.flagTitle}>
                      {flag.source === 'ai' ? 'AI signal: ' : ''}
                      {flag.title}
                    </Text>
                    <Text style={styles.flagDesc}>{flag.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Renter Advisory & Physical Inspection Reminder */}
      <View style={styles.reminderBox}>
        <Ionicons name="information-circle" size={16} color="#D97706" />
        <Text style={styles.reminderText}>
          {result.advice}
        </Text>
      </View>

      {/* Footer Disclaimer */}
      <View style={styles.disclaimerRow}>
        <Text style={styles.disclaimerText}>
          ImbaFind Trust Check highlights warning signs. The AI cannot verify physical property ownership. Always inspect the premises in person before paying.
        </Text>
        {onReportPress && (
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={onReportPress}
            activeOpacity={0.7}
          >
            <Ionicons name="flag-outline" size={13} color={Brand.error} />
            <Text style={styles.reportBtnText}>Report Listing</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.white,
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHighRisk: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.navy,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    color: Brand.gray600,
    marginTop: 2,
  },
  explanationBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: Brand.terracotta,
  },
  explanationText: {
    fontSize: 13,
    color: Brand.navy,
    lineHeight: 18,
  },
  checklist: {
    marginTop: 12,
    gap: 10,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Brand.navy,
  },
  checkDesc: {
    fontSize: 12,
    color: Brand.gray600,
    marginTop: 1,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 4,
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.navy,
  },
  flagsList: {
    gap: 8,
    paddingVertical: 6,
  },
  flagItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
  },
  flagTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.navy,
  },
  flagDesc: {
    fontSize: 11,
    color: Brand.gray600,
    marginTop: 1,
  },
  reminderBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  reminderText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 16,
  },
  disclaimerRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10,
    color: Brand.gray500,
    lineHeight: 14,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  reportBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Brand.error,
  },
});
