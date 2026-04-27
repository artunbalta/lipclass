import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

export function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <View className="bg-card border border-border rounded-xl p-4">
      <Ionicons name={icon} size={22} color={color} />
      <Text className="text-white font-bold text-2xl mt-2">
        {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
      </Text>
      <Text className="text-muted-foreground text-xs mt-0.5">{title}</Text>
    </View>
  );
}
