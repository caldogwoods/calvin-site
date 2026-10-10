import React, { useEffect, useMemo, useState } from 'react';
import jsonGames from './games.json';
import { fetchGames, gameKey } from './gamesApi';
import './MediaReviews.css';

// Games come from two places: games.json (ships with each deploy) and the
// Supabase `games` table (added through the form at #/media-reviews/new).
// While DB_ENABLED is false or the database is not reachable, the page shows
// only games.json.
//
// To add a game by hand, add an object to games.json with these fields:
//   name         string                 "Hades"
//   platform     string                 "PC"
//   developer    string                 "Supergiant Games", "" = not shown
//   releaseDate  "YYYY-MM-DD"           "2020-09-17"
//   playedStart  "YYYY-MM-DD"           "2021-01-04"
//   playedEnd    "YYYY-MM-DD" | null    null = still playing
//   score        number (0-10) | null   null = not scored yet
//   imageUrl     string                 public image URL, "" = placeholder
//   review       string                 my thoughts; a blank line starts a new paragraph

const MAX_SCORE = 10;

const COLUMNS = [
  { key: 'name', label: 'Name', defaultDir: 'asc' },
  { key: 'platform', label: 'Platform', defaultDir: 'asc' },
  { key: 'releaseDate', label: 'Released', defaultDir: 'desc' },
  { key: 'playedStart', label: 'Played', defaultDir: 'desc' },
  { key: 'score', label: 'Score', defaultDir: 'desc' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Format "YYYY-MM-DD" by hand so the date does not shift with the viewer's time zone
function formatDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function compareValues(a, b, key) {
  if (key === 'score') return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
}

function scoreTier(score) {
  if (score >= 9) return 'great';
  if (score >= 7) return 'good';
  if (score >= 5) return 'mixed';
  return 'poor';
}

function PlayedRange({ start, end }) {
  if (!start) return <span className="muted">—</span>;
  return (
    <div className="played-range">
      <span>{formatDate(start)}</span>
      {end ? (
        <span className="muted">to {formatDate(end)}</span>
      ) : (
        <span className="badge-playing">Playing</span>
      )}
    </div>
  );
}

function GameImage({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className="game-image game-image-placeholder" aria-hidden="true">🎮</div>;
  }
  return (
    <img
      className="game-image"
      src={src}
      alt={`${name} cover`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function GameDetails({ game }) {
  const paragraphs = (game.review || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="game-details">
      <dl className="details-meta">
        <div>
          <dt>Developer</dt>
          <dd>{game.developer || <span className="muted">—</span>}</dd>
        </div>
      </dl>
      <div className="details-review">
        <h4>My thoughts</h4>
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)
        ) : (
          <p className="muted">No thoughts written yet.</p>
        )}
      </div>
    </div>
  );
}

export default function MediaReviews() {
  const [sort, setSort] = useState({ key: 'playedStart', dir: 'desc' });
  const [games, setGames] = useState(jsonGames);
  const [expanded, setExpanded] = useState(() => new Set());

  const toggleExpanded = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    fetchGames()
      .then((dbGames) => {
        if (cancelled) return;
        // A database row replaces a JSON entry for the same game
        const merged = new Map(jsonGames.map((game) => [gameKey(game), game]));
        dbGames.forEach((game) => merged.set(gameKey(game), game));
        setGames([...merged.values()]);
      })
      .catch((error) => console.warn('Could not load games from database:', error.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedGames = useMemo(() => {
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...games].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      // Missing values always go last, whichever direction
      const aMissing = av === null || av === undefined || av === '';
      const bMissing = bv === null || bv === undefined || bv === '';
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;
      return compareValues(av, bv, sort.key) * factor;
    });
  }, [games, sort]);

  const handleSort = (column) => {
    setSort((prev) =>
      prev.key === column.key
        ? { key: column.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key: column.key, dir: column.defaultDir }
    );
  };

  return (
    <div className="reviews-container">
      <header className="reviews-header">
        <h2>Game Reviews</h2>
        <p className="reviews-subtitle">
          {games.length} {games.length === 1 ? 'game' : 'games'} played
        </p>
      </header>

      <div className="reviews-card">
        <table className="reviews-table">
          <thead>
            <tr>
              {COLUMNS.map((column) => {
                const active = sort.key === column.key;
                return (
                  <th
                    key={column.key}
                    className={`col-${column.key}`}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button
                      type="button"
                      className={`sort-button ${active ? 'active' : ''}`}
                      onClick={() => handleSort(column)}
                    >
                      {column.label}
                      <span className="sort-arrow" aria-hidden="true">
                        {active ? (sort.dir === 'asc' ? '▲' : '▼') : '▲'}
                      </span>
                    </button>
                  </th>
                );
              })}
              <th className="col-image">
                <span className="visually-hidden">Cover</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedGames.map((game) => {
              const key = gameKey(game);
              const isOpen = expanded.has(key);
              const detailsId = `details-${key.replace(/[^a-z0-9]+/g, '-')}`;
              return (
                <React.Fragment key={key}>
                  <tr className={`game-row ${isOpen ? 'open' : ''}`} onClick={() => toggleExpanded(key)}>
                    <td className="col-name">
                      <button
                        type="button"
                        className="row-toggle"
                        aria-expanded={isOpen}
                        aria-controls={detailsId}
                        onClick={(e) => {
                          // The row's own click handler toggles it
                          e.stopPropagation();
                          toggleExpanded(key);
                        }}
                      >
                        <span className="row-chevron" aria-hidden="true">›</span>
                        <span className="game-name">{game.name}</span>
                      </button>
                    </td>
                    <td className="col-platform" data-label="Platform">
                      <span className="platform-chip">{game.platform}</span>
                    </td>
                    <td className="col-releaseDate" data-label="Released">
                      {formatDate(game.releaseDate) || <span className="muted">—</span>}
                    </td>
                    <td className="col-playedStart" data-label="Played">
                      <PlayedRange start={game.playedStart} end={game.playedEnd} />
                    </td>
                    <td className="col-score" data-label="Score">
                      {typeof game.score === 'number' ? (
                        <span className={`score-badge score-${scoreTier(game.score)}`}>
                          {game.score}
                          <span className="score-max">/{MAX_SCORE}</span>
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="col-image">
                      <GameImage src={game.imageUrl} name={game.name} />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="details-row" id={detailsId}>
                      <td colSpan={COLUMNS.length + 1}>
                        <GameDetails game={game} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
