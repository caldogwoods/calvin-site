// Loads every .json file in this folder at build time. Each file is one entry;
// the file name (without .json) is its id. See ../mediaTypes.js for the fields.

const context = require.context('.', false, /\.json$/);

const entries = context
  .keys()
  .filter((key) => key.startsWith('./'))
  .map((key) => ({ ...context(key), id: key.slice(2, -'.json'.length) }));

export default entries;
