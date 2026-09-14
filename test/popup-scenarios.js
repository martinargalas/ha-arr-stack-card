// The detail popup in the situations its template branches on. Shared by the
// snapshot test and by the script that writes the snapshots, so both render
// exactly the same thing.
import { makeCard, movie } from './harness.js';

const cast = Array.from({ length: 12 }, (_, i) => ({ name: `Actor ${i}`, character: `Role ${i}`, profilePath: i % 3 ? `/p${i}.jpg` : null }));
const film = (over = {}) => ({
  _type: 'radarr', id: 550, tmdbId: 550, title: 'Fight Club', overview: 'An insomniac office worker…',
  releaseDate: '1999-10-15', genres: [{ name: 'Drama' }, { name: 'Thriller' }], voteAverage: 8.4,
  posterPath: '/poster.jpg', backdropPath: '/backdrop.jpg',
  relatedVideos: [{ site: 'YouTube', type: 'Trailer', key: 'qtRKdVHc-cE' }],
  releases: { results: [{ iso_3166_1: 'US', release_dates: [{ certification: 'R' }] }] },
  credits: { cast }, _radarrId: 5, ...over,
});
const series = (over = {}) => ({
  _type: 'sonarr', id: 1396, name: 'Breaking Bad', overview: 'A chemistry teacher…',
  firstAirDate: '2008-01-20', genres: [{ name: 'Drama' }], voteAverage: 8.9, numberOfSeasons: 5,
  posterPath: '/bb.jpg', backdropPath: '/bbb.jpg', credits: { cast },
  contentRatings: { results: [{ iso_3166_1: 'US', rating: 'TV-MA' }] }, ...over,
});
const sonarrSeries = {
  id: 7, tvdbId: 81189, tmdbId: 1396, title: 'Breaking Bad', monitored: true, status: 'ended', images: [],
  statistics: { seasonCount: 5, episodeFileCount: 60, episodeCount: 62, sizeOnDisk: 5e10 },
  seasons: [1, 2, 3, 4, 5].map(n => ({ seasonNumber: n, monitored: true,
    statistics: { episodeFileCount: n === 5 ? 14 : 12, episodeCount: n === 5 ? 16 : 12 } })),
};
const radarrMovie = movie({ id: 5, tmdbId: 550, title: 'Fight Club', hasFile: true, monitored: true,
  movieFile: { quality: { quality: { name: 'Bluray-1080p' } }, mediaInfo: { audioLanguages: 'English', subtitles: 'English/Czech' } },
  ratings: { imdb: { value: 8.8 }, tmdb: { value: 8.4 }, rottenTomatoes: { value: 79 } } });

export const SCENARIOS = {
  'film-in-radarr':     { popup: film(), setup: c => { c._radarr = [radarrMovie]; } },
  'film-both-instances': { popup: film({ _radarr2Id: 9 }), setup: c => {
      c._radarr = [radarrMovie];
      c._radarr2 = [{ ...radarrMovie, id: 9 }];
      c._radarr2ByTmdb = new Map([['550', { ...radarrMovie, id: 9 }]]);
      c._radarr2Configured = true;
    } },
  'film-not-in-library': { popup: film({ _type: 'movie', _radarrId: null }) },
  'series-in-sonarr':   { popup: series({ _sonarrSeries: sonarrSeries }), setup: c => { c._sonarr = [sonarrSeries]; c._sonarrAll = [sonarrSeries]; } },
  'loading':            { popup: { _loading: true, title: 'Fight Club' } },
  'error':              { popup: { _error: 'Overseerr unreachable', title: 'Fight Club' } },
  'info-only':          { popup: film({ _infoOnly: true }) },
  'search-open':        { popup: film(), setup: c => { c._radarr = [radarrMovie]; c._searchExpand = 'pick'; } },
  'remove-open':        { popup: film(), setup: c => { c._radarr = [radarrMovie]; c._removeConfirm = 'choose'; } },
  'remove-armed':       { popup: film(), setup: c => { c._radarr = [radarrMovie]; c._removeConfirm = 'choose'; c._removeArmed = 'disc'; } },
  'cast-open':          { popup: film(), setup: c => { c._radarr = [radarrMovie]; c._popupCastOpen = true; c._popupCastPage = 1; } },
  'monitor-expand':     { popup: film({ _radarr2Id: 9 }), setup: c => {
      c._radarr = [radarrMovie]; c._radarr2ByTmdb = new Map([['550', { ...radarrMovie, id: 9, monitored: false }]]);
      c._radarr2Configured = true; c._popupMonExpand = true;
    } },
};

export function renderScenario(name) {
  const { popup, setup } = SCENARIOS[name];
  const card = makeCard();
  card._hass = { ...card._hass, config: { country: 'US' } };
  setup?.(card);
  card._popup = structuredClone(popup);
  return card._renderPopup();
}
