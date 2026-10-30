import { Image, Linking, Text, TouchableOpacity, View } from "react-native";
import { icons } from "@/constants/icons";
import { getYouTubeThumbnail, getYouTubeUrl } from "@/services/api";

interface Props {
  video: Video;
}

/** YouTube thumbnail that opens the trailer in the YouTube app or browser. */
export default function VideoCard({ video }: Props) {
  const open = () => {
    Linking.openURL(getYouTubeUrl(video.key)).catch(() => {
      // Nothing can open the URL on this device; there is no useful fallback.
    });
  };

  return (
    <TouchableOpacity
      onPress={open}
      className="w-56"
      accessibilityRole="button"
      accessibilityLabel={`Play ${video.name}`}
    >
      <View className="w-56 h-32 rounded-lg overflow-hidden bg-dark-100 items-center justify-center">
        <Image
          source={{ uri: getYouTubeThumbnail(video.key) }}
          className="absolute w-full h-full"
          resizeMode="cover"
        />
        <View className="bg-primary/70 rounded-full w-12 h-12 items-center justify-center">
          <Image
            source={icons.play}
            className="w-5 h-5 ml-1"
            tintColor="#FFFFFF"
            resizeMode="contain"
          />
        </View>
      </View>
      <Text className="text-white text-sm font-semibold mt-2" numberOfLines={1}>
        {video.name}
      </Text>
      <Text className="text-light-300 text-xs mt-0.5">
        {video.type}
        {video.official ? "" : " (unofficial)"}
      </Text>
    </TouchableOpacity>
  );
}
