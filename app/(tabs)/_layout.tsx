import { icons } from "@/constants/icons";
import { Tabs } from "expo-router";
import { Image, Text, View } from "react-native";

const TabIcon = ({
  focused,
  icon,
  title,
}: {
  focused: boolean;
  icon: any;
  title: string;
}) => {
  return (
    <View className="items-center justify-center gap-1 min-h-[60px] flex-1">
      {/* Highlight Pill Background */}
      {focused && (
        <View
          className="absolute inset-0 mx-4 rounded-full bg-primary"
          style={{
            backgroundColor: "#246BFD", // or use your secondary color
            height: 40,
          }}
        />
      )}

      {/* Icon + Label Container */}
      <View className="flex-col items-center justify-center px-3 py-2">
        <Image
          source={icon}
          className="w-6 h-6"
          tintColor={focused ? "#FFFFFF" : "#A8B5DB"}
          resizeMode="contain"
        />
        {focused && (
          <Text className="text-white font-semibold text-xs ml-2">
            {title.charAt(0).toUpperCase() + title.slice(1)}
          </Text>
        )}
      </View>
    </View>
  );
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#A8B5DB",
        tabBarStyle: {
          backgroundColor: "#0f0D23",
          borderRadius: 50,
          marginHorizontal: 20,
          marginBottom: 36,
          height: 72,
          position: "absolute",
          overflow: "hidden",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          padding: 0,
          margin: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.home} title="home" />
          ),
        }}
      />

      <Tabs.Screen
        name="search/index"
        options={{
          title: "Search",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.search} title="search" />
          ),
        }}
      />

      <Tabs.Screen
        name="saved/index"
        options={{
          title: "Saved",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.save} title="saved" />
          ),
        }}
      />

      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.person} title="profile" />
          ),
        }}
      />
    </Tabs>
  );
}
