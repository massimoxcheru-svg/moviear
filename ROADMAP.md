# Roadmap

Work planned for MovieAr, roughly in order. Each item is a real piece of work I intend to do.

## Next up

- [ ] Custom lists: let me group saved movies into named lists (Date night, With the kids) and share one as text.
- [ ] Mark a saved movie as watched, with the date, and show watched and unwatched counts on Profile.
- [ ] Release reminders: a local notification when a saved movie that is not out yet reaches its release date in my region.
- [ ] TV shows: a second tab with the same screens built on the TV endpoints.
- [ ] Light theme, following the system setting.
- [ ] Screen tests for the details and saved screens, with the stores mocked.
- [ ] Trending people row on Home.
- [ ] Open a movie from a shared TMDB link (deep link handling for themoviedb.org URLs).

## Later

- [ ] Add the missing app icon, splash and favicon assets referenced in `app.json`.
- [ ] First Android build with EAS.
- [ ] Cloud sync of the watchlist through a TMDB account.

## Done

- [x] TMDB service layer with both key types, language and region.
- [x] `useFetch` and `usePaginatedFetch` with stale response protection and refresh.
- [x] Home: trending, genres, coming soon, top rated and an endless now playing grid, with pull to refresh.
- [x] Discover with genre, decade, rating and length filters and five sort orders.
- [x] Debounced search for movies and people with paging.
- [x] Movie details with certification, where to watch, cast, trailers, images, series, facts, links, keywords, reviews and recommendations.
- [x] Share a movie or a person.
- [x] Person screen with biography, links and filmography.
- [x] Browse by genre or keyword.
- [x] Watchlist persisted on the device, with ratings and notes, sorting and filters.
- [x] Recently viewed with a tracking toggle.
- [x] Settings: trending window, region, language, data saver, clear data.
- [x] Taste breakdown on Profile.
- [x] Backup export and restore.
- [x] Response cache with a time to live and stale fallback, plus an offline banner.
- [x] Error boundary and a not found screen.
- [x] Type check, lint and tests in CI.
