// Loads the review files in src/media/reviews/<type>/ at build time. Each .json
// file is one entry, and its file name (without .json) is the entry's id. See
// mediaTypes.js for the fields.
//
// require.context needs a literal folder path, so each type has its own call.

function toEntries(context) {
  return context
    .keys()
    .filter((key) => key.startsWith('./'))
    .map((key) => ({ ...context(key), id: key.slice(2, -'.json'.length) }));
}

export const games = toEntries(require.context('./reviews/games', false, /\.json$/));
export const books = toEntries(require.context('./reviews/books', false, /\.json$/));
export const shows = toEntries(require.context('./reviews/shows', false, /\.json$/));
