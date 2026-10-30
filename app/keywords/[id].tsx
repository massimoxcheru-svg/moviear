import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import ScreenHeader from "@/components/ScreenHeader";
import DiscoverList from "@/components/DiscoverList";

/** Every movie tagged with a keyword, reached from the details screen. */
export default function KeywordScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const keywordId = Number(id);

  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        <ScreenHeader title={name ? `Keyword: ${name}` : "Keyword"} />
        <DiscoverList filters={{ keywordId }} filterKey={`keyword:${keywordId}`} />
      </SafeAreaView>
    </View>
  );
}
