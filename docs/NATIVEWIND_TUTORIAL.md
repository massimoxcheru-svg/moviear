# NativeWind & Styling Deep Dive

### Tailwind CSS for React Native in MovieAR

This tutorial covers everything you need to know about styling React Native apps using NativeWind.

---

## What is NativeWind?

NativeWind brings Tailwind CSS to React Native. It compiles Tailwind utility classes into React Native `StyleSheet` objects at build time.

```tsx
// This Tailwind class...
<View className="flex-1 bg-primary p-4" />

// ...compiles to this StyleSheet:
<View style={{
  flex: 1,
  backgroundColor: '#030014',
  padding: 16,
}} />
```

---

## How NativeWind Works (Under the Hood)

### 1. Build-Time Processing

```
┌─────────────────────────────────────────────────────┐
│ Your Code                                           │
│ <View className="flex-1 bg-primary p-4" />          │
└─────────────────────────────────────────────────────┘
                         │
                         │ Babel + Metro
                         ▼
┌─────────────────────────────────────────────────────┐
│ Compiled Output                                     │
│ <View style={StyleSheet.create({ flex: 1, ... })} />│
└─────────────────────────────────────────────────────┘
```

### 2. Configuration Files

**`tailwind.config.js`**:

```javascript
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}", // Scan app folder
    "./components/**/*.{js,jsx,ts,tsx}", // Scan components
  ],
  presets: [require("nativewind/preset")], // NativeWind preset
  theme: {
    extend: {
      colors: {
        primary: "#030014", // Custom colors
      },
    },
  },
  plugins: [],
};
```

**`babel.config.js`**:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

**`metro.config.js`**:

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

**`global.css`**:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## MovieAR's Custom Theme

The project defines a dark theme with purple accents:

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: '#030014',      // Almost black - main background
      secondary: '#151312',    // Dark brown - cards, modals
      accent: '#AB8BFF',       // Purple - buttons, links, CTAs
      light: {
        100: '#D6C6FF',        // Light purple - highlights
        200: '#A8B5DB',        // Muted blue - secondary text
        300: '#9CA4AB',        // Gray - tertiary text
      },
      dark: {
        100: '#221F3D',        // Dark purple - overlays
        200: '#0F023D',        // Deep purple - gradient ends
      }
    }
  }
}
```

### Using Custom Colors

```tsx
<View className="bg-primary">
  {" "}
  {/* Background: #030014 */}
  <Text className="text-accent">
    {" "}
    {/* Text: #AB8BFF */}
    Movie Title
  </Text>
  <Text className="text-light-200">
    {" "}
    {/* Text: #A8B5DB */}
    Secondary info
  </Text>
</View>
```

---

## Flexbox in React Native vs Web

### The Critical Difference

| Property        | Web Default | React Native Default |
| --------------- | ----------- | -------------------- |
| `flexDirection` | `row`       | `column`             |
| `display`       | `block`     | `flex`               |

**This means in React Native, children stack vertically by default!**

```tsx
// React Native: Children stack vertically (column)
<View>
  <View />  {/* ↓ */}
  <View />  {/* ↓ */}
</View>

// To make horizontal, you MUST add flex-row
<View className="flex-row">
  <View />  {/* → */}
  <View />  {/* → */}
</View>
```

### Common Flexbox Classes

```tsx
// Container behavior
"flex-1"; // flex: 1 (take all available space)
"flex-row"; // flexDirection: 'row' (horizontal)
"flex-col"; // flexDirection: 'column' (vertical, default)
"flex-wrap"; // Allow wrapping

// Alignment
"items-center"; // alignItems: 'center' (cross-axis)
"items-start"; // alignItems: 'flex-start'
"items-end"; // alignItems: 'flex-end'

"justify-center"; // justifyContent: 'center' (main-axis)
"justify-between"; // justifyContent: 'space-between'
"justify-start"; // justifyContent: 'flex-start'

"self-center"; // alignSelf: 'center'

// Gap (React Native 0.71+)
"gap-4"; // gap: 16 (both row and column)
"gap-x-4"; // columnGap: 16
"gap-y-2"; // rowGap: 8
```

### Centering Content

```tsx
// Perfectly centered
<View className="flex-1 justify-center items-center">
  <Text>Centered!</Text>
</View>
```

---

## Spacing & Sizing

### Padding & Margin

```tsx
"p-4"; // padding: 16        (all sides)
"px-4"; // paddingHorizontal: 16
"py-4"; // paddingVertical: 16
"pt-4"; // paddingTop: 16
"pb-4"; // paddingBottom: 16
"pl-4"; // paddingLeft: 16
"pr-4"; // paddingRight: 16

"m-4"; // margin: 16         (all sides)
"mx-4"; // marginHorizontal: 16
"my-4"; // marginVertical: 16
"mt-4"; // marginTop: 16
// ... same pattern as padding

"-m-4"; // Negative margin: -16
```

### Size Scale

The default scale multiplies by 4:

| Class  | Value |
| ------ | ----- |
| `p-0`  | 0     |
| `p-1`  | 4     |
| `p-2`  | 8     |
| `p-3`  | 12    |
| `p-4`  | 16    |
| `p-5`  | 20    |
| `p-6`  | 24    |
| `p-8`  | 32    |
| `p-10` | 40    |

### Width & Height

```tsx
"w-full"; // width: '100%'
"w-1/2"; // width: '50%'
"w-1/3"; // width: '33.333%'
"w-screen"; // width: Dimensions.get('window').width
"w-[200px]"; // width: 200 (arbitrary value)

"h-full"; // height: '100%'
"h-screen"; // height: Dimensions.get('window').height
"h-[100px]"; // height: 100

"min-h-[60px]"; // minHeight: 60
"max-w-[300px]"; // maxWidth: 300
```

---

## Typography

### Font Sizes

```tsx
"text-xs"; // fontSize: 12
"text-sm"; // fontSize: 14
"text-base"; // fontSize: 16
"text-lg"; // fontSize: 18
"text-xl"; // fontSize: 20
"text-2xl"; // fontSize: 24
"text-3xl"; // fontSize: 30
"text-4xl"; // fontSize: 36
"text-5xl"; // fontSize: 48
```

### Font Weight

```tsx
"font-thin"; // fontWeight: '100'
"font-light"; // fontWeight: '300'
"font-normal"; // fontWeight: '400'
"font-medium"; // fontWeight: '500'
"font-semibold"; // fontWeight: '600'
"font-bold"; // fontWeight: '700'
"font-extrabold"; // fontWeight: '800'
```

### Text Color

```tsx
"text-white"; // color: '#fff'
"text-black"; // color: '#000'
"text-gray-500"; // color: '#6B7280'
"text-accent"; // color: '#AB8BFF' (custom)
"text-light-200"; // color: '#A8B5DB' (custom)
```

### Text Alignment

```tsx
"text-left"; // textAlign: 'left'
"text-center"; // textAlign: 'center'
"text-right"; // textAlign: 'right'
```

**⚠️ Important**: These must be on `<Text>`, not `<View>`!

```tsx
// ❌ WRONG - Has no effect
<View className="text-center">...</View>

// ✅ CORRECT
<Text className="text-center">Centered text</Text>
```

---

## Borders & Rounded Corners

```tsx
// Border radius
"rounded"; // borderRadius: 4
"rounded-lg"; // borderRadius: 8
"rounded-xl"; // borderRadius: 12
"rounded-2xl"; // borderRadius: 16
"rounded-full"; // borderRadius: 9999 (pill shape)
"rounded-none"; // borderRadius: 0

// Individual corners
"rounded-t-lg"; // Top corners only
"rounded-b-lg"; // Bottom corners only
"rounded-l-lg"; // Left corners only
"rounded-r-lg"; // Right corners only

// Border width
"border"; // borderWidth: 1
"border-2"; // borderWidth: 2
"border-4"; // borderWidth: 4

// Border color
"border-white"; // borderColor: '#fff'
"border-accent"; // borderColor: '#AB8BFF'
```

---

## What Doesn't Work in React Native

### No CSS Grid

```tsx
// ❌ NOT AVAILABLE
"grid"
"grid-cols-2"
"col-span-2"

// ✅ Use Flexbox instead
<View className="flex-row flex-wrap">
  <View className="w-1/2" />
  <View className="w-1/2" />
</View>
```

### No Hover States (except web)

```tsx
// ❌ Ignored on mobile (works on web only)
"hover:bg-gray-100"

// ✅ Use Pressable for press states
<Pressable
  style={({ pressed }) => ({
    opacity: pressed ? 0.5 : 1
  })}
>
  ...
</Pressable>
```

### No Transitions/Animations

```tsx
// ❌ Does not work
"transition-all";
"duration-300";
"animate-spin";

// ✅ Use react-native-reanimated
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

<Animated.View entering={FadeIn} exiting={FadeOut}>
  ...
</Animated.View>;
```

### No Box Shadow (use platform-specific)

```tsx
// ❌ Doesn't work
"shadow-lg"

// ✅ Platform-specific shadows
<View
  style={Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    android: {
      elevation: 5,
    },
  })}
/>
```

---

## Combining NativeWind with Inline Styles

NativeWind classes merge with the `style` prop:

```tsx
<View
  className="flex-1 bg-primary"
  style={{
    paddingTop: Platform.OS === 'ios' ? 50 : 30
  }}
>
```

### Priority

`style` prop values override `className` values for the same property:

```tsx
<View
  className="p-4" // padding: 16
  style={{ padding: 32 }} // padding: 32 (wins)
/>
```

---

## Arbitrary Values with `[brackets]`

Use square brackets for values not in the default scale:

```tsx
"p-[17px]"; // padding: 17
"w-[200px]"; // width: 200
"h-[50%]"; // height: '50%'
"bg-[#FF5733]"; // backgroundColor: '#FF5733'
"text-[22px]"; // fontSize: 22
"rounded-[15px]"; // borderRadius: 15
"top-[10px]"; // top: 10
"min-h-[60px]"; // minHeight: 60
```

---

## Practical Examples from MovieAR

### TabIcon Component

```tsx
const TabIcon = ({ focused, icon, title }) => {
  return (
    <View className="items-center justify-center gap-1 min-h-[60px] flex-1">
      {/* Conditional highlight background */}
      {focused && (
        <View
          className="absolute inset-0 mx-4 rounded-full"
          style={{ backgroundColor: "#246BFD", height: 40 }}
        />
      )}

      <View className="flex-row items-center justify-center px-3 py-2">
        <Image
          source={icon}
          className="w-6 h-6"
          tintColor={focused ? "#FFFFFF" : "#A8B5DB"}
          resizeMode="contain"
        />
        {focused && (
          <Text className="text-white font-semibold text-sm ml-2">{title}</Text>
        )}
      </View>
    </View>
  );
};
```

**Class breakdown:**

| Class                         | Purpose                           |
| ----------------------------- | --------------------------------- |
| `items-center justify-center` | Center children both axes         |
| `gap-1`                       | 4px gap between children          |
| `min-h-[60px]`                | Minimum height for tap target     |
| `flex-1`                      | Fill available tab bar space      |
| `absolute inset-0`            | Position to fill parent           |
| `mx-4`                        | Horizontal margin for pill        |
| `rounded-full`                | Perfect pill shape                |
| `flex-row`                    | Horizontal layout for icon + text |
| `px-3 py-2`                   | Padding inside container          |
| `w-6 h-6`                     | 24x24 icon size                   |
| `ml-2`                        | Left margin before text           |

### Movie Card (Example)

```tsx
const MovieCard = ({ movie }) => (
  <TouchableOpacity
    className="w-[150px] mr-4"
    onPress={() => router.push(`/movies/${movie.id}`)}
  >
    <Image
      source={{ uri: movie.poster_path }}
      className="w-full h-[225px] rounded-xl"
      resizeMode="cover"
    />
    <Text className="text-white font-medium mt-2" numberOfLines={1}>
      {movie.title}
    </Text>
    <Text className="text-light-300 text-sm">
      ⭐ {movie.vote_average.toFixed(1)}
    </Text>
  </TouchableOpacity>
);
```

---

## Debugging Tips

### 1. Check Output CSS

The compiled CSS is in `output.css`. Search for your class to verify it exists:

```css
/* output.css */
.bg-primary {
  background-color: #030014;
}
```

### 2. Verify Content Paths

If classes don't work, check `tailwind.config.js`:

```javascript
content: [
  "./app/**/*.{js,jsx,ts,tsx}", // Make sure paths match your files
  "./components/**/*.{js,jsx,ts,tsx}",
];
```

### 3. Clear Cache

```bash
npx expo start --clear
```

### 4. Check Class Names

Common typos:

- `bg-white` ✅ vs `bgcolor-white` ❌
- `justify-center` ✅ vs `justify-content-center` ❌
- `rounded-lg` ✅ vs `border-radius-lg` ❌

---

## Quick Reference Card

```
╔══════════════════════════════════════════════════════════════╗
║ LAYOUT                    ║ TYPOGRAPHY                       ║
╠═══════════════════════════╬══════════════════════════════════╣
║ flex-1        fill space  ║ text-xl      fontSize: 20        ║
║ flex-row      horizontal  ║ text-white   color: white        ║
║ items-center  align mid   ║ font-bold    fontWeight: 700     ║
║ justify-center center     ║ text-center  textAlign: center   ║
║ gap-4         gap: 16     ║                                  ║
╠═══════════════════════════╬══════════════════════════════════╣
║ SPACING                   ║ SIZING                           ║
╠═══════════════════════════╬══════════════════════════════════╣
║ p-4           padding 16  ║ w-full       width: 100%         ║
║ m-4           margin 16   ║ h-[100px]    height: 100         ║
║ px-4          horiz 16    ║ min-h-[60px] minHeight: 60       ║
║ py-4          vert 16     ║ w-1/2        width: 50%          ║
╠═══════════════════════════╬══════════════════════════════════╣
║ POSITION                  ║ BORDERS                          ║
╠═══════════════════════════╬══════════════════════════════════╣
║ absolute      absolute    ║ rounded-lg   borderRadius: 8     ║
║ relative      relative    ║ rounded-full radius: 9999        ║
║ inset-0       all 0       ║ border-2     borderWidth: 2      ║
║ z-10          zIndex: 10  ║ border-white borderColor: #fff   ║
╚═══════════════════════════╩══════════════════════════════════╝
```
