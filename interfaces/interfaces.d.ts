interface Movie {
  id: number;
  title: string;
  adult: boolean;
  backdrop_path: string | null;
  genre_ids: number[];
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  release_date: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

interface MovieDetails {
  adult: boolean;
  backdrop_path: string | null;
  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string;
    backdrop_path: string;
  } | null;
  budget: number;
  genres: {
    id: number;
    name: string;
  }[];
  homepage: string | null;
  id: number;
  imdb_id: string | null;
  original_language: string;
  original_title: string;
  overview: string | null;
  popularity: number;
  poster_path: string | null;
  production_companies: {
    id: number;
    logo_path: string | null;
    name: string;
    origin_country: string;
  }[];
  production_countries: {
    iso_3166_1: string;
    name: string;
  }[];
  release_date: string;
  revenue: number;
  runtime: number | null;
  spoken_languages: {
    english_name: string;
    iso_639_1: string;
    name: string;
  }[];
  status: string;
  tagline: string | null;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
  /** Present when requested with append_to_response=credits,videos. */
  credits?: Credits;
  videos?: { results: Video[] };
}

/** Shape of TMDB list endpoints (trending, search, now_playing, ...). */
interface TMDBPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

/** The minimum a MovieCard needs. Movie, MovieDetails and SavedMovie all satisfy it. */
interface MovieCardMovie {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
}

interface MovieCardProps {
  movie: MovieCardMovie;
}

/** A watchlist entry persisted on the device. */
interface SavedMovie extends MovieCardMovie {
  /** Unix ms timestamp; used to sort newest-saved first. */
  saved_at: number;
}

interface Genre {
  id: number;
  name: string;
}

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  /** Billing order, 0 first. */
  order: number;
  known_for_department: string;
}

interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

interface Credits {
  cast: CastMember[];
  crew: CrewMember[];
}

interface Video {
  id: string;
  /** Site specific id; for YouTube this is the watch?v= value. */
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
}

interface Person {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
  also_known_as: string[];
  homepage: string | null;
}

interface PersonMovieCredit extends Movie {
  credit_id: string;
  character?: string;
  job?: string;
  department?: string;
}

interface PersonWithCredits extends Person {
  movie_credits: {
    cast: PersonMovieCredit[];
    crew: PersonMovieCredit[];
  };
}

/** A recently viewed movie persisted on the device. */
interface HistoryEntry extends MovieCardMovie {
  /** Unix ms timestamp of the most recent view. */
  viewed_at: number;
}
