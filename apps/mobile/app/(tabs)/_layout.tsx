import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0A0A0F' },
        headerTintColor: '#FFFFFF',
        tabBarStyle: {
          backgroundColor: '#0F0F1A',
          borderTopColor: '#1F1F2E',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#6B7280',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'PLAYVERZUS.XYZ',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚡</Text>,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          headerTitle: 'Match Center',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚔️</Text>,
        }}
      />
      <Tabs.Screen
        name="tournaments"
        options={{
          title: 'Tourneys',
          headerTitle: 'Tournaments',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏆</Text>,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          headerTitle: 'Demo Points Wallet',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🪙</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'My Career',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
