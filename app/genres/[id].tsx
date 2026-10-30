import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import ScreenHeader from "@/components/ScreenHeader";
import DiscoverList from "@/components/DiscoverList";

export default function GenreScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const genreId = Number(id);

  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        <ScreenHeader title={name ?? "Genre"} />
        <DiscoverList filters={{ genreId }} filterKey={`genre:${genreId}`} />
      </SafeAreaView>
    </View>
  );
}
