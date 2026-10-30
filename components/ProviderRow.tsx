import { Image, Linking, Text, TouchableOpacity, View } from "react-native";
import { getImageUrl, PROVIDER_KIND_LABELS, type WatchOptions } from "@/services/api";

interface Props {
  options: WatchOptions | null;
  regionName: string;
}

/** Streaming, rental and purchase logos for the user's region. */
export default function ProviderRow({ options, regionName }: Props) {
  if (!options) {
    return (
      <Text className="text-light-300">No streaming or rental options found for {regionName}.</Text>
    );
  }

  const open = () => {
    Linking.openURL(options.link).catch(() => {});
  };

  return (
    <View>
      {options.groups.map((group) => (
        <View key={group.kind} className="flex-row items-center mb-3">
          <Text className="text-light-300 text-sm w-24">{PROVIDER_KIND_LABELS[group.kind]}</Text>
          <View className="flex-row flex-wrap gap-2 flex-1">
            {group.providers.map((p) => {
              const logo = getImageUrl(p.logo_path, "w92");
              return (
                <View
                  key={p.provider_id}
                  accessibilityLabel={p.provider_name}
                  className="w-10 h-10 rounded-lg overflow-hidden bg-dark-100 items-center justify-center"
                >
                  {logo ? (
                    <Image source={{ uri: logo }} className="w-10 h-10" resizeMode="cover" />
                  ) : (
                    <Text className="text-light-200 text-xs">{p.provider_name.slice(0, 2)}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}
      <TouchableOpacity onPress={open} accessibilityRole="link" className="self-start mt-1">
        <Text className="text-accent text-sm font-semibold">See all options on JustWatch</Text>
      </TouchableOpacity>
    </View>
  );
}
