import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../../constants/Colors';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level error boundary that catches uncaught React render errors
 * and shows a friendly recovery screen instead of a blank crash.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // console.error is forwarded to Sentry via installErrorReporting() when enabled.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.container}>
            <View style={styles.iconWrap}>
              <Ionicons name="warning-outline" size={48} color={Brand.error} />
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </Text>
            <TouchableOpacity style={styles.btn} onPress={this.reset} activeOpacity={0.85}>
              <Ionicons name="refresh-outline" size={18} color={Brand.white} />
              <Text style={styles.btnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.cream },
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36,
  },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Brand.errorLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22, fontWeight: '800', color: Brand.navy,
    marginBottom: 10, textAlign: 'center',
  },
  message: {
    fontSize: 14, color: Brand.gray500, textAlign: 'center',
    lineHeight: 21, marginBottom: 32,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Brand.terracotta, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
    shadowColor: Brand.terracotta, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnText: { color: Brand.white, fontSize: 15, fontWeight: '700' },
});
