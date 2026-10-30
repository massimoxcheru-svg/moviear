# MovieAr

A mobile app for discovering movies. Browse what's trending, search the TMDB catalogue, open a movie to see its cast, trailers and details, and save the ones you want to watch later.

Built for my own use as a lightweight watch list, and as the project I use to learn and practise React Native. It runs on Android, iOS and the web from one codebase.

## What it does

- **Home**: trending today or this week, a genre row, and an endless grid of what's now playing in your region.
- **Search**: debounced title search with paging.
- **Movie details**: poster, rating, runtime, genres, director, overview, top cast, YouTube trailers, release and box office facts, and a row of recommendations.
- **People**: a person's photo, biography and full filmography, reached from the cast row.
- **Genres**: browse any genre sorted by popularity, rating or release date.
- **Saved**: a watchlist kept on the device.
- **Recently viewed**: the last 50 movies you opened, with a toggle to turn tracking off.
- **Profile**: trending window, region and language settings, plus actions to clear your data and the response cache.

Lists and details are cached on the device with a time to live, so the app still shows something when the network drops.

## Built with

- [Expo](https://expo.dev) SDK 54 and [Expo Router](https://docs.expo.dev/router/introduction) for navigation
- React Native 0.81, React 19, TypeScript
- [NativeWind](https://www.nativewind.dev) (Tailwind CSS for React Native)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) for the watchlist, history, settings and cache
- [TMDB](https://www.themoviedb.org) as the movie data source
- Jest with jest-expo and Testing Library for the service and hook tests

## Run it

1. Install dependencies:

   ```bash
   npm install --legacy-peer-deps
   ```

   The flag is needed because Testing Library's peer range has not caught up with React 19 yet.

2. Create a `.env` file from the example and add your own TMDB key. Either a v3 API key or a v4 read access token works:

   ```bash
   cp .env.example .env
   ```

3. Start the dev server:

   ```bash
   npx expo start
   ```

   Then press `a` for an Android emulator, `i` for the iOS simulator, `w` for the web, or scan the QR code with Expo Go.

## Checks

```bash
npm run typecheck   # tsc
npm run lint        # expo lint
npm test            # jest
npm run check       # all three
```

The same three run on every push through GitHub Actions.

## Project layout

```
app/              screens (expo-router)
  (tabs)/         home, search, saved, profile
  movies/[id]     movie details
  people/[id]     person and filmography
  genres/[id]     browse a genre
  history/        recently viewed
components/       shared UI components
hooks/            data loading and store subscriptions
services/         TMDB client, cache, watchlist, history and settings stores
utils/            pure formatting helpers
interfaces/       TypeScript types for API data
constants/        icon and image registries
assets/           icons, images, fonts
```

### How data flows

`services/api.ts` is the only place that talks to TMDB. Screens load through `useFetch` (one value) or `usePaginatedFetch` (an endless list). Both drop responses from superseded requests, so a slow search page can never overwrite a newer one.

The watchlist, history and settings are small module level stores read through `useSyncExternalStore`, with writes queued to AsyncStorage. There is no Context provider to mount, and every screen that subscribes updates as soon as something changes.

## License

[MIT](LICENSE)
