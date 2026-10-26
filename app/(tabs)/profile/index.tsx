import { View, Text, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { icons } from "@/constants/icons";

export default function Profile() {
  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1">
        <View className="px-5 mt-5">
          {/* Header */}
          <Text className="text-white text-2xl font-bold">Profile</Text>

          {/* Avatar Section */}
          <View className="items-center mt-8">
            <View className="bg-dark-100 rounded-full w-24 h-24 items-center justify-center">
              <Image
                source={icons.person}
                className="w-12 h-12"
                tintColor="#AB8BFF"
                resizeMode="contain"
              />
            </View>
            <Text className="text-white text-xl font-semibold mt-4">
              Guest User
            </Text>
            <Text className="text-light-300 text-sm mt-1">
              Sign in to sync your data
            </Text>
          </View>

          {/* Stats */}
          <View className="flex-row justify-around mt-8 bg-dark-100 rounded-2xl py-5">
            <View className="items-center">
              <Text className="text-accent text-2xl font-bold">0</Text>
              <Text className="text-light-300 text-sm">Saved</Text>
            </View>
            <View className="w-px bg-dark-200" />
            <View className="items-center">
              <Text className="text-accent text-2xl font-bold">0</Text>
              <Text className="text-light-300 text-sm">Watched</Text>
            </View>
            <View className="w-px bg-dark-200" />
            <View className="items-center">
              <Text className="text-accent text-2xl font-bold">0</Text>
              <Text className="text-light-300 text-sm">Reviews</Text>
            </View>
          </View>

          {/* Settings Placeholder */}
          <View className="mt-8">
            <Text className="text-light-300 text-sm mb-4">Settings</Text>
            {["Notifications", "Theme", "Language", "About"].map(
              (item, index) => (
                <TouchableOpacity
                  key={index}
                  className="bg-dark-100 rounded-xl py-4 px-5 mb-3 flex-row justify-between items-center"
                >
                  <Text className="text-white text-base">{item}</Text>
                  <Image
                    source={icons.arrow}
                    className="w-4 h-4"
                    tintColor="#9CA4AB"
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ),
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
