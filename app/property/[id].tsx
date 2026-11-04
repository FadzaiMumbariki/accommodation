import React from 'react';
import { useLocalSearchParams, Redirect } from 'expo-router';

export default function PropertyDeepLinkScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <Redirect href={{ pathname: '/property-details', params: { id: id ?? '' } }} />;
}
