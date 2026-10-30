import { useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getImageUrl } from "@/services/api";

interface Props {
  images: readonly MovieImage[];
}

/** Horizontal strip of backdrops; tapping one opens a swipeable full screen viewer. */
export default function ImageGallery({ images }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);
  const { width } = Dimensions.get("window");

  if (images.length === 0) return null;

  return (
    <>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={images}
        keyExtractor={(item) => item.file_path}
        ItemSeparatorComponent={() => <View className="w-3" />}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => {
              setCurrent(index);
              setOpenIndex(index);
            }}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Open image ${index + 1} of ${images.length}`}
          >
            <Image
              source={{ uri: getImageUrl(item.file_path, "w500") ?? undefined }}
              className="w-64 h-36 rounded-lg bg-dark-100"
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={openIndex !== null}
        animationType="fade"
        onRequestClose={() => setOpenIndex(null)}
      >
        <View className="flex-1 bg-black">
          <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={images}
            initialScrollIndex={openIndex ?? 0}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            keyExtractor={(item) => item.file_path}
            onMomentumScrollEnd={(e) =>
              setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))
            }
            renderItem={({ item }) => (
              <View style={{ width }} className="flex-1 justify-center">
                <Image
                  source={{ uri: getImageUrl(item.file_path, "w1280") ?? undefined }}
                  style={{ width, aspectRatio: item.aspect_ratio || 16 / 9 }}
                  resizeMode="contain"
                />
              </View>
            )}
          />
          <SafeAreaView className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-5 pt-2">
            <Text className="text-white text-sm">
              {current + 1} / {images.length}
            </Text>
            <TouchableOpacity
              onPress={() => setOpenIndex(null)}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="bg-dark-100/80 rounded-full px-4 py-2"
            >
              <Text className="text-white font-semibold">Close</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}
