import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brand } from '../../constants/Colors';
import { useChat } from '../../context/ChatContext';
import { useResponsive } from '../../hooks/useResponsive';
import { WebHeader } from '../../components/navigation/WebHeader';

export default function TabLayout() {
  const { conversations } = useChat();
  const unreadCount = conversations?.reduce((sum, c) => sum + (c.unreadCount || 0), 0) || 0;
  const insets = useSafeAreaInsets();
  const { isMobile } = useResponsive();

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 0 : 8);
  const tabBarHeight = 56 + bottomInset;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.cream }}>
      {!isMobile && <WebHeader />}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Brand.terracotta,
          tabBarInactiveTintColor: Brand.gray400,
          tabBarStyle: isMobile
            ? {
                backgroundColor: Brand.white,
                borderTopColor: Brand.gray200,
                borderTopWidth: 1,
                height: tabBarHeight,
                paddingBottom: bottomInset,
                paddingTop: 6,
                elevation: 8,
                shadowColor: Brand.navy,
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
              }
            : {
                display: 'none',
              },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            lineHeight: 14,
            marginTop: 2,
          },
          tabBarIconStyle: {
            marginBottom: 0,
          },
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={22} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={22} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Brand.terracotta,
            color: Brand.white,
            fontSize: 10,
            fontWeight: '700',
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={22} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color as string} />
          ),
        }}
      />
      </Tabs>
    </View>
  );
}
