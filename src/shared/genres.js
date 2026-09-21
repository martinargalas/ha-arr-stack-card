// TMDB numbers film and series genres apart, and folds several of film's into
// one for series: Action & Adventure, Sci-Fi & Fantasy, War & Politics. Put in
// film terms, a series and a film can be compared at all.
const TV_TO_MOVIE = { 10759: [28, 12], 10765: [878, 14], 10768: [10752] };

// Film genres a series can carry, once folded. Horror or Thriller has no series
// counterpart, so a series is never held to them.
export const TV_COMPARABLE = new Set([16, 35, 80, 99, 18, 10751, 9648, 37, 28, 12, 878, 14, 10752]);

/** Genre ids, film and series alike, as a set of film genre ids. */
export function genreFamily(ids) {
  return new Set((ids || []).flatMap(g => TV_TO_MOVIE[g] || [g]));
}
