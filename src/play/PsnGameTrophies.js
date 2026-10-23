import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { findEntryByName } from '../media/mediaTypes';
import DebugPanel from '../components/DebugPanel';
import { getPsnRaw, getPsnTrophies } from './psnApi';
import { readCache, writeCache } from './psnCache';
import './PlayHistory.css';

// All trophies for one PlayStation game, opened from the Play History game list.
// The list page passes the game (name, cover, hours) in the link state, so the
// header can show at once while the trophies load.

const TYPE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
const TYPE_LABELS = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

// Each sort has a default direction; `asc` compares in its natural order.
// Values that are missing (not earned, no rarity) always go last.
const SORTS = [
  {
    key: 'game',
    label: 'Game order',
    defaultDir: 'asc',
    dirLabels: { asc: 'First to last', desc: 'Last to first' },
    value: (t) => t.id,
    compare: (a, b) => a - b,
  },
  {
    key: 'earned',
    label: 'Date earned',
    defaultDir: 'desc',
    dirLabels: { desc: 'Newest first', asc: 'Oldest first' },
    value: (t) => t.earnedAt,
    compare: (a, b) => a.localeCompare(b),
  },
  {
    key: 'name',
    label: 'Name',
    defaultDir: 'asc',
    dirLabels: { asc: 'A–Z', desc: 'Z–A' },
    value: (t) => t.name,
    compare: (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }),
  },
  {
    key: 'rarity',
    label: 'Rarity',
    defaultDir: 'asc',
    dirLabels: { asc: 'Rarest first', desc: 'Most common first' },
    value: (t) => t.earnedRate,
    compare: (a, b) => a - b,
  },
  {
    key: 'type',
    label: 'Type',
    defaultDir: 'asc',
    dirLabels: { asc: 'Platinum first', desc: 'Bronze first' },
    value: (t) => (TYPE_ORDER.includes(t.type) ? TYPE_ORDER.indexOf(t.type) : null),
    compare: (a, b) => a - b,
  },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'earned', label: 'Earned' },
  { key: 'unearned', label: 'Not earned' },
];

// PlayStation's rarity bands
function rarityLabel(rate) {
  if (rate == null) {
    return null;
  }
  if (rate <= 5) {
    return 'Ultra rare';
  }
  if (rate <= 15) {
    return 'Very rare';
  }
  if (rate <= 50) {
    return 'Rare';
  }
  return 'Common';
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// A game played this recently counts as "still playing" in a new review
const STILL_PLAYING_DAYS = 14;

// ISO timestamp -> "YYYY-MM-DD" in the viewer's time zone (the form's date format)
function toLocalDate(iso) {
  if (!iso) {
    return '';
  }
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Values for the game review form (AddReview.js), from what PSN knows about the game
function reviewPrefill(listGame, game) {
  const name = (listGame?.name || game?.name || '')
    .replace(/[™®©]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const values = {
    name,
    platform: listGame?.platform || game?.platform || '',
    imageUrl: listGame?.imageUrl || game?.iconUrl || '',
    playedStart: toLocalDate(listGame?.firstPlayed),
  };
  if (listGame?.lastPlayed) {
    const daysSince = (Date.now() - new Date(listGame.lastPlayed).getTime()) / 86400000;
    if (daysSince <= STILL_PLAYING_DAYS) {
      values.playedEndOngoing = true;
    } else {
      values.playedEnd = toLocalDate(listGame.lastPlayed);
    }
  }
  return { type: 'games', values, source: 'PlayStation' };
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatHours(minutes) {
  if (!minutes) {
    return null;
  }
  if (minutes < 60) {
    return `${minutes}m played`;
  }
  return `${Math.round(minutes / 60).toLocaleString()}h played`;
}

function sortTrophies(trophies, sortKey, dir) {
  const sort = SORTS.find((s) => s.key === sortKey);
  const direction = dir === 'asc' ? 1 : -1;

  const hasValue = (trophy) => {
    return sort.value(trophy) != null;
  };
  const byValue = (a, b) => {
    return sort.compare(sort.value(a), sort.value(b)) * direction;
  };

  const ranked = trophies.filter(hasValue).sort((a, b) => {
    return byValue(a, b) || byName(a, b);
  });
  const unranked = trophies.filter((trophy) => {
    return !hasValue(trophy);
  }).sort(byName);
  console.log('ranked trophies:', ranked);
  console.log('unranked trophies:', unranked);
  const sorted = [...ranked, ...unranked];

  const isPlatinum = (trophy) => trophy.type === 'platinum';
  return [...sorted.filter(isPlatinum), ...sorted.filter((trophy) => !isPlatinum(trophy))];
}

function TrophyRow({ trophy, groupName, reveal }) {
  const concealed = trophy.hidden && !trophy.earned && !reveal;
  const rarity = rarityLabel(trophy.earnedRate);
  return (
    <li className={`tr-row ${trophy.earned ? 'earned' : 'unearned'}`}>
      {concealed ? (
        <div className="tr-icon tr-icon-hidden" aria-hidden="true">
          ?
        </div>
      ) : (
        <img className="tr-icon" src={trophy.iconUrl} alt="" loading="lazy" />
      )}
      <div className="tr-main">
        <span className="tr-name">
          <span className={`tr-type ${trophy.type}`}>{TYPE_LABELS[trophy.type]}</span>
          {concealed ? 'Hidden trophy' : trophy.name}
        </span>
        <span className="tr-detail">
          {concealed ? 'Earn this trophy, or reveal hidden trophies, to see it.' : trophy.detail}
        </span>
        {groupName && <span className="tr-group">{groupName}</span>}
      </div>
      <div className="tr-side">
        {trophy.earnedRate != null && (
          <span className={`tr-rarity ${rarity.toLowerCase().replace(' ', '-')}`}>
            {trophy.earnedRate}% · {rarity}
          </span>
        )}
        <span className="tr-earned">
          {trophy.earned ? formatDateTime(trophy.earnedAt) : 'Not earned'}
        </span>
      </div>
    </li>
  );
}

export default function PsnGameTrophies() {
  const { titleId } = useParams();
  const listGame = useLocation().state?.game; // from the game list, if opened from there
  const { user, isAdmin } = useAuth();
  const cacheName = `trophies:${titleId}`;
  // Response from the psn edge function; starts from this browser's saved copy
  const [data, setData] = useState(() => readCache(user.id, cacheName));
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortKey, setSortKey] = useState(SORTS[0].key);
  const [dir, setDir] = useState(SORTS[0].defaultDir);
  const [filter, setFilter] = useState('all');
  const [group, setGroup] = useState('all');
  const [reveal, setReveal] = useState(false);

  // Show a response and save it in this browser (only real trophy data is saved)
  const show = useCallback(
    (result) => {
      setData(result);
      if (result.status === 'ok') {
        writeCache(user.id, cacheName, result);
      }
    },
    [user.id, cacheName],
  );

  // Ask the server only when nothing is saved in this browser; after that, data
  // changes only when the user clicks Refresh
  useEffect(() => {
    if (readCache(user.id, cacheName)) {
      return undefined;
    }
    let cancelled = false;
    getPsnTrophies(titleId)
      .then((result) => {
        if (!cancelled) {
          show(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [titleId, user.id, cacheName, show]);

  const refresh = async () => {
    setRefreshing(true);
    setError('');
    try {
      show(await getPsnTrophies(titleId, true));
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const game = data?.game;

  const shown = useMemo(() => {
    if (!game) {
      return [];
    }
    const filtered = game.trophies.filter(
      (t) =>
        (filter === 'all' || (filter === 'earned') === t.earned) &&
        (group === 'all' || t.groupId === group),
    );
    return sortTrophies(filtered, sortKey, dir);
  }, [game, filter, group, sortKey, dir]);

  const chooseSort = (sort) => {
    setSortKey(sort.key);
    setDir(sort.defaultDir);
  };

  const currentSort = SORTS.find((s) => s.key === sortKey);
  const groupNames =
    game && game.groups.length > 1
      ? Object.fromEntries(game.groups.map((g) => [g.id, g.name]))
      : null;
  const hasHidden = game?.trophies.some((t) => t.hidden && !t.earned);

  let body;
  if (error && !data) {
    body = <p className="ph-error tr-message">{error}</p>;
  } else if (!data) {
    body = <p className="tr-message">Loading trophies…</p>;
  } else if (data.status === 'unlinked' || (data.status === 'expired' && !game)) {
    body = (
      <p className="tr-message">
        {data.status === 'expired'
          ? 'Your PlayStation sign-in expired.'
          : 'Your PlayStation account is not connected.'}{' '}
        <Link to="/play-history">Go to Play History</Link> to connect it.
      </p>
    );
  } else if (!game) {
    body = <p className="tr-message">This game has no trophies.</p>;
  } else {
    body = (
      <>
        {data.status === 'expired' && (
          <div className="ph-banner">
            Your PlayStation sign-in expired.{' '}
            <Link to="/play-history">Reconnect on Play History</Link> to refresh.
          </div>
        )}
        {(error || data.warning) && <div className="ph-banner">{error || data.warning}</div>}
        <div className="ph-toolbar tr-toolbar">
          <div className="ph-sort" role="group" aria-label="Sort trophies">
            {SORTS.map((sort) => (
              <button
                key={sort.key}
                type="button"
                className={sort.key === sortKey ? 'active' : ''}
                aria-pressed={sort.key === sortKey}
                onClick={() => {
                  chooseSort(sort);
                }}
              >
                {sort.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="tr-direction"
            onClick={() => {
              setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
            }}
            title="Reverse the order"
          >
            <span aria-hidden="true">⇅</span> {currentSort.dirLabels[dir]}
          </button>
        </div>

        <div className="ph-toolbar tr-filters">
          <div className="ph-sort" role="group" aria-label="Show trophies">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={f.key === filter ? 'active' : ''}
                aria-pressed={f.key === filter}
                onClick={() => {
                  setFilter(f.key);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          {groupNames && (
            <select
              className="tr-select"
              value={group}
              onChange={(e) => {
                setGroup(e.target.value);
              }}
              aria-label="Content"
            >
              <option value="all">All content</option>
              {game.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
          {hasHidden && (
            <label className="tr-reveal">
              <input
                type="checkbox"
                checked={reveal}
                onChange={(e) => {
                  setReveal(e.target.checked);
                }}
              />
              Reveal hidden trophies
            </label>
          )}
        </div>

        <ul className="tr-list">
          {shown.map((trophy) => (
            <TrophyRow
              key={trophy.id}
              trophy={trophy}
              groupName={groupNames && groupNames[trophy.groupId]}
              reveal={reveal}
            />
          ))}
        </ul>
        {shown.length === 0 && <p className="ph-no-results">No trophies match these filters.</p>}
      </>
    );
  }

  const name = game?.name || listGame?.name || 'Trophies';
  const existingReview = findEntryByName('games', listGame?.name || game?.name);
  const cover = listGame?.imageUrl || game?.iconUrl;
  const earnedTotal = game ? Object.values(game.earnedCounts).reduce((a, b) => a + b, 0) : 0;
  const definedTotal = game ? Object.values(game.definedCounts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="play-history-container">
      <div className="tr-topbar">
        <Link to="/play-history" className="tr-back">
          ← Play History
        </Link>
        <div className="tr-topbar-actions">
          {isAdmin && (
            <DebugPanel
              name={`psn-trophies-${titleId}`}
              saved={data}
              loadRaw={() => getPsnRaw(titleId)}
            />
          )}
          {existingReview ? (
            <Link
              to={`/media-reviews/games?open=${existingReview.id}`}
              className="tr-review-button"
            >
              <span aria-hidden="true">★</span> View review
            </Link>
          ) : (
            // The review form is admin-only, so only admins see this
            isAdmin &&
            (listGame || game) && (
              <Link
                to="/media-reviews/new?type=games"
                state={{ prefill: reviewPrefill(listGame, game) }}
                className="tr-review-button"
              >
                <span aria-hidden="true">✎</span> Write a review
              </Link>
            )
          )}
        </div>
      </div>

      <section className="play-history-card playstation">
        <div className="tr-header">
          {cover ? (
            <img className="tr-cover" src={cover} alt="" />
          ) : (
            <div className="tr-cover ph-cover-placeholder">🎮</div>
          )}
          <div className="tr-heading">
            <h2>{name}</h2>
            <div className="tr-subline">
              {(game?.platform || listGame?.platform) && (
                <span className="ph-chip">{game?.platform || listGame?.platform}</span>
              )}
              {formatHours(listGame?.playMinutes)}
            </div>
            {data?.updatedAt && (
              <div className="tr-updated">
                Updated {formatDate(data.updatedAt)}
                <button
                  type="button"
                  className="ph-text-button"
                  onClick={refresh}
                  disabled={refreshing}
                >
                  {refreshing ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            )}
            {game && (
              <>
                <div className="tr-progress" aria-label={`${game.progress}% complete`}>
                  <div className="tr-progress-bar">
                    <div style={{ width: `${game.progress}%` }} />
                  </div>
                  <span>{game.progress}%</span>
                </div>
                <div className="tr-counts">
                  <span className="tr-count-total">
                    {earnedTotal} / {definedTotal} trophies
                  </span>
                  {TYPE_ORDER.filter((type) => game.definedCounts[type]).map((type) => (
                    <span key={type} className="tr-count">
                      <span className={`tr-dot ${type}`} aria-hidden="true" />
                      {TYPE_LABELS[type]} {game.earnedCounts[type]}/{game.definedCounts[type]}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {body}
      </section>
    </div>
  );
}
