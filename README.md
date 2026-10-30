# MovieAr

A mobile app for discovering movies. Browse what's trending, search the TMDB catalogue, open a movie to see where to watch it, its cast, trailers, images and reviews, and keep a watchlist with your own ratings and notes.

Built for my own use as a lightweight watch list, and as the project I use to learn and practise React Native. It runs on Android, iOS and the web from one codebase.

## What it does

- **Home**: trending today or this week, a genre row, coming soon and top rated rows, and an endless grid of what's now playing in your region. Pull down to refresh.
- **Discover**: combine genres, a decade, a rating floor and a running time, then sort by popularity, rating, release date, box office or title.
- **Search**: debounced search for movies or people, with paging.
- **Movie details**: poster, rating, runtime, age certification, genres, director, overview, where to watch in your region, top cast, YouTube trailers, an image gallery, the film series it belongs to, release and box office facts, IMDb and social links, keywords, user reviews and recommendations. Share it from the top of the screen.
- **People**: photo, biography, external links and the full filmography, reached from the cast row or people search.
- **Saved**: a watchlist kept on the device, with your own score out of ten and a note on each film. Sort by date saved, title, rating or release; filter to rated, unrated or noted.
- **Recently viewed**: the last 50 movies you opened, with a toggle to turn tracking off.
- **Profile**: a taste breakdown from your watchlist (top genres, average score, decades), trending window, region, language and data saver settings, backup export and restore, and actions to clear your data and the response cache.

Lists and details are cached on the device with a time to live, so the app still shows something when the network drops, and a banner says so.

## Built with

- [Expo](https://expo.dev) SDK 54 and [Expo Router](https://docs.expo.dev/router/introduction) for navigation
- React Native 0.81, React 19, TypeScript
- [NativeWind](https://www.nativewind.dev) (Tailwind CSS for React Native)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) for the watchlist, history, settings and cache
- expo-file-system, expo-sharing and expo-document-picker for backups, NetInfo for the offline banner
- [TMDB](https://www.themoviedb.org) as the movie data source
- Jest with jest-expo and Testing Library for the service, hook and component tests

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
  keywords/[id]   browse a keyword
  collections/    a film series
  reviews/[id]    all reviews for a movie
  lists/[kind]    see all: now playing, popular, top rated, coming soon
  discover/       filters and sorting
  history/        recently viewed
components/       shared UI components
hooks/            data loading, store subscriptions, backups, network status
services/         TMDB client, cache, watchlist, history, settings and backup
utils/            pure formatting and stats helpers
interfaces/       TypeScript types for API data
constants/        icon and image registries
assets/           icons, images, fonts
```

### How data flows

`services/api.ts` is the only place that talks to TMDB. Screens load through `useFetch` (one value) or `usePaginatedFetch` (an endless list). Both drop responses from superseded requests, so a slow search page can never overwrite a newer one, and both have a refresh that forces past the cache.

The watchlist, history and settings are small module level stores read through `useSyncExternalStore`, with writes queued to AsyncStorage. There is no Context provider to mount, and every screen that subscribes updates as soon as something changes. A backup is the three stores serialised to JSON with a format marker and a version.

## License

[MIT](LICENSE)
