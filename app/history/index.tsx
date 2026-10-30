import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { icons } from "@/constants/icons";
import { getImageUrl } from "@/services/api";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { formatRating, formatRelativeTime, formatYear } from "@/utils/format";
import ScreenHeader from "@/components/ScreenHeader";
import EmptyState from "@/components/EmptyState";
import Poster from "@/components/Poster";

function HistoryRow({ entry, onRemove }: { entry: HistoryEntry; onRemove: () => void }) {
  const year = formatYear(entry.release_date);
  return (
    <View className="flex-row items-center bg-dark-100 rounded-xl p-3 mb-3">
      <Link href={{ pathname: "/movies/[id]", params: { id: String(entry.id) } }} asChild>
        <TouchableOpacity className="flex-row items-center flex-1" accessibilityRole="link">
          <Poster uri={getImageUrl(entry.poster_path, "w185")} className="w-12 h-16 rounded-md" />
          <View className="flex-1 ml-3">
            <Text className="text-white font-semibold" numberOfLines={1}>
              {entry.title}
            </Text>
            <Text className="text-light-300 text-xs mt-1">
              {[year, formatRating(entry.vote_average)].filter(Boolean).join("  ·  ")}
            </Text>
            <Text className="text-light-300 text-xs mt-1">
              Viewed {formatRelativeTime(entry.viewed_at)}
            </Text>
          </View>
        </TouchableOpacity>
      </Link>
      <TouchableOpacity
        onPress={onRemove}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${entry.title} from history`}
        className="ml-2 p-2"
      >
        <Text className="text-light-300 text-lg">x</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HistoryScreen() {
  const { entries, hydrated, remove, clear } = useWatchHistory();

  const confirmClear = () => {
    Alert.alert("Clear history", "Remove every movie from your recently viewed list?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clear },
    ]);
  };

  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        <ScreenHeader
          title="Recently viewed"
          right={
            entries.length > 0 ? (
              <TouchableOpacity onPress={confirmClear} accessibilityRole="button" hitSlop={8}>
                <Text className="text-accent font-semibold">Clear</Text>
              </TouchableOpacity>
            ) : null
          }
        />
        <FlatList
          className="px-5"
          data={entries}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <HistoryRow entry={item} onRemove={() => remove(item.id)} />
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            hydrated ? (
              <EmptyState
                icon={icons.play}
                title="Nothing viewed yet"
                message="Movies you open will show up here so you can find them again"
              />
            ) : null
          }
        />
      </SafeAreaView>
    </View>
  );
}
