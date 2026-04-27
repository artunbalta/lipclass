import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tabs: { name: string; title: string; icon: IconName; iconFocused: IconName }[] = [
  { name: 'index', title: 'Ana Sayfa', icon: 'home-outline', iconFocused: 'home' },
  { name: 'browse', title: 'Keşfet', icon: 'search-outline', iconFocused: 'search' },
  { name: 'courses', title: 'Derslerim', icon: 'book-outline', iconFocused: 'book' },
  { name: 'saved', title: 'Kaydedilen', icon: 'bookmark-outline', iconFocused: 'bookmark' },
  { name: 'settings', title: 'Profil', icon: 'person-outline', iconFocused: 'person' },
];

export default function StudentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#2a2a2a',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#a1a1aa',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? tab.iconFocused : tab.icon} size={22} color={color} />
            ),
          }}
        />
      ))}
      {/* Hide watch screen from tab bar */}
      <Tabs.Screen name="watch/[id]" options={{ href: null }} />
    </Tabs>
  );
}
