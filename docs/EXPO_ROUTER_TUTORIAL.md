# Expo Router Deep Dive

### File-Based Navigation for MovieAR

This document provides an in-depth explanation of Expo Router, the navigation system used in MovieAR.

---

## How File-Based Routing Works

Expo Router maps your file system directly to navigation routes. Think of it like Next.js for React Native.

```
📁 app/                          URL Path
├── 📄 _layout.tsx              (Layout wrapper)
├── 📄 index.tsx                /
├── 📄 about.tsx                /about
├── 📁 movies/
│   ├── 📄 index.tsx            /movies
│   └── 📄 [id].tsx             /movies/:id
└── 📁 (tabs)/                  (Route group - no URL segment)
    ├── 📄 _layout.tsx          (Tab navigator)
    ├── 📄 index.tsx            /
    ├── 📁 search/
    │   └── 📄 index.tsx        /search
    └── 📁 profile/
        └── 📄 index.tsx        /profile
```

---

## Understanding `_layout.tsx` Files

Layout files are **special wrapper components** that:

1. Wrap all sibling and child routes
2. Persist between navigations within that layout
3. Define the navigation structure (Stack, Tabs, Drawer)

### Root Layout (`app/_layout.tsx`)

```tsx
import { Stack } from "expo-router";
import "../global.css";
import "react-native-reanimated";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="movies/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
```

**Line-by-line breakdown:**

| Line                               | Explanation                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `import { Stack }`                 | The `Stack` component creates a stack navigator where screens slide on/off from the right |
| `import "../global.css"`           | Imports Tailwind CSS. This MUST be in the root layout so styles are available everywhere  |
| `import "react-native-reanimated"` | Required import for animated transitions. Must be imported before any screens             |
| `<Stack>`                          | Creates the main navigation container                                                     |
| `name="(tabs)"`                    | References the `(tabs)` folder. The parentheses mean it's a route group                   |
| `name="movies/[id]"`               | Defines a dynamic route. Must match the folder/file path exactly                          |
| `headerShown: false`               | Hides the navigation header for this screen                                               |

### Key Insight: Route Names

The `name` prop in `Stack.Screen` must match:

- **Folder name**: `(tabs)` → `name="(tabs)"`
- **File path**: `movies/[id].tsx` → `name="movies/[id]"`

---

## Tabs Layout (`app/(tabs)/_layout.tsx`)

The tabs layout creates bottom navigation:

```tsx
import { icons } from "@/constants/icons";
import { Tabs } from "expo-router";
import { Image, Text, View } from "react-native";
```

### The `TabIcon` Component

This is a custom component for rendering tab icons:

```tsx
const TabIcon = ({
  focused, // Boolean: is this tab currently active?
  icon, // Image source for the icon
  title, // Label text
}: {
  focused: boolean;
  icon: any;
  title: string;
}) => {
  return (
    <View className="items-center justify-center gap-1 min-h-[60px] flex-1">
      {/* Pill-shaped background when focused */}
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
          tintColor={focused ? "#FFFFFF" : "#A8B5DB"}
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
```

**Understanding `tintColor`:**

This is a React Native-specific prop that colorizes images. It works by replacing non-transparent pixels with the specified color. The icons must be:

- PNG format with transparency
- Monochrome (single color with transparent background)

### The Tabs Component

```tsx
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,           // Hide default text labels
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#A8B5DB",
        tabBarStyle: {
          backgroundColor: "#0f0D23",
          borderRadius: 50,               // Pill shape
          marginHorizontal: 20,
          marginBottom: 36,
          height: 72,
          position: "absolute",           // Float above content
          overflow: "hidden",
          borderTopWidth: 0,              // Remove default border
          elevation: 0,                   // Remove Android shadow
          shadowOpacity: 0,               // Remove iOS shadow
        },
        tabBarItemStyle: {
          padding: 0,
          margin: 0,
        },
      }}
    >
```

**`screenOptions` explained:**

| Property                            | Purpose                                                 |
| ----------------------------------- | ------------------------------------------------------- |
| `tabBarShowLabel: false`            | We use custom labels inside `TabIcon`, so hide defaults |
| `tabBarStyle`                       | Style the entire tab bar container                      |
| `position: "absolute"`              | Makes the tab bar float over content                    |
| `borderRadius: 50`                  | Creates the pill/rounded rectangle shape                |
| `elevation: 0` / `shadowOpacity: 0` | Removes default shadows                                 |

### Defining Tab Screens

```tsx
<Tabs.Screen
  name="index"                    // Matches index.tsx in (tabs) folder
  options={{
    title: "Home",
    headerShown: false,
    tabBarIcon: ({ focused }) => (
      <TabIcon focused={focused} icon={icons.home} title="home" />
    ),
  }}
/>

<Tabs.Screen
  name="search/index"             // Matches search/index.tsx
  options={{
    title: "Search",
    headerShown: false,
    tabBarIcon: ({ focused }) => (
      <TabIcon focused={focused} icon={icons.search} title="search" />
    ),
  }}
/>
```

**Route name patterns:**

| File Path                  | Route Name      |
| -------------------------- | --------------- |
| `(tabs)/index.tsx`         | `index`         |
| `(tabs)/search/index.tsx`  | `search/index`  |
| `(tabs)/profile/index.tsx` | `profile/index` |

---

## Dynamic Routes with `[brackets]`

The `movies/[id].tsx` file creates a dynamic route that captures URL parameters.

```tsx
// app/movies/[id].tsx

import { useLocalSearchParams } from "expo-router";
import { View, Text } from "react-native";

export default function MovieDetails() {
  // Extract the 'id' parameter from the URL
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 bg-primary items-center justify-center">
      <Text className="text-white text-xl">Movie ID: {id}</Text>
    </View>
  );
}
```

### `useLocalSearchParams` vs `useGlobalSearchParams`

- **`useLocalSearchParams`**: Only gets params from the current route segment
- **`useGlobalSearchParams`**: Gets params from all route segments

```tsx
// For route: /movies/123?category=action

const local = useLocalSearchParams(); // { id: "123" }
const global = useGlobalSearchParams(); // { id: "123", category: "action" }
```

---

## Navigation Functions

### Declarative Navigation with `<Link>`

```tsx
import { Link } from "expo-router";
import { Text } from "react-native";

// Basic link
<Link href="/movies/123">
  <Text>View Movie</Text>
</Link>

// With params object (type-safe when typedRoutes is enabled)
<Link href={{
  pathname: "/movies/[id]",
  params: { id: "123" }
}}>
  <Text>View Movie</Text>
</Link>

// Replace instead of push (no back navigation)
<Link href="/home" replace>
  <Text>Go Home</Text>
</Link>
```

### Programmatic Navigation with `router`

```tsx
import { router } from "expo-router";
import { TouchableOpacity, Text } from "react-native";

// Push new screen (can go back)
<TouchableOpacity onPress={() => router.push("/movies/123")}>
  <Text>View Movie</Text>
</TouchableOpacity>;

// Replace current screen (no back)
router.replace("/home");

// Go back
router.back();

// Dismiss all modals and go to route
router.dismissAll();

// Check if can go back
if (router.canGoBack()) {
  router.back();
}
```

---

## Route Groups with `(parentheses)`

Folders wrapped in parentheses are **route groups**:

```
app/
├── (tabs)/           # Group: doesn't add to URL
│   ├── index.tsx     # URL: /
│   └── search/
│       └── index.tsx # URL: /search (NOT /(tabs)/search)
└── (auth)/           # Another group
    ├── login.tsx     # URL: /login
    └── register.tsx  # URL: /register
```

### Why Use Route Groups?

1. **Organize by feature** without affecting URLs
2. **Apply different layouts** to route groups
3. **Conditional navigation** (e.g., show tabs only when logged in)

---

## Screen Options

### Static Options (in Layout)

```tsx
<Stack.Screen
  name="movies/[id]"
  options={{
    // Header
    headerShown: true,
    title: "Movie Details",
    headerBackTitle: "Back",
    headerTitleAlign: "center",
    headerTransparent: true,
    headerBlurEffect: "dark", // iOS only

    // Presentation
    presentation: "modal", // "card" | "modal" | "transparentModal"
    animation: "slide_from_right", // Transition animation

    // Gestures
    gestureEnabled: true,
    fullScreenGestureEnabled: true, // iOS: swipe from anywhere

    // Status bar
    statusBarStyle: "light",
    statusBarAnimation: "fade",
  }}
/>
```

### Dynamic Options (from Screen)

Set options dynamically from within the screen component:

```tsx
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

export default function MovieDetails() {
  const { id } = useLocalSearchParams();
  const [movie, setMovie] = useState(null);

  useEffect(() => {
    // Fetch movie data...
  }, [id]);

  return (
    <>
      {/* Set header title dynamically */}
      <Stack.Screen
        options={{
          title: movie?.title ?? "Loading...",
        }}
      />
      <View>...</View>
    </>
  );
}
```

---

## Error Handling

### Error Boundary

Create a custom error screen:

```tsx
// app/+error.tsx

import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";

export default function ErrorScreen({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center bg-primary">
      <Text className="text-white text-xl mb-4">Something went wrong</Text>
      <Text className="text-light-300 mb-8">{error.message}</Text>
      <TouchableOpacity onPress={retry}>
        <Text className="text-accent">Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Not Found Screen

```tsx
// app/+not-found.tsx

import { View, Text } from "react-native";
import { Link } from "expo-router";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-primary">
      <Text className="text-white text-xl mb-4">Page Not Found</Text>
      <Link href="/">
        <Text className="text-accent">Go Home</Text>
      </Link>
    </View>
  );
}
```

---

## Typed Routes

With `typedRoutes: true` in `app.json`, you get type-safe navigation:

```tsx
import { Link, router } from "expo-router";

// TypeScript will autocomplete and validate routes
<Link href="/movies/123" />        // ✅ Valid
<Link href="/nonexistent" />       // ❌ Type error

// Also works with router
router.push("/movies/123");        // ✅ Valid
router.push("/invalid-route");     // ❌ Type error
```

**Generated types are in:** `.expo/types/router.d.ts`

---

## Best Practices

1. **Keep layouts minimal**: Only navigation configuration, not business logic
2. **Use route groups**: Organize by feature (`(auth)`, `(main)`, `(settings)`)
3. **Enable typed routes**: Catch navigation errors at compile time
4. **Handle loading states**: Users expect feedback during navigation
5. **Test deep links**: Ensure `moviear://movies/123` opens correctly
