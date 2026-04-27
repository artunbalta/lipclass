import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tabs: { name: string; title: string; icon: IconName; iconFocused: IconName }[] = [
  { name: 'index', title: 'Panel', icon: 'grid-outline', iconFocused: 'grid' },
  { name: 'create', title: 'Oluştur', icon: 'add-circle-outline', iconFocused: 'add-circle' },
  { name: 'videos', title: 'Videolarım', icon: 'play-circle-outline', iconFocused: 'play-circle' },
  { name: 'documents', title: 'Kaynaklar', icon: 'folder-outline', iconFocused: 'folder' },
  { name: 'settings', title: 'Profil', icon: 'person-outline', iconFocused: 'person' },
];

export default function TeacherLayout() {
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
      {/* Hidden screens */}
      <Tabs.Screen name="videos/[id]" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
    </Tabs>
  );
}
