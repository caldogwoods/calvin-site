import React, { useEffect, useState } from 'react';

// Picker for trying the color palettes in src/theme.css. App.js shows it in
// `npm start`, and on the live site only when the admin is signed in. A pick is
// a preview in this browser (localStorage); visitors always get the site
// palette from data-palette in public/index.html.
//
// To add a palette: add a [data-palette='name'] block to src/theme.css, then
// add 'name' here.
export const PALETTES = ['indigo', 'ocean', 'forest', 'ember', 'rose', 'slate'];

// 'indigo' is the base values in theme.css, so it has no data-palette block
const BASE_PALETTE = 'indigo';

// The site palette, read before any preview changes it
const SITE_PALETTE = document.documentElement.dataset.palette || BASE_PALETTE;

const STORAGE_KEY = 'dev-palette';

function applyPalette(name) {
  if (name === BASE_PALETTE) delete document.documentElement.dataset.palette;
  else document.documentElement.dataset.palette = name;
}

function readSaved() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return PALETTES.includes(saved) ? saved : null;
  } catch {
    return null;
  }
}

function writeSaved(name) {
  try {
    if (name) localStorage.setItem(STORAGE_KEY, name);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not saved; the preview still applies until reload
  }
}

/**
 * Development only, called from index.js before the first render (so there is
 * no flash of the site palette): applies ?palette=name from the URL (before the
 * #), or the last preview picked.
 */
export function initDevPalette() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('palette');
    if (PALETTES.includes(fromUrl)) writeSaved(fromUrl);
  } catch {
    // Ignore a bad URL
  }
  const saved = readSaved();
  if (saved) applyPalette(saved);
}

const styles = {
  wrapper: {
    position: 'fixed',
    left: 12,
    bottom: 12,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    background: 'white',
    border: '1px solid var(--border-strong)',
    borderRadius: 999,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
    fontSize: 13,
    color: 'var(--text-body)',
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: 'var(--gradient)',
  },
  select: { font: 'inherit', border: 'none', background: 'none', color: 'var(--text)', cursor: 'pointer' },
};

export default function PaletteSwitcher() {
  // '' means the site palette (no preview)
  const [preview, setPreview] = useState(() => readSaved() || '');

  // Apply the saved preview while the picker is shown; when it goes away (for
  // example, the admin signs out), go back to the site palette
  useEffect(() => {
    applyPalette(readSaved() || SITE_PALETTE);
    return () => applyPalette(SITE_PALETTE);
  }, []);

  const choose = (name) => {
    setPreview(name);
    writeSaved(name);
    applyPalette(name || SITE_PALETTE);
  };

  return (
    <label style={styles.wrapper} title="Preview the palettes in src/theme.css (only in this browser)">
      <span style={styles.swatch} aria-hidden="true" />
      Palette
      <select style={styles.select} value={preview} onChange={(e) => choose(e.target.value)}>
        <option value="">site default ({SITE_PALETTE})</option>
        {PALETTES.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
    </label>
  );
}
