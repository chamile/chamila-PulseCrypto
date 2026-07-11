import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { colors, fonts, fontSize } from '@/theme';
import { TabBarIcon } from '@/components/TabBarIcon';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.up,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.primary,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodySemi,
          fontSize: fontSize.xs,
          letterSpacing: 0.4,
        },
        sceneStyle: { backgroundColor: colors.primary },
      }}
    >
      <Tabs.Screen
        name="markets"
        options={{
          title: 'Markets',
          tabBarIcon: ({ color }) => (
            <View><TabBarIcon name="markets" color={color} /></View>
          ),
        }}
      />
      <Tabs.Screen
        name="terminal"
        options={{
          title: 'Terminal',
          tabBarIcon: ({ color }) => (
            <View><TabBarIcon name="terminal" color={color} /></View>
          ),
        }}
      />
      <Tabs.Screen
        name="telemetry"
        options={{
          title: 'Telemetry',
          tabBarIcon: ({ color }) => (
            <View><TabBarIcon name="telemetry" color={color} /></View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <View><TabBarIcon name="settings" color={color} /></View>
          ),
        }}
      />
    </Tabs>
  );
}
