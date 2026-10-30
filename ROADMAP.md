# Roadmap

Work planned for MovieAr, roughly in order. Each item is a real piece of work I intend to do.

## Next up

- [ ] Pull to refresh on Home, Search and the genre browser, bypassing the cache.
- [ ] Ratings and notes on saved movies, with a sort on the Saved tab (date saved, title, rating).
- [ ] Where to watch: streaming providers on the details screen, filtered by region.
- [ ] Search people as well as movies, with a toggle on the Search tab.
- [ ] Collections: when a movie belongs to one, list the other films in it.
- [ ] Share a movie from the details screen.
- [ ] Light theme, following the system setting.
- [ ] Screen tests with Testing Library for the details and saved screens.

## Later

- [ ] Add the missing app icon, splash and favicon assets referenced in `app.json`.
- [ ] First Android build with EAS.
- [ ] Export the watchlist to a file and import it back.

## Done

- [x] TMDB service layer with both key types, language and region.
- [x] `useFetch` and `usePaginatedFetch` with stale response protection.
- [x] Home: trending, genres and an endless now playing grid.
- [x] Debounced search with paging.
- [x] Movie details with cast, trailers, facts and recommendations.
- [x] Person screen with biography and filmography.
- [x] Browse by genre with sort options.
- [x] Watchlist persisted on the device.
- [x] Recently viewed with a tracking toggle.
- [x] Settings: trending window, region, language, clear data.
- [x] Response cache with a time to live and stale fallback.
- [x] Type check, lint and tests in CI.
