import { useCallback, useEffect, useState } from "react";
import { Alert, Image, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Constants from "expo-constants";
import { icons } from "@/constants/icons";
import { useSavedMovies } from "@/hooks/useSavedMovies";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { useSettings } from "@/hooks/useSettings";
import { useFetch } from "@/hooks/useFetch";
import { useBackup, type PendingImport } from "@/hooks/useBackup";
import { clearSavedMovies } from "@/services/savedMovies";
import { cacheEntryCount, clearCache } from "@/services/cache";
import { fetchGenres } from "@/services/api";
import { LANGUAGES, REGIONS, type TrendingWindow } from "@/services/settings";
import { decadeBreakdown, genreBreakdown, ratingSummary } from "@/utils/stats";
import { formatDate } from "@/utils/format";
import OptionPicker, { type Option } from "@/components/OptionPicker";
import SettingRow from "@/components/SettingRow";
import StatBar from "@/components/StatBar";

const WINDOW_OPTIONS: readonly Option<TrendingWindow>[] = [
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
];

const REGION_OPTIONS: readonly Option<string>[] = REGIONS.map((r) => ({
  value: r.code,
  label: r.name,
}));

const LANGUAGE_OPTIONS: readonly Option<string>[] = LANGUAGES.map((l) => ({
  value: l.code,
  label: l.name,
}));

function confirm(title: string, message: string, onConfirm: () => void, label = "Clear") {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: label, style: "destructive", onPress: onConfirm },
  ]);
}

export default function Profile() {
  const { movies: savedMovies, count: savedCount } = useSavedMovies();
  const history = useWatchHistory();
  const { settings, update, reset } = useSettings();
  const genres = useFetch(() => fetchGenres());
  const backup = useBackup();
  const [cachedEntries, setCachedEntries] = useState<number | null>(null);

  const refreshCacheCount = useCallback(() => {
    cacheEntryCount().then(setCachedEntries);
  }, []);

  useEffect(() => {
    refreshCacheCount();
  }, [refreshCacheCount]);

  useEffect(() => {
    if (backup.error) {
      Alert.alert("Backup", backup.error, [{ text: "OK", onPress: backup.clearError }]);
    }
  }, [backup.error, backup.clearError]);

  const onClearCache = () => {
    confirm("Clear cached data", "Lists and details will be downloaded again.", () => {
      clearCache().then(refreshCacheCount);
    });
  };

  const onImport = async () => {
    const pending: PendingImport | null = await backup.pickBackup();
    if (!pending) return;
    const { summary, doc } = pending;
    const when = summary.exportedAt ? formatDate(summary.exportedAt.slice(0, 10)) : null;
    Alert.alert(
      "Restore backup",
      `${summary.saved} saved, ${summary.history} viewed${when ? `, exported ${when}` : ""}. Merge with what is on this device, or replace it?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Merge",
          onPress: () => {
            const result = backup.restore(doc, { mode: "merge", includeSettings: true });
            Alert.alert("Restored", `${result.saved} saved and ${result.history} viewed movies.`);
          },
        },
        {
          text: "Replace",
          style: "destructive",
          onPress: () => {
            const result = backup.restore(doc, { mode: "replace", includeSettings: true });
            Alert.alert("Restored", `${result.saved} saved and ${result.history} viewed movies.`);
          },
        },
      ],
    );
  };

  const version = Constants.expoConfig?.version ?? "dev";
  const taste = genreBreakdown(savedMovies, genres.data ?? []);
  const ratings = ratingSummary(savedMovies);
  const decades = decadeBreakdown(savedMovies, 3);
  const regionName = REGIONS.find((r) => r.code === settings.region)?.name ?? settings.region;

  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        <ScrollView
          className="px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <Text className="text-white text-2xl font-bold mt-5">Profile</Text>

          {/* Avatar */}
          <View className="items-center mt-8">
            <View className="bg-dark-100 rounded-full w-24 h-24 items-center justify-center">
              <Image
                source={icons.person}
                className="w-12 h-12"
                tintColor="#AB8BFF"
                resizeMode="contain"
              />
            </View>
            <Text className="text-white text-xl font-semibold mt-4">Local profile</Text>
            <Text className="text-light-300 text-sm mt-1">
              Everything is stored on this device
            </Text>
          </View>

          {/* Stats */}
          <View className="flex-row justify-around mt-8 bg-dark-100 rounded-2xl py-5">
            <View className="items-center">
              <Text className="text-accent text-2xl font-bold">{savedCount}</Text>
              <Text className="text-light-300 text-sm">Saved</Text>
            </View>
            <View className="w-px bg-dark-200" />
            <View className="items-center">
              <Text className="text-accent text-2xl font-bold">{ratings.rated}</Text>
              <Text className="text-light-300 text-sm">Rated</Text>
            </View>
            <View className="w-px bg-dark-200" />
            <View className="items-center">
              <Text className="text-accent text-2xl font-bold">{history.count}</Text>
              <Text className="text-light-300 text-sm">Viewed</Text>
            </View>
          </View>

          {/* Taste */}
          {taste.length > 0 || ratings.average !== null ? (
            <View className="mt-6 bg-dark-100 rounded-2xl p-5">
              <Text className="text-white text-base font-semibold mb-1">Your taste</Text>
              <Text className="text-light-300 text-xs mb-4">From the movies in your watchlist</Text>
              {taste.map((t) => (
                <StatBar
                  key={t.genre.id}
                  label={t.genre.name}
                  value={`${t.count} ${t.count === 1 ? "movie" : "movies"}`}
                  share={t.share / (taste[0]?.share || 1)}
                />
              ))}
              {ratings.average !== null ? (
                <Text className="text-light-200 text-sm mt-2">
                  You rate on average{" "}
                  <Text className="text-accent font-semibold">{ratings.average.toFixed(1)} / 10</Text>
                </Text>
              ) : null}
              {decades.length > 0 ? (
                <Text className="text-light-200 text-sm mt-2">
                  Mostly from the{" "}
                  <Text className="text-accent font-semibold">
                    {decades.map((d) => d.decade).join(", ")}
                  </Text>
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Browsing */}
          <Text className="text-light-300 text-sm mt-8 mb-4">Browsing</Text>
          <View className="bg-dark-100 rounded-xl py-4 px-5 mb-3">
            <Text className="text-white text-base mb-3">Trending window</Text>
            <OptionPicker
              options={WINDOW_OPTIONS}
              value={settings.trendingWindow}
              onChange={(trendingWindow) => update({ trendingWindow })}
            />
          </View>
          <View className="bg-dark-100 rounded-xl py-4 px-5 mb-3">
            <Text className="text-white text-base">Region</Text>
            <Text className="text-light-300 text-xs mt-1 mb-3">
              Now playing, coming soon and where to watch, for {regionName}
            </Text>
            <OptionPicker
              options={REGION_OPTIONS}
              value={settings.region}
              onChange={(region) => update({ region })}
              wrap
            />
          </View>
          <View className="bg-dark-100 rounded-xl py-4 px-5 mb-3">
            <Text className="text-white text-base">Language</Text>
            <Text className="text-light-300 text-xs mt-1 mb-3">
              Titles and overviews, where TMDB has a translation
            </Text>
            <OptionPicker
              options={LANGUAGE_OPTIONS}
              value={settings.language}
              onChange={(language) => update({ language })}
              wrap
            />
          </View>
          <SettingRow
            label="Keep a history"
            description="Remember the movies you open"
            right={
              <Switch
                value={settings.trackHistory}
                onValueChange={(trackHistory) => update({ trackHistory })}
                trackColor={{ true: "#AB8BFF", false: "#221F3D" }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <SettingRow
            label="Data saver"
            description="Load smaller posters and photos"
            right={
              <Switch
                value={settings.dataSaver}
                onValueChange={(dataSaver) => update({ dataSaver })}
                trackColor={{ true: "#AB8BFF", false: "#221F3D" }}
                thumbColor="#FFFFFF"
              />
            }
          />

          {/* Data */}
          <Text className="text-light-300 text-sm mt-6 mb-4">Your data</Text>
          <SettingRow
            label="Recently viewed"
            description={`${history.count} ${history.count === 1 ? "movie" : "movies"}`}
            onPress={() => router.push("/history")}
          />
          <SettingRow
            label="Export a backup"
            description="Share a file with your watchlist, history and settings"
            onPress={backup.busy ? undefined : () => void backup.exportBackup()}
          />
          <SettingRow
            label="Restore a backup"
            description="Pick a file exported from MovieAr"
            onPress={backup.busy ? undefined : () => void onImport()}
          />
          <SettingRow
            label="Clear watchlist"
            description={`${savedCount} saved`}
            destructive
            onPress={() =>
              confirm("Clear watchlist", "Remove every saved movie, with your ratings and notes?", clearSavedMovies)
            }
          />
          <SettingRow
            label="Clear history"
            destructive
            onPress={() => confirm("Clear history", "Forget every viewed movie?", history.clear)}
          />
          <SettingRow
            label="Clear cached data"
            description={
              cachedEntries === null
                ? undefined
                : `${cachedEntries} cached ${cachedEntries === 1 ? "response" : "responses"}`
            }
            destructive
            onPress={onClearCache}
          />
          <SettingRow
            label="Reset settings"
            onPress={() => confirm("Reset settings", "Go back to the defaults?", reset, "Reset")}
          />

          {/* About */}
          <Text className="text-light-300 text-sm mt-6 mb-4">About</Text>
          <SettingRow label="Version" right={<Text className="text-light-200">{version}</Text>} />
          <Text className="text-light-300 text-xs text-center mt-4 px-4">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
