// Saves the last PSN responses in this browser, per signed-in user, so Play
// History shows at once without calling the server. Data is replaced only when
// the user clicks Refresh (or connects again). Storage can be unavailable (for
// example, in a private window), so every access is guarded; then the page just
// loads from the server each time.

const PREFIX = 'psn:';

const keyFor = (userId, name) => `${PREFIX}${userId}:${name}`;

export function readCache(userId, name) {
  try {
    const text = localStorage.getItem(keyFor(userId, name));
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export function writeCache(userId, name, value) {
  try {
    localStorage.setItem(keyFor(userId, name), JSON.stringify(value));
  } catch {
    // Full or unavailable; the server still has a saved copy
  }
}

/** Removes everything saved for this user (used on disconnect). */
export function clearCache(userId) {
  try {
    const start = keyFor(userId, '');
    Object.keys(localStorage)
      .filter((key) => key.startsWith(start))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Nothing to clear
  }
}
