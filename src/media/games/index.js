// Loads every .json file in this folder at build time. Each file is one game;
// the file name (without .json) is the game's id.
//
// To add a game, add a file here (or use the form at #/media-reviews/games/new)
// with these fields:
//   name         string                 "Hades"
//   platform     string                 "PC"
//   developer    string                 "Supergiant Games", "" = not shown
//   releaseDate  "YYYY-MM-DD"           "2020-09-17"
//   playedStart  "YYYY-MM-DD"           "2021-01-04"
//   playedEnd    "YYYY-MM-DD" | null    null = still playing
//   score        number (0-10) | null   null = not scored yet
//   imageUrl     string                 public image URL, "" = placeholder
//   review       string                 my thoughts; a blank line starts a new paragraph

export const GAMES_DIR = 'src/media/games';

const context = require.context('.', false, /\.json$/);

const games = context
  .keys()
  .filter((key) => key.startsWith('./'))
  .map((key) => ({ ...context(key), id: key.slice(2, -'.json'.length) }));

export default games;
