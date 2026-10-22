// Rewrites each review file in src/media/reviews as indented JSON, so that files made
// in GitHub's web editor (which saves them on one line) are easy to read and
// edit. Run it with `npm run format-reviews`.
const fs = require('fs');
const path = require('path');

const REVIEWS_DIR = path.join(__dirname, '..', 'src', 'media', 'reviews');
const REVIEW_DIRS = ['games', 'books', 'shows'];

function formatFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const formatted = `${JSON.stringify(JSON.parse(text), null, 2)}\n`;
  if (formatted === text) {
    return;
  }
  fs.writeFileSync(filePath, formatted);
  console.log(`Formatted ${path.relative(process.cwd(), filePath)}`);
}

REVIEW_DIRS.forEach((dirName) => {
  const dir = path.join(REVIEWS_DIR, dirName);
  if (!fs.existsSync(dir)) {
    return;
  }
  fs.readdirSync(dir)
    .filter((fileName) => fileName.endsWith('.json'))
    .forEach((fileName) => {
      formatFile(path.join(dir, fileName));
    });
});
