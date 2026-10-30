import { Linking, Text, TouchableOpacity, View } from "react-native";
import type { ExternalLink } from "@/services/api";

interface Props {
  links: readonly ExternalLink[];
}

/** Row of pill buttons that open external pages. */
export default function LinkRow({ links }: Props) {
  if (links.length === 0) return null;
  return (
    <View className="flex-row flex-wrap gap-2">
      {links.map((link) => (
        <TouchableOpacity
          key={link.label}
          onPress={() => Linking.openURL(link.url).catch(() => {})}
          accessibilityRole="link"
          className="bg-dark-100 rounded-full px-4 py-2"
        >
          <Text className="text-light-200 text-sm">{link.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
