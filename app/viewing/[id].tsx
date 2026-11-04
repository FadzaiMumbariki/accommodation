import React from 'react';
import { useLocalSearchParams, Redirect } from 'expo-router';

export default function ViewingDeepLinkScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <Redirect href={{ pathname: '/my-activity', params: { viewingId: id ?? '' } }} />;
}
