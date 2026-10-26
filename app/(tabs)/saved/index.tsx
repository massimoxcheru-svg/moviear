import { View, Text, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { icons } from "@/constants/icons";

export default function Saved() {
  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        <View className="px-5 mt-5">
          {/* Header */}
          <Text className="text-white text-2xl font-bold">Saved Movies</Text>
          <Text className="text-light-200 text-sm mt-1">
            Your personal watchlist
          </Text>

          {/* Empty State */}
          <View className="flex-1 items-center justify-center mt-20">
            <View className="bg-dark-100 rounded-full p-6 mb-6">
              <Image
                source={icons.save}
                className="w-16 h-16"
                tintColor="#AB8BFF"
                resizeMode="contain"
              />
            </View>
            <Text className="text-white text-xl font-semibold">
              No Saved Movies Yet
            </Text>
            <Text className="text-light-300 text-center mt-3 px-8">
              Browse movies and tap the save icon to add them to your watchlist
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
