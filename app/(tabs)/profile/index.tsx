import { useCallback, useEffect, useState } from "react";
import { Alert, Image, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Constants from "expo-constants";
import { icons } from "@/constants/icons";
import { useSavedMovies } from "@/hooks/useSavedMovies";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { useSettings } from "@/hooks/useSettings";
import { clearSavedMovies } from "@/services/savedMovies";
import { cacheEntryCount, clearCache } from "@/services/cache";
import { LANGUAGES, REGIONS, type TrendingWindow } from "@/services/settings";
import OptionPicker, { type Option } from "@/components/OptionPicker";
import SettingRow from "@/components/SettingRow";

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

function confirm(title: string, message: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Clear", style: "destructive", onPress: onConfirm },
  ]);
}

export default function Profile() {
  const { count: savedCount } = useSavedMovies();
  const history = useWatchHistory();
  const { settings, update, reset } = useSettings();
  const [cachedEntries, setCachedEntries] = useState<number | null>(null);

  const refreshCacheCount = useCallback(() => {
    cacheEntryCount().then(setCachedEntries);
  }, []);

  useEffect(() => {
    refreshCacheCount();
  }, [refreshCacheCount]);

  const onClearCache = () => {
    confirm("Clear cached data", "Lists and details will be downloaded again.", () => {
      clearCache().then(refreshCacheCount);
    });
  };

  const version = Constants.expoConfig?.version ?? "dev";

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
              <Text className="text-accent text-2xl font-bold">{history.count}</Text>
              <Text className="text-light-300 text-sm">Viewed</Text>
            </View>
          </View>

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
              Used for what is now playing and coming soon near you
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

          {/* Data */}
          <Text className="text-light-300 text-sm mt-6 mb-4">Your data</Text>
          <SettingRow
            label="Recently viewed"
            description={`${history.count} ${history.count === 1 ? "movie" : "movies"}`}
            onPress={() => router.push("/history")}
          />
          <SettingRow
            label="Clear watchlist"
            description={`${savedCount} saved`}
            destructive
            onPress={() =>
              confirm("Clear watchlist", "Remove every saved movie?", clearSavedMovies)
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
            onPress={() => confirm("Reset settings", "Go back to the defaults?", reset)}
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
