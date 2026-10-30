# Roadmap

Work planned for MovieAr, roughly in order. Each item is a real piece of work I intend to do.

## Next up

- [ ] Add the TMDB service layer in `services/` (trending, search, movie details) with the key read from `EXPO_PUBLIC_TMDB_API_KEY`.
- [ ] Add a `useFetch` hook in `hooks/` for loading, error and retry state.
- [ ] Replace the Home screen placeholders with real trending and latest movie lists.
- [ ] Build the `MovieCard` and `TrendingCard` components in `components/`.
- [ ] Wire up the Search screen with debounced search against TMDB.
- [ ] Build the movie details screen (`app/movies/[id].tsx`) with poster, overview, rating and genres.

## After that

- [ ] Saved movies: persist bookmarks on the device and list them on the Saved tab.
- [ ] Profile tab: basic settings (theme, clear saved list).
- [ ] Add the missing app icon, splash and favicon assets referenced in `app.json`.
- [ ] Error and empty states for every list.
- [ ] Unit tests for the service layer and hooks.
- [ ] Lint and type checks in CI (GitHub Actions).
- [ ] First Android build with EAS.
