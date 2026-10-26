# MovieAR Project Corrections

This document outlines all corrections needed based on the project analysis. Issues are prioritized by severity.

---

## 🔴 Critical Issues (App Will Crash/Fail to Build)

### 1. Missing App Icons Referenced in `app.json`

**Location:** [app.json](file:///c:/moviear/app.json)

**Problem:** The `app.json` configuration references icon files that don't exist in `assets/images/`:

| Required File                 | Status     |
| ----------------------------- | ---------- |
| `icon.png`                    | ❌ Missing |
| `android-icon-foreground.png` | ❌ Missing |
| `android-icon-background.png` | ❌ Missing |
| `android-icon-monochrome.png` | ❌ Missing |
| `favicon.png`                 | ❌ Missing |
| `splash-icon.png`             | ❌ Missing |

**Current files in `assets/images/`:** `bg.png`, `highlight.png`, `logo.png`, `rankingGradient.png`

**Fix:**

1. Create or obtain the following icon assets:
   - `icon.png` - 1024x1024px app icon
   - `splash-icon.png` - Splash screen icon
   - `favicon.png` - Web favicon (32x32 or 16x16)
   - Android adaptive icons (foreground, background, monochrome)

2. **Or** update `app.json` to use existing `logo.png`:

```diff
- "icon": "./assets/images/icon.png",
+ "icon": "./assets/images/logo.png",
```

> [!CAUTION]
> The app will fail to build for production without valid icon paths.

---

## 🟡 Code Quality Issues

### 2. Unused Import in Tab Layout

**Location:** [app/(tabs)/\_layout.tsx](<file:///c:/moviear/app/(tabs)/_layout.tsx>) - Line 2

**Problem:** `images` is imported but never used.

```typescript
import { images } from "@/constants/images"; // ❌ Imported but never used
```

**Fix:** Remove the unused import:

```diff
  import { icons } from "@/constants/icons";
- import { images } from "@/constants/images";
  import { Tabs } from "expo-router";
```

---

### 3. Excessive Empty Lines in Saved Screen

**Location:** [app/(tabs)/saved/index.tsx](<file:///c:/moviear/app/(tabs)/saved/index.tsx>)

**Problem:** File contains 19 unnecessary empty lines (lines 14-32).

**Fix:** Remove empty lines at the end of the file:

```typescript
import { View, Text } from "react-native";

export default function Saved() {
  return (
    <View>
      <Text>Saved Page</Text>
    </View>
  );
}
```

---

## 🟢 Implementation Gaps (Not Errors, But Incomplete)

### 4. Placeholder Screens Need Implementation

All screens are currently stubs with no actual functionality or styling:

| Screen  | File                                                                   | Current Content             |
| ------- | ---------------------------------------------------------------------- | --------------------------- |
| Home    | [index.tsx](<file:///c:/moviear/app/(tabs)/index.tsx>)                 | Only "Test NativeWind" text |
| Search  | [search/index.tsx](<file:///c:/moviear/app/(tabs)/search/index.tsx>)   | Only "Search Page" text     |
| Saved   | [saved/index.tsx](<file:///c:/moviear/app/(tabs)/saved/index.tsx>)     | Only "Saved Page" text      |
| Profile | [profile/index.tsx](<file:///c:/moviear/app/(tabs)/profile/index.tsx>) | Only "Profile Page" text    |
| Details | [movies/[id].tsx](file:///c:/moviear/app/movies/[id].tsx)              | Only "Details Page" text    |

**Fix:** Implement each screen with:

- Proper styling using NativeWind classes
- Background using `bg-primary` color
- Screen-specific UI components

**Example fix for Search screen:**

```typescript
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Search() {
  return (
    <SafeAreaView className="flex-1 bg-primary">
      <View className="flex-1 px-4">
        <Text className="text-white text-2xl font-bold mt-4">
          Search Movies
        </Text>
        {/* Add search bar and results here */}
      </View>
    </SafeAreaView>
  );
}
```

---

### 5. Missing `logo.png` Export in Constants

**Location:** [constants/images.ts](file:///c:/moviear/constants/images.ts)

**Problem:** `logo.png` exists in `assets/images/` but is not exported from `constants/images.ts`.

**Fix:**

```diff
  import bg from "@/assets/images/bg.png";
  import highlight from "@/assets/images/highlight.png";
  import rankingGradient from "@/assets/images/rankingGradient.png";
+ import logo from "@/assets/images/logo.png";

  export const images = {
    bg,
    highlight,
    rankingGradient,
+   logo,
  };
```

---

### 6. Missing Recommended Architecture Folders

**Problem:** The following recommended folders from the analysis don't exist:

| Folder        | Purpose                | Priority |
| ------------- | ---------------------- | -------- |
| `components/` | Reusable UI components | High     |
| `services/`   | API integration (TMDB) | High     |
| `hooks/`      | Custom React hooks     | Medium   |
| `types/`      | ✅ Exists              | -        |
| `interfaces/` | ✅ Exists              | -        |

**Fix:** Create these folders as you build features:

```bash
mkdir components services hooks
```

---

## 📋 Correction Summary

| #   | Issue                        | Severity      | Effort |
| --- | ---------------------------- | ------------- | ------ |
| 1   | Missing app icons            | 🔴 Critical   | Medium |
| 2   | Unused import                | 🟡 Minor      | Low    |
| 3   | Excessive empty lines        | 🟡 Minor      | Low    |
| 4   | Placeholder screens          | 🟢 Incomplete | High   |
| 5   | Missing logo export          | 🟡 Minor      | Low    |
| 6   | Missing architecture folders | 🟢 Incomplete | Low    |

---

## Quick Fix Commands

```bash
# Fix #2 & #3: Use your IDE's "Organize Imports" and "Format Document" features

# Fix #6: Create missing folders
cd c:\moviear
mkdir components services hooks
```

---

## Next Steps After Corrections

1. ✅ Fix critical icon issues first
2. ✅ Clean up code quality issues
3. 🚀 Start implementing Home screen with movie list
4. 🚀 Add TMDB API integration in `services/api.ts`
5. 🚀 Create reusable `MovieCard` component
