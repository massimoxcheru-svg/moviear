import { useMemo } from "react";
import { ActivityIndicator, FlatList, Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { fetchCollection, getImageUrl, sortCollectionParts } from "@/services/api";
import { useFetch } from "@/hooks/useFetch";
import { formatYear } from "@/utils/format";
import ScreenHeader from "@/components/ScreenHeader";
import ErrorState from "@/components/ErrorState";
import MovieCard from "@/components/MovieCard";

export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: collection, loading, error, refetch } = useFetch(() => fetchCollection(id));
  const parts = useMemo(() => sortCollectionParts(collection?.parts ?? []), [collection]);
  const backdrop = getImageUrl(collection?.backdrop_path, "w780");
  const years = parts.map((p) => formatYear(p.release_date)).filter(Boolean);
  const span =
    years.length > 1 ? `${years[0]} to ${years[years.length - 1]}` : (years[0] ?? "");

  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        <ScreenHeader title={collection?.name ?? "Collection"} />
        <FlatList
          className="px-5"
          data={parts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <MovieCard movie={item} />}
          numColumns={3}
          columnWrapperStyle={{ justifyContent: "flex-start", gap: 12, marginBottom: 16 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
          ListHeaderComponent={
            error ? (
              <ErrorState message={error.message} onRetry={refetch} />
            ) : loading || !collection ? (
              <ActivityIndicator size="large" color="#AB8BFF" className="mt-10" />
            ) : (
              <View className="mb-6">
                {backdrop ? (
                  <Image source={{ uri: backdrop }} className="w-full h-44 rounded-2xl" resizeMode="cover" />
                ) : null}
                <Text className="text-light-300 text-sm mt-4">
                  {parts.length} {parts.length === 1 ? "film" : "films"}
                  {span ? `, ${span}` : ""}
                </Text>
                {collection.overview ? (
                  <Text className="text-light-300 leading-6 mt-3">{collection.overview}</Text>
                ) : null}
              </View>
            )
          }
        />
      </SafeAreaView>
    </View>
  );
}
