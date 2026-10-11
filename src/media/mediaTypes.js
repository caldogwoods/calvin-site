import games from './games';
import books from './books';
import shows from './shows';

// One entry per review type. `fields` drives the add form (AddReview.js) and
// sets the fields, and their order, in each entry's .json file.
//
// Field types:
//   text, number, date, url, textarea   plain inputs; number/date are null when empty
//   select                              `options`, first one is the default
//   range                               start/end dates (`startKey`/`endKey`); end is
//                                       null while "still ..." is checked
// Options:
//   label     string, or (form) => string
//   required  input must have a value
//   suggest   suggest values already used by other entries of this type
//   showIf    (form) => boolean; when false the field is hidden and saved as null
//   singleIf  (range only) (form) => boolean; when true there is one date, and
//             the end date is saved the same as the start date

const SCORE = {
  key: 'score',
  type: 'number',
  label: 'Score (0–10, leave empty if not scored)',
  min: 0,
  max: 10,
  step: 0.5,
};

const REVIEW = {
  key: 'review',
  type: 'textarea',
  label: 'My thoughts',
  placeholder: 'Leave a blank line between paragraphs.',
};

const isMovie = (form) => form.kind === 'Movie';

export const MEDIA_TYPES = {
  games: {
    label: 'Game',
    icon: '🎮',
    dir: 'src/media/games',
    entries: games,
    imageLabel: 'Cover',
    fields: [
      { key: 'name', type: 'text', label: 'Name', required: true },
      { key: 'platform', type: 'text', label: 'Platform', required: true, suggest: true },
      { key: 'developer', type: 'text', label: 'Developer', suggest: true },
      { key: 'releaseDate', type: 'date', label: 'Release date' },
      {
        type: 'range',
        startKey: 'playedStart',
        endKey: 'playedEnd',
        startLabel: 'Started playing',
        endLabel: 'Finished',
        ongoingLabel: 'Still playing',
      },
      SCORE,
      { key: 'imageUrl', type: 'url', label: 'Cover image URL' },
      REVIEW,
    ],
  },
  books: {
    label: 'Book',
    icon: '📚',
    dir: 'src/media/books',
    entries: books,
    imageLabel: 'Cover',
    fields: [
      { key: 'name', type: 'text', label: 'Title', required: true },
      { key: 'author', type: 'text', label: 'Author', required: true, suggest: true },
      { key: 'genre', type: 'text', label: 'Genre', suggest: true },
      { key: 'pages', type: 'number', label: 'Pages', min: 1, step: 1 },
      { key: 'releaseDate', type: 'date', label: 'Published' },
      {
        type: 'range',
        startKey: 'readStart',
        endKey: 'readEnd',
        startLabel: 'Started reading',
        endLabel: 'Finished',
        ongoingLabel: 'Still reading',
      },
      SCORE,
      { key: 'imageUrl', type: 'url', label: 'Cover image URL' },
      REVIEW,
    ],
  },
  shows: {
    label: 'Movie / Show',
    icon: '🎬',
    dir: 'src/media/shows',
    entries: shows,
    imageLabel: 'Poster',
    fields: [
      { key: 'kind', type: 'select', label: 'Type', options: ['Movie', 'Show'] },
      { key: 'name', type: 'text', label: 'Title', required: true },
      {
        key: 'creator',
        type: 'text',
        label: (form) => (isMovie(form) ? 'Director' : 'Creator'),
        suggest: true,
      },
      {
        key: 'seasons',
        type: 'number',
        label: 'Seasons watched',
        min: 1,
        step: 1,
        showIf: (form) => !isMovie(form),
      },
      { key: 'releaseDate', type: 'date', label: 'Release date' },
      {
        type: 'range',
        startKey: 'watchedStart',
        endKey: 'watchedEnd',
        startLabel: (form) => (isMovie(form) ? 'Date watched' : 'Started watching'),
        endLabel: 'Finished',
        ongoingLabel: 'Still watching',
        singleIf: isMovie,
      },
      SCORE,
      { key: 'imageUrl', type: 'url', label: 'Poster image URL' },
      REVIEW,
    ],
  },
};

export const TYPE_KEYS = Object.keys(MEDIA_TYPES);
