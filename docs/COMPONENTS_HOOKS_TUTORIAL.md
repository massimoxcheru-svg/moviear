# React Native Components & Hooks Tutorial

### Mobile-Specific Patterns for MovieAR

This tutorial covers React Native components and hooks that behave differently from their web counterparts.

---

## Core Components Reference

### View vs div

`View` is the fundamental container, equivalent to `<div>` but with key differences:

```tsx
import { View } from "react-native";

// Key differences from <div>:
// 1. Default display is flex
// 2. Default flexDirection is column
// 3. Cannot render text directly

<View className="flex-1 bg-primary">
  <View className="p-4">{/* Children stack vertically by default */}</View>
</View>;
```

### Text - The Mandatory Wrapper

**All text MUST be inside `<Text>`** - this will crash if violated:

```tsx
import { Text } from "react-native";

// ❌ CRASH: Raw text outside Text
<View>Hello</View>

// ✅ CORRECT
<View>
  <Text>Hello</Text>
</View>

// ✅ Nested Text for inline styles
<Text className="text-white text-xl">
  Welcome to <Text className="font-bold text-accent">MovieAR</Text>!
</Text>
```

**Important props:**

| Prop            | Purpose                | Example                            |
| --------------- | ---------------------- | ---------------------------------- |
| `numberOfLines` | Truncate with ellipsis | `numberOfLines={2}`                |
| `ellipsizeMode` | Where to ellipsize     | `"tail"` \| `"middle"` \| `"head"` |
| `selectable`    | Allow text selection   | `selectable={true}`                |
| `onPress`       | Make text clickable    | `onPress={() => {}}`               |

```tsx
<Text className="text-white" numberOfLines={2} ellipsizeMode="tail">
  This is a really long movie description that will be truncated...
</Text>
```

### Image - Remote & Local

```tsx
import { Image } from "react-native";

// LOCAL: Use require() - resolved at build time
<Image
  source={require("@assets/images/logo.png")}
  className="w-[100px] h-[100px]"
  resizeMode="contain"
/>

// REMOTE: Use { uri } object
<Image
  source={{ uri: "https://image.tmdb.org/t/p/w500/poster.jpg" }}
  className="w-full h-[225px] rounded-xl"
  resizeMode="cover"
  // For authenticated images:
  // source={{ uri: "...", headers: { Authorization: "Bearer ..." }}}
/>
```

**resizeMode options:**

| Mode      | Behavior                    |
| --------- | --------------------------- |
| `cover`   | Scale to fill, may crop     |
| `contain` | Scale to fit, may letterbox |
| `stretch` | Stretch to fill exactly     |
| `center`  | Center without scaling      |

**⚠️ Critical**: Unlike web `<img>`, React Native `Image` requires explicit dimensions!

### ScrollView vs FlatList

**ScrollView** - For small, fixed content:

```tsx
import { ScrollView, View, Text } from "react-native";

<ScrollView
  className="flex-1"
  contentContainerStyle={{ paddingBottom: 100 }} // For tab bar
  showsVerticalScrollIndicator={false}
>
  <View className="p-4">
    <Text>Content here...</Text>
  </View>
</ScrollView>;
```

**FlatList** - For large lists (virtualized):

```tsx
import { FlatList, View, Text } from "react-native";

type Movie = { id: number; title: string };

const movies: Movie[] = [
  /* ... */
];

<FlatList
  data={movies}
  keyExtractor={(item) => item.id.toString()}
  renderItem={({ item, index }) => (
    <View className="p-4">
      <Text className="text-white">{item.title}</Text>
    </View>
  )}
  // Performance optimizations
  initialNumToRender={10}
  maxToRenderPerBatch={5}
  windowSize={5}
  // Callbacks
  onEndReached={() => loadMoreMovies()}
  onEndReachedThreshold={0.5}
  // Pull to refresh
  refreshing={isRefreshing}
  onRefresh={() => refreshData()}
  // Styling
  contentContainerStyle={{ paddingBottom: 100 }}
  ItemSeparatorComponent={() => <View className="h-[1px] bg-dark-100" />}
  ListHeaderComponent={() => <Text className="text-white p-4">Movies</Text>}
  ListEmptyComponent={() => (
    <Text className="text-light-300 p-4">No movies</Text>
  )}
/>;
```

**When to use which:**

| Use ScrollView             | Use FlatList         |
| -------------------------- | -------------------- |
| < 20 items                 | > 20 items           |
| All content fits in memory | Needs virtualization |
| Complex layout             | Simple list          |
| Form content               | Data lists           |

### TextInput - Form Inputs

```tsx
import { TextInput, View } from "react-native";
import { useState } from "react";

export default function SearchBar() {
  const [query, setQuery] = useState("");

  return (
    <View className="bg-dark-100 rounded-xl px-4 py-3 flex-row items-center">
      <TextInput
        className="flex-1 text-white text-base"
        value={query}
        onChangeText={setQuery} // Not onChange!
        placeholder="Search movies..."
        placeholderTextColor="#9CA4AB"
        autoCapitalize="none" // "none" | "sentences" | "words" | "characters"
        autoCorrect={false}
        returnKeyType="search" // Keyboard button text
        onSubmitEditing={() => search(query)} // When user presses return
        clearButtonMode="while-editing" // iOS: show X button
      />
    </View>
  );
}
```

**Key differences from web `<input>`:**

| Web                 | React Native                              |
| ------------------- | ----------------------------------------- |
| `onChange`          | `onChangeText` (receives string directly) |
| `onSubmit`          | `onSubmitEditing`                         |
| `placeholder` style | `placeholderTextColor` prop               |

### TouchableOpacity & Pressable

**TouchableOpacity** - Simple fade on press:

```tsx
import { TouchableOpacity, Text } from "react-native";

<TouchableOpacity
  onPress={() => router.push("/movies/123")}
  activeOpacity={0.7} // Opacity when pressed
  className="bg-accent p-4 rounded-xl items-center"
>
  <Text className="text-white font-bold">View Details</Text>
</TouchableOpacity>;
```

**Pressable** - More control, better for complex interactions:

```tsx
import { Pressable, Text } from "react-native";

<Pressable
  onPress={() => router.push("/movies/123")}
  onLongPress={() => showOptions()}
  delayLongPress={500}
  style={({ pressed }) => ({
    opacity: pressed ? 0.5 : 1,
    transform: [{ scale: pressed ? 0.98 : 1 }],
  })}
  className="bg-accent p-4 rounded-xl items-center"
>
  {({ pressed }) => (
    <Text className={pressed ? "text-gray-300" : "text-white"}>
      View Details
    </Text>
  )}
</Pressable>;
```

### ActivityIndicator - Loading Spinner

```tsx
import { ActivityIndicator, View } from "react-native";

// Simple
<ActivityIndicator size="large" color="#AB8BFF" />;

// Centered loading screen
const LoadingScreen = () => (
  <View className="flex-1 justify-center items-center bg-primary">
    <ActivityIndicator size="large" color="#AB8BFF" />
  </View>
);
```

---

## Navigation Hooks (Expo Router)

### useLocalSearchParams

Get URL parameters from the current route:

```tsx
// Route: /movies/[id]
// URL: /movies/123?category=action

import { useLocalSearchParams } from "expo-router";

export default function MovieDetails() {
  const { id, category } = useLocalSearchParams<{
    id: string;
    category?: string;
  }>();

  // id = "123"
  // category = "action" (query param)
}
```

### useRouter

Access router for programmatic navigation:

```tsx
import { useRouter } from "expo-router";

export default function MovieCard({ id }: { id: string }) {
  const router = useRouter();

  return (
    <TouchableOpacity onPress={() => router.push(`/movies/${id}`)}>
      {/* ... */}
    </TouchableOpacity>
  );
}

// Available methods:
// router.push(href)      - Navigate forward
// router.replace(href)   - Replace current screen
// router.back()          - Go back
// router.canGoBack()     - Check if back is possible
// router.dismiss()       - Dismiss modal
// router.dismissAll()    - Dismiss all modals
```

### useSegments

Get the current route segments:

```tsx
import { useSegments } from "expo-router";

export default function SomeComponent() {
  const segments = useSegments();
  // URL: /movies/123
  // segments = ["movies", "123"]

  const isMovieDetails = segments[0] === "movies";
}
```

### usePathname

Get the current URL path:

```tsx
import { usePathname } from "expo-router";

export default function DebugInfo() {
  const pathname = usePathname();
  // pathname = "/movies/123"
}
```

---

## Platform Hooks & APIs

### useSafeAreaInsets

Handle device safe areas (notch, home indicator):

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text } from "react-native";

export default function Header() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }}>
      <Text className="text-white text-2xl font-bold">MovieAR</Text>
    </View>
  );
}

// insets = { top, bottom, left, right }
```

### useWindowDimensions

Get screen dimensions (reactive to orientation changes):

```tsx
import { useWindowDimensions } from "react-native";

export default function MovieGrid() {
  const { width, height } = useWindowDimensions();

  // Calculate columns based on screen width
  const numColumns = width > 600 ? 4 : 2;
  const itemWidth = width / numColumns - 20;

  return (
    <FlatList
      numColumns={numColumns}
      key={numColumns} // Force re-render on column change
      renderItem={({ item }) => (
        <View style={{ width: itemWidth }}>{/* ... */}</View>
      )}
    />
  );
}
```

### Keyboard Handling

```tsx
import { Keyboard, TouchableWithoutFeedback, View } from "react-native";

// Dismiss keyboard on tap outside
<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
  <View className="flex-1">
    <TextInput ... />
  </View>
</TouchableWithoutFeedback>

// Listen to keyboard events
import { useEffect } from "react";

useEffect(() => {
  const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
    console.log("Keyboard height:", e.endCoordinates.height);
  });
  const hideSub = Keyboard.addListener("keyboardDidHide", () => {
    console.log("Keyboard hidden");
  });

  return () => {
    showSub.remove();
    hideSub.remove();
  };
}, []);
```

---

## Common Patterns

### Loading State Pattern

```tsx
import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, FlatList } from "react-native";

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMovies()
      .then(setMovies)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-primary">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-primary p-4">
        <Text className="text-red-500 text-center">{error}</Text>
        <TouchableOpacity
          onPress={() => {
            setLoading(true);
            setError(null);
          }}
          className="mt-4"
        >
          <Text className="text-accent">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={movies}
      renderItem={({ item }) => <MovieCard movie={item} />}
    />
  );
}
```

### Pull to Refresh Pattern

```tsx
const [refreshing, setRefreshing] = useState(false);

const onRefresh = async () => {
  setRefreshing(true);
  try {
    const data = await fetchMovies();
    setMovies(data);
  } finally {
    setRefreshing(false);
  }
};

<FlatList
  data={movies}
  renderItem={...}
  refreshing={refreshing}
  onRefresh={onRefresh}
/>
```

### Infinite Scroll Pattern

```tsx
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);

const loadMore = async () => {
  if (loadingMore || !hasMore) return;

  setLoadingMore(true);
  try {
    const newMovies = await fetchMovies(page + 1);
    if (newMovies.length === 0) {
      setHasMore(false);
    } else {
      setMovies([...movies, ...newMovies]);
      setPage(page + 1);
    }
  } finally {
    setLoadingMore(false);
  }
};

<FlatList
  data={movies}
  renderItem={...}
  onEndReached={loadMore}
  onEndReachedThreshold={0.3}
  ListFooterComponent={
    loadingMore ? <ActivityIndicator color="#AB8BFF" /> : null
  }
/>
```

### Conditional Platform Rendering

```tsx
import { Platform, View, Text } from "react-native";

// Entire component
{Platform.OS === 'ios' && (
  <View className="h-[50px]" />  // iOS status bar spacer
)}

// Inline values
<View style={{ paddingTop: Platform.OS === 'ios' ? 50 : 20 }}>
  ...
</View>

// Platform.select()
<View style={Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.25 },
  android: { elevation: 4 },
  web: { boxShadow: '0 2px 4px rgba(0,0,0,0.25)' },
})}>
  ...
</View>
```

---

## Performance Tips

### 1. Memoize Expensive Components

```tsx
import { memo } from "react";

const MovieCard = memo(({ movie }: { movie: Movie }) => {
  return (
    <View>
      <Image source={{ uri: movie.poster }} />
      <Text>{movie.title}</Text>
    </View>
  );
});
```

### 2. Use `useCallback` for Handlers

```tsx
const handlePress = useCallback((id: string) => {
  router.push(`/movies/${id}`);
}, []);

<FlatList
  data={movies}
  renderItem={({ item }) => <MovieCard movie={item} onPress={handlePress} />}
/>;
```

### 3. Avoid Inline Objects in Style

```tsx
// ❌ Creates new object every render
<View style={{ padding: 16 }} />

// ✅ Use className or StyleSheet
<View className="p-4" />

// ✅ Or create StyleSheet outside component
const styles = StyleSheet.create({
  container: { padding: 16 }
});
<View style={styles.container} />
```

### 4. Use `getItemLayout` for Fixed-Height Lists

```tsx
<FlatList
  data={movies}
  getItemLayout={(data, index) => ({
    length: 100,  // Item height
    offset: 100 * index,
    index,
  })}
  renderItem={...}
/>
```

---

## Quick Reference

### Event Handler Mapping

| Web          | React Native                 |
| ------------ | ---------------------------- |
| onClick      | onPress                      |
| onChange     | onChangeText (TextInput)     |
| onSubmit     | onSubmitEditing              |
| onKeyDown    | onKeyPress                   |
| onMouseEnter | onPressIn (close equivalent) |
| onFocus      | onFocus                      |
| onBlur       | onBlur                       |

### Gesture Prop Comparison

```tsx
// Web
<button onClick={() => {}}>Click</button>

// React Native
<TouchableOpacity onPress={() => {}}>
  <Text>Press</Text>
</TouchableOpacity>

// Or Pressable for more control
<Pressable
  onPress={() => {}}           // Tap
  onLongPress={() => {}}       // Long press
  onPressIn={() => {}}         // Press start
  onPressOut={() => {}}        // Press end
>
  <Text>Press</Text>
</Pressable>
```
