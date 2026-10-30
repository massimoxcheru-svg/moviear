# MovieAr

A mobile app for discovering movies. Browse what's trending, search the TMDB catalogue, open a movie to see its details, and save the ones you want to watch later.

Built for my own use as a lightweight watch list, and as the project I use to learn and practise React Native. It runs on Android, iOS and the web from one codebase.

## Status

Early development. The tab navigation, theme and screen scaffolding are in place. The TMDB data layer, movie lists, search and saved movies are the next pieces of work. See [ROADMAP.md](ROADMAP.md) for what's planned.

## Built with

- [Expo](https://expo.dev) SDK 54 and [Expo Router](https://docs.expo.dev/router/introduction) for navigation
- React Native 0.81, React 19, TypeScript
- [NativeWind](https://www.nativewind.dev) (Tailwind CSS for React Native)
- [TMDB](https://www.themoviedb.org) as the movie data source

## Run it

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file from the example and add your own TMDB API key:

   ```bash
   cp .env.example .env
   ```

3. Start the dev server:

   ```bash
   npx expo start
   ```

   Then press `a` for an Android emulator, `i` for the iOS simulator, `w` for the web, or scan the QR code with Expo Go.

Other scripts: `npm run lint` runs ESLint.

## Project layout

```
app/            screens (expo-router): tabs, movie details
  (tabs)/       home, search, saved, profile
  movies/[id]   movie details
components/     shared UI components
constants/      icon and image registries
hooks/          hooks for loading data
services/       TMDB API client
interfaces/     TypeScript types for API data
assets/         icons, images, fonts
```

## License

[MIT](LICENSE)
