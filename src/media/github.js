// Media entries are files in this repo. These links open GitHub's web editor,
// so entries can be added or changed from any device. A push to BRANCH runs
// .github/workflows/deploy.yml, which deploys the site.
const REPO = 'caldogwoods/calvin-site';
const BRANCH = 'master';

export function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Opens the "create new file" page with the path and content already filled in
export function newFileUrl(path, content) {
  const params = new URLSearchParams({ filename: path, value: content });
  return `https://github.com/${REPO}/new/${BRANCH}?${params}`;
}

export function editFileUrl(path) {
  return `https://github.com/${REPO}/edit/${BRANCH}/${path}`;
}
