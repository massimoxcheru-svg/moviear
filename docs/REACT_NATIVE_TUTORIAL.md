# React Native with Expo Tutorial

### A Complete Guide Using the MovieAR Project

> **For JavaScript/TypeScript Developers**: This tutorial assumes familiarity with React, TypeScript, and modern JavaScript. We'll focus on React Native-specific concepts, mobile development patterns, and the Expo ecosystem.

---

## Table of Contents

1. [What is React Native?](#1-what-is-react-native)
2. [Understanding the Expo Framework](#2-understanding-the-expo-framework)
3. [Project Setup & Configuration](#3-project-setup--configuration)
4. [Core Components vs Web Elements](#4-core-components-vs-web-elements)
5. [File-Based Routing with Expo Router](#5-file-based-routing-with-expo-router)
6. [Styling with NativeWind](#6-styling-with-nativewind)
7. [Navigation Patterns](#7-navigation-patterns)
8. [Working with Images and Assets](#8-working-with-images-and-assets)
9. [Platform-Specific Code](#9-platform-specific-code)
10. [State Management Patterns](#10-state-management-patterns)
11. [API Integration](#11-api-integration)
12. [Building & Deployment](#12-building--deployment)

---

## 1. What is React Native?

React Native is a framework for building native mobile apps using JavaScript and React. Unlike web apps rendered in a WebView, React Native components compile to **actual native UI elements**.

### Key Differences from React Web

| Concept    | React Web                        | React Native                           |
| ---------- | -------------------------------- | -------------------------------------- |
| Rendering  | DOM elements (`<div>`, `<span>`) | Native components (`<View>`, `<Text>`) |
| Styling    | CSS files, CSS-in-JS             | StyleSheet API, inline styles          |
| Navigation | React Router, URL-based          | React Navigation, stack-based          |
| Clicks     | `onClick`                        | `onPress`                              |
| Scrolling  | `overflow: scroll`               | `<ScrollView>` or `<FlatList>`         |
| Text       | Anywhere                         | Must be inside `<Text>` component      |

### The Bridge Architecture

```
┌─────────────────────┐    ┌─────────────────────┐
│   JavaScript Thread │◄──►│  Native Thread      │
│   (Your React Code) │    │  (iOS/Android UI)   │
└─────────────────────┘    └─────────────────────┘
          │                          │
          └──────── Bridge ──────────┘
             (JSON messages)
```

React Native uses a "bridge" to communicate between your JavaScript code and native platform APIs. The new architecture (which MovieAR uses via `"newArchEnabled": true`) uses JSI (JavaScript Interface) for direct communication without JSON serialization.

---

## 2. Understanding the Expo Framework

**Expo** is a platform built on top of React Native that simplifies development by providing:

- **Pre-configured native modules** (camera, location, etc.)
- **Development tools** (hot reload, error overlay)
- **Build service** (EAS Build) for creating production binaries
- **OTA updates** for pushing JavaScript updates without app store review

### Expo Project Configuration (`app.json`)

This is your app's configuration file. Let's examine MovieAR's configuration:

```json
{
  "expo": {
    "name": "moviear", // App display name
    "slug": "moviear", // URL-friendly identifier
    "version": "1.0.0", // App version
    "orientation": "portrait", // Lock to portrait mode
    "icon": "./assets/images/icon.png", // App icon (1024x1024)
    "scheme": "moviear", // Deep link scheme (moviear://)
    "userInterfaceStyle": "automatic", // Follow system dark/light mode
    "newArchEnabled": true, // Use React Native's New Architecture

    "ios": {
      "supportsTablet": true // Allow iPad installation
    },

    "android": {
      "adaptiveIcon": {
        // Android 8+ adaptive icons
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png"
      },
      "edgeToEdgeEnabled": true // Draw behind status/nav bars
    },

    "plugins": [
      // Expo Config Plugins
      "expo-router", // File-based routing
      [
        "expo-splash-screen",
        {
          /* ... */
        }
      ],
      "expo-font",
      "expo-web-browser"
    ],

    "experiments": {
      "typedRoutes": true, // Type-safe route names
      "reactCompiler": true // React Compiler (automatic memoization)
    }
  }
}
```

#### 🔑 Key Concepts

**`scheme`**: Defines how deep links work. With `"scheme": "moviear"`, users can open your app via `moviear://movies/123`.

**`newArchEnabled`**: Enables React Native's New Architecture (Fabric renderer + TurboModules) for better performance.

**`config plugins`**: Modify native code at build time. The `expo-router` plugin sets up the entry point for file-based routing.

---

## 3. Project Setup & Configuration

### Entry Point (`package.json`)

```json
{
  "main": "expo-router/entry" // Custom entry point for file-based routing
}
```

Unlike standard React Native apps that use `index.js`, Expo Router apps use a custom entry point that automatically sets up navigation based on your file structure.

### Metro Bundler Configuration (`metro.config.js`)

**Metro** is React Native's JavaScript bundler (like Webpack for web).

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

**What's happening here?**

1. Get Expo's default Metro configuration
2. Wrap it with NativeWind's configuration to process Tailwind CSS
3. Point to `global.css` as the Tailwind entry file

### Babel Configuration (`babel.config.js`)

```javascript
module.exports = function (api) {
  api.cache(true); // Cache transforms for faster builds
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }], // JSX transformation
      "nativewind/babel", // Tailwind processing
    ],
  };
};
```

**`jsxImportSource: 'nativewind'`**: This changes how JSX is transformed. Instead of the default React JSX transform, NativeWind's transform enables the `className` prop on React Native components.

### TypeScript Configuration (`tsconfig.json`)

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"], // Import from root: @/components/Button
      "@assets/*": ["./assets/*"] // Import assets: @assets/images/logo.png
    },
    "types": ["nativewind/types"] // NativeWind type definitions
  }
}
```

**Path Aliases**: Instead of relative imports like `../../constants/icons`, use clean aliases like `@/constants/icons`.

---

## 4. Core Components vs Web Elements

### The Fundamental Rule

> **In React Native, ALL text must be wrapped in a `<Text>` component.**

This is the #1 error new React Native developers encounter:

```tsx
// ❌ WRONG - Will crash!
<View>
  Hello World
</View>

// ✅ CORRECT
<View>
  <Text>Hello World</Text>
</View>
```

### Component Mapping

| Web Element             | React Native                        | Notes                                    |
| ----------------------- | ----------------------------------- | ---------------------------------------- |
| `<div>`                 | `<View>`                            | Basic container, uses Flexbox by default |
| `<p>`, `<span>`, `<h1>` | `<Text>`                            | All text rendering                       |
| `<img>`                 | `<Image>`                           | Requires explicit dimensions             |
| `<button>`              | `<TouchableOpacity>`, `<Pressable>` | No built-in button styling               |
| `<input>`               | `<TextInput>`                       | Different event handlers                 |
| `<ul>`, `<li>`          | `<FlatList>`                        | Virtualized for performance              |
| `<a>`                   | `<Link>` (expo-router)              | Navigation, not HTTP                     |

### View Component

```tsx
import { View } from "react-native";

// Default: flexDirection is 'column' (vertical), not 'row' like web CSS
<View>
  <View /> {/* These stack vertically */}
  <View />
</View>

// To make horizontal:
<View style={{ flexDirection: 'row' }}>
  <View /> {/* These are side by side */}
  <View />
</View>
```

**🔑 Key Difference**: Web CSS default is `display: block`. React Native is `display: flex` with `flexDirection: column`.

### Image Component

```tsx
import { Image, ImageSourcePropType } from "react-native";

// Local images (require = bundled at build time)
<Image
  source={require('@assets/images/logo.png')}
  style={{ width: 100, height: 100 }}  // REQUIRED - no natural sizing
/>

// Remote images (URI)
<Image
  source={{ uri: 'https://example.com/image.jpg' }}
  style={{ width: 100, height: 100 }}
  resizeMode="cover"  // "cover" | "contain" | "stretch" | "center"
/>
```

**🚨 Important**: React Native images don't have intrinsic dimensions like web `<img>`. You MUST specify width and height.

### TouchableOpacity vs Pressable

```tsx
import { TouchableOpacity, Pressable, Text } from "react-native";

// TouchableOpacity - reduces opacity on press
<TouchableOpacity
  onPress={() => console.log('pressed')}
  activeOpacity={0.7}
>
  <Text>Press Me</Text>
</TouchableOpacity>

// Pressable - more control via style function
<Pressable
  onPress={() => console.log('pressed')}
  style={({ pressed }) => [
    { opacity: pressed ? 0.5 : 1 }
  ]}
>
  <Text>Press Me</Text>
</Pressable>
```

**When to use which?**

- `TouchableOpacity`: Simple buttons with fade effect
- `Pressable`: Complex interactions, press states, hover (on web)

### FlatList for Lists

```tsx
import { FlatList, View, Text } from "react-native";

type Movie = { id: string; title: string };

const movies: Movie[] = [
  { id: "1", title: "Inception" },
  { id: "2", title: "Interstellar" },
];

<FlatList
  data={movies}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <View>
      <Text>{item.title}</Text>
    </View>
  )}
  // Performance optimizations
  initialNumToRender={10} // Render 10 items initially
  maxToRenderPerBatch={10} // Render 10 more per scroll batch
  windowSize={5} // Render 5 screens worth of content
/>;
```

**Why not `.map()`?**
`FlatList` virtualizes rendering - only visible items are in memory. For 1000 movies, only ~20 might be rendered at a time. This is crucial for mobile performance.

---

## 5. File-Based Routing with Expo Router

Expo Router uses your file system to define routes, similar to Next.js.

### Route Types

```
app/
├── _layout.tsx        # Layout component (wraps children)
├── index.tsx          # / (root route)
├── about.tsx          # /about
├── (tabs)/            # Route group (parentheses = no URL segment)
│   ├── _layout.tsx    # Tab navigator layout
│   ├── index.tsx      # / (default tab)
│   ├── search/
│   │   └── index.tsx  # /search
│   └── profile/
│       └── index.tsx  # /profile
└── movies/
    └── [id].tsx       # /movies/:id (dynamic route)
```

### Layout Files (`_layout.tsx`)

Layouts wrap their children routes and persist between navigations.

**Root Layout** (`app/_layout.tsx`):

```tsx
import { Stack } from "expo-router";
import "../global.css"; // Import Tailwind CSS
import "react-native-reanimated"; // Required for animations

export default function RootLayout() {
  return (
    <Stack>
      {/* Define stack screens */}
      <Stack.Screen
        name="(tabs)" // Matches (tabs) folder
        options={{ headerShown: false }} // Hide header for tabs
      />
      <Stack.Screen
        name="movies/[id]" // Dynamic route
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
```

**🔑 The `Stack` Component**: Creates a stack navigator (screens slide in from right). This is the most common pattern for mobile apps.

### Route Groups `(parentheses)`

The `(tabs)` folder creates a **route group**:

- Groups routes without affecting the URL
- `/search` not `/(tabs)/search`
- Useful for organizing different navigation patterns

### Dynamic Routes `[brackets]`

```tsx
// app/movies/[id].tsx

import { useLocalSearchParams } from "expo-router";
import { View, Text } from "react-native";

export default function MovieDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View>
      <Text>Movie ID: {id}</Text>
    </View>
  );
}
```

**`useLocalSearchParams`**: Retrieves URL parameters. For route `/movies/123`, `id` = `"123"`.

### Navigation

```tsx
import { Link, router } from "expo-router";
import { Pressable, Text } from "react-native";

// Declarative navigation (like <a href>)
<Link href="/movies/123">
  <Text>Go to Movie</Text>
</Link>

// Programmatic navigation
<Pressable onPress={() => router.push('/movies/123')}>
  <Text>Go to Movie</Text>
</Pressable>

// With typed routes (when typedRoutes: true in app.json)
router.push({
  pathname: '/movies/[id]',
  params: { id: '123' }
});

// Go back
router.back();

// Replace current screen (no back)
router.replace('/home');
```

---

## 6. Styling with NativeWind

NativeWind brings Tailwind CSS to React Native. It compiles Tailwind classes to React Native styles at build time.

### Setup (Already Done in MovieAR)

The configuration requires:

1. `tailwind.config.js` with NativeWind preset
2. `global.css` with Tailwind directives
3. Metro config with NativeWind wrapper
4. Babel config with NativeWind preset
5. TypeScript types for className prop

### Using Classes

```tsx
import { View, Text } from "react-native";

export default function Home() {
  return (
    <View className="flex-1 justify-center items-center bg-primary">
      <Text className="text-white text-2xl font-bold">Hello MovieAR</Text>
    </View>
  );
}
```

**How It Works**:

1. NativeWind's Babel plugin transforms `className` strings
2. Classes are converted to React Native StyleSheet objects
3. At runtime, styles are applied via the `style` prop internally

### Custom Theme Colors

From MovieAR's `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: '#030014',      // Use as: bg-primary, text-primary
      secondary: '#151312',    // Use as: bg-secondary
      accent: '#AB8BFF',       // Use as: text-accent
      light: {
        100: '#D6C6FF',        // Use as: text-light-100
        200: '#A8B5DB',
        300: '#9CA4AB',
      },
      dark: {
        100: '#221F3D',        // Use as: bg-dark-100
        200: '#0F023D',
      }
    }
  }
}
```

### React Native-Specific Classes

Some Tailwind classes have different meanings or are unavailable:

```tsx
// ✅ Works the same
"flex-1"; // flex: 1 (fills available space)
"p-4"; // padding: 16
"mt-2"; // marginTop: 8
"rounded-lg"; // borderRadius: 8
"opacity-50"; // opacity: 0.5

// ⚠️ Different behavior
"flex-row"; // Web: rarely needed. RN: crucial! Default is column
"gap-4"; // Supported in RN 0.71+

// ❌ Not available
"grid"; // No CSS Grid in RN
"hover:bg-gray-100"; // No hover (except web platform)
"cursor-pointer"; // No cursor
"transition-all"; // Use react-native-reanimated instead
```

### Mixing with Inline Styles

```tsx
<View
  className="flex-1 bg-primary"
  style={{ paddingTop: 50 }}  // For dynamic values
>
```

NativeWind merges `className` styles with inline `style` prop.

---

## 7. Navigation Patterns

### Tab Navigation

MovieAR uses a custom tab bar. Let's break down the implementation:

```tsx
// app/(tabs)/_layout.tsx

import { Tabs } from "expo-router";
import { Image, Text, View } from "react-native";

// Custom tab icon component
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
      {/* Animated highlight background */}
      {focused && (
        <View
          className="absolute inset-0 mx-4 rounded-full"
          style={{ backgroundColor: "#246BFD", height: 40 }}
        />
      )}

      {/* Icon and label */}
      <View className="flex-row items-center justify-center px-3 py-2">
        <Image
          source={icon}
          className="w-6 h-6"
          tintColor={focused ? "#FFFFFF" : "#A8B5DB"} // ← RN-specific prop
          resizeMode="contain"
        />
        {focused && (
          <Text className="text-white font-semibold text-sm ml-2">
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
        tabBarShowLabel: false, // Hide default labels
        tabBarStyle: {
          backgroundColor: "#0f0D23",
          borderRadius: 50,
          marginHorizontal: 20,
          marginBottom: 36,
          height: 72,
          position: "absolute", // Float above content
          overflow: "hidden",
          borderTopWidth: 0, // Remove default border
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
      {/* ... more tabs */}
    </Tabs>
  );
}
```

**🔑 Key Concepts**:

**`tintColor`**: React Native-specific prop that colorizes an image (only works with template images that have transparency).

**`position: "absolute"`**: Creates a floating tab bar that overlays content. Remember to add bottom padding to your screens!

**`tabBarIcon`**: Receives a `{ focused, color, size }` object. We only use `focused` here.

### Stack Navigation Options

```tsx
<Stack.Screen
  name="movies/[id]"
  options={{
    headerShown: true, // Show/hide header
    headerTitle: "Movie Details", // Custom title
    headerBackTitle: "Back", // iOS back button text
    headerTransparent: true, // Transparent header
    headerBlurEffect: "dark", // iOS blur effect
    animation: "slide_from_right", // Transition animation
    presentation: "modal", // Present as modal
    gestureEnabled: true, // Enable swipe back
  }}
/>
```

### Dynamic Screen Options

```tsx
// Set options from within the screen component
import { Stack } from "expo-router";

export default function MovieDetails() {
  const { id } = useLocalSearchParams();

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: `Movie ${id}`,
        }}
      />
      <View>...</View>
    </>
  );
}
```

---

## 8. Working with Images and Assets

### Creating the Constants Pattern

MovieAR uses a `constants` folder to centralize asset imports:

```tsx
// constants/icons.ts

import home from "@assets/icons/home.png";
import search from "@assets/icons/search.png";
import save from "@assets/icons/save.png";
import person from "@assets/icons/person.png";

export const icons = {
  home,
  search,
  save,
  person,
};
```

```tsx
// constants/images.ts

import logo from "@assets/images/logo.png";
import splash from "@assets/images/splash-icon.png";
import poster from "@assets/images/poster-placeholder.png";

export const images = {
  logo,
  splash,
  poster,
};
```

### Why This Pattern?

1. **Type Safety**: `icons.home` is typed, catches typos at compile time
2. **Bundling**: `require()` is resolved at build time, images are bundled
3. **Organization**: Single source of truth for all assets
4. **Refactoring**: Change a file path in one place

### Image Type Declarations

The `images.d.ts` file tells TypeScript how to type image imports:

```typescript
declare module "*.png" {
  const value: number; // RN images resolve to numbers (asset IDs)
  export default value;
}

declare module "*.jpg" {
  const value: number;
  export default value;
}
```

### Expo Image (Alternative)

MovieAR includes `expo-image`, a more performant image component:

```tsx
import { Image } from "expo-image";

<Image
  source={{ uri: "https://example.com/image.jpg" }}
  style={{ width: 100, height: 100 }}
  contentFit="cover" // Like resizeMode
  transition={200} // Fade-in animation
  placeholder={require("@assets/placeholder.png")} // Blurhash or image
  cachePolicy="memory-disk" // Caching strategy
/>;
```

---

## 9. Platform-Specific Code

### Platform Detection

```tsx
import { Platform, View, Text } from "react-native";

export default function MyComponent() {
  return (
    <View
      style={{
        paddingTop: Platform.OS === "ios" ? 50 : 30, // iOS has notch
      }}
    >
      <Text>Running on {Platform.OS}</Text>
    </View>
  );
}

// Platform.OS values: "ios" | "android" | "web" | "windows" | "macos"
```

### Platform-Specific Files

Create files with platform extensions:

```
components/
├── Button.tsx           # Default/web
├── Button.ios.tsx       # iOS-specific
├── Button.android.tsx   # Android-specific
```

React Native automatically picks the correct file based on platform.

### Platform.select()

```tsx
const styles = {
  container: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
      },
      android: {
        elevation: 4, // Android shadow
      },
      default: {
        boxShadow: "0 2px 4px rgba(0,0,0,0.25)", // Web
      },
    }),
  },
};
```

### Safe Area Handling

Mobile devices have notches, status bars, and home indicators. Use `SafeAreaView`:

```tsx
import { SafeAreaView } from "react-native-safe-area-context";

export default function Screen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      {/* Content is inset from device edges */}
    </SafeAreaView>
  );
}
```

---

## 10. State Management Patterns

### useState and useEffect (Same as React Web)

```tsx
import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";

type Movie = { id: number; title: string };

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    const response = await fetch("https://api.example.com/movies");
    const data = await response.json();
    setMovies(data.results);
    setLoading(false);
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#AB8BFF" />;
  }

  return (
    <View>
      {movies.map((movie) => (
        <Text key={movie.id}>{movie.title}</Text>
      ))}
    </View>
  );
}
```

### Custom Hooks Pattern

```tsx
// hooks/useMovies.ts

import { useState, useEffect } from "react";
import { fetchMovies } from "@/services/api";

export function useMovies() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMovies()
      .then(setMovies)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { movies, loading, error };
}
```

### Context for Global State

```tsx
// contexts/SavedMoviesContext.tsx

import { createContext, useContext, useState, ReactNode } from "react";

type Movie = { id: number; title: string };

type SavedMoviesContextType = {
  saved: Movie[];
  addMovie: (movie: Movie) => void;
  removeMovie: (id: number) => void;
  isSaved: (id: number) => boolean;
};

const SavedMoviesContext = createContext<SavedMoviesContextType | null>(null);

export function SavedMoviesProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Movie[]>([]);

  const addMovie = (movie: Movie) => setSaved((prev) => [...prev, movie]);

  const removeMovie = (id: number) =>
    setSaved((prev) => prev.filter((m) => m.id !== id));

  const isSaved = (id: number) => saved.some((m) => m.id === id);

  return (
    <SavedMoviesContext.Provider
      value={{ saved, addMovie, removeMovie, isSaved }}
    >
      {children}
    </SavedMoviesContext.Provider>
  );
}

export function useSavedMovies() {
  const context = useContext(SavedMoviesContext);
  if (!context) throw new Error("useSavedMovies must be within provider");
  return context;
}
```

Usage in layout:

```tsx
// app/_layout.tsx

import { SavedMoviesProvider } from "@/contexts/SavedMoviesContext";

export default function RootLayout() {
  return (
    <SavedMoviesProvider>
      <Stack>...</Stack>
    </SavedMoviesProvider>
  );
}
```

---

## 11. API Integration

### Basic Fetch Pattern

```tsx
// services/api.ts

const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

export async function fetchTrendingMovies() {
  const response = await fetch(
    `${BASE_URL}/trending/movie/week?api_key=${API_KEY}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch movies");
  }

  return response.json();
}

export async function searchMovies(query: string) {
  const response = await fetch(
    `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`,
  );

  return response.json();
}
```

### Environment Variables

In Expo, environment variables must be prefixed with `EXPO_PUBLIC_`:

```bash
# .env.local
EXPO_PUBLIC_TMDB_API_KEY=your_api_key_here
```

```tsx
// Access in code
const apiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;
```

### Data Fetching with Error Handling

```tsx
import { useState, useEffect } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { fetchTrendingMovies } from "@/services/api";

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMovies();
  }, []);

  async function loadMovies() {
    try {
      setLoading(true);
      const data = await fetchTrendingMovies();
      setMovies(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-primary">
        <ActivityIndicator size="large" color="#AB8BFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-primary">
        <Text className="text-red-500">{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={movies}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <MovieCard movie={item} />}
    />
  );
}
```

---

## 12. Building & Deployment

### Development

```bash
# Start development server
npx expo start

# Platform-specific
npx expo start --android
npx expo start --ios
npx expo start --web
```

### Building with EAS Build

Install EAS CLI:

```bash
npm install -g eas-cli
eas login
```

Configure:

```bash
eas build:configure
```

Build:

```bash
# Development build (for testing)
eas build --profile development --platform android

# Preview build (for testers)
eas build --profile preview --platform all

# Production build (for stores)
eas build --profile production --platform all
```

### Over-The-Air Updates

Push JavaScript updates without app store review:

```bash
eas update --branch production --message "Bug fixes"
```

---

## Quick Reference

### Event Handlers

| Web            | React Native                              |
| -------------- | ----------------------------------------- |
| `onClick`      | `onPress`                                 |
| `onChange`     | `onChangeText` (for TextInput value)      |
| `onSubmit`     | `onSubmitEditing`                         |
| `onKeyDown`    | `onKeyPress`                              |
| `onMouseEnter` | N/A (use Pressable's `onHoverIn` for web) |

### Common Gotchas

1. **No CSS inheritance**: Child `<Text>` doesn't inherit parent's styles
2. **Image dimensions required**: Always specify width/height
3. **Flex default is column**: Use `flex-row` for horizontal layout
4. **No z-index by default**: Use `zIndex` style or render order
5. **Text must be in `<Text>`**: Will crash otherwise

### Useful Imports Cheat Sheet

```tsx
// Core components
import {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";

// Navigation
import { Stack, Tabs, Link, router, useLocalSearchParams } from "expo-router";

// Safe areas
import { SafeAreaView } from "react-native-safe-area-context";

// Status bar
import { StatusBar } from "expo-status-bar";

// Icons
import { Ionicons } from "@expo/vector-icons";
```

---

## Next Steps for MovieAR

1. **Create missing folders**: `constants/`, `assets/images/`, `assets/icons/`
2. **Add app icons**: 1024x1024 for iOS, adaptive icons for Android
3. **Implement Home**: Movie grid with TMDB API
4. **Add Search**: TextInput + results
5. **Movie Details**: Full screen with poster, description, ratings
6. **Save feature**: AsyncStorage or SQLite for persistence
7. **Animations**: react-native-reanimated for smooth transitions
