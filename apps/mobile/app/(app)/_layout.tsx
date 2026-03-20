// Authenticated tab layout — bottom tab navigator with 5 tabs

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IoniconsName;
  activeIcon: IoniconsName;
}

const TABS: TabConfig[] = [
  { name: 'index',      title: 'Projects',    icon: 'home-outline',     activeIcon: 'home' },
  { name: 'workspaces', title: 'Workspaces',  icon: 'folder-outline',   activeIcon: 'folder' },
  { name: 'notes',      title: 'Notes',       icon: 'document-text-outline', activeIcon: 'document-text' },
  { name: 'health',     title: 'Health',      icon: 'pulse-outline',    activeIcon: 'pulse' },
  { name: 'settings',   title: 'Settings',    icon: 'settings-outline', activeIcon: 'settings' },
];

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
        tabBarActiveTintColor: '#818cf8',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.activeIcon : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
