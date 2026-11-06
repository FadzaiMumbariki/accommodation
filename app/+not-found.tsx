import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Brand } from '../constants/Colors';
import { Routes } from '../constants/routes';
import { EmptyState } from '../components/common/EmptyState';

export default function NotFoundScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Page Not Found', headerShown: false }} />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.replace(Routes.explore as never)}
        accessibilityRole="button"
        accessibilityLabel="Go back to home"
      >
        <Ionicons name="arrow-back" size={22} color={Brand.navy} />
      </TouchableOpacity>

      <View style={styles.content}>
        <EmptyState
          icon="compass-outline"
          title="Page Not Found"
          message="The link you followed may be broken, or the page may have been removed."
          actionTitle="Go to Explore"
          onAction={() => router.replace(Routes.explore as never)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.cream,
  },
  backButton: {
    padding: 16,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
