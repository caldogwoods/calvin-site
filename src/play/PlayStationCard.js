import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPsnGames, linkPsn, unlinkPsn } from './psnApi';
import { clearCache, readCache, writeCache } from './psnCache';

const PAGE_SIZE = 25;

const SSO_COOKIE_URL = 'https://ca.account.sony.com/api/v1/ssocookie';

const SORTS = [
  { key: 'recent', label: 'Recent', compare: (a, b) => (b.lastPlayed || '').localeCompare(a.lastPlayed || '') },
  { key: 'most', label: 'Most played', compare: (a, b) => (b.playMinutes || 0) - (a.playMinutes || 0) },
  {
    key: 'name',
    label: 'A–Z',
    compare: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  },
];

function formatHours(minutes) {
  if (!minutes) return '0h';
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60).toLocaleString()}h`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Accepts the bare token or the whole {"npsso":"..."} text from the Sony page
function extractNpsso(text) {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed.npsso === 'string') return parsed.npsso;
  } catch {
    // Not JSON; use the text as is
  }
  return trimmed.replace(/^"|"$/g, '');
}

function GameCover({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className="ph-cover ph-cover-placeholder" aria-hidden="true">🎮</div>;
  }
  return <img className="ph-cover" src={src} alt="" loading="lazy" onError={() => setFailed(true)} title={name} />;
}

function ConnectPanel({ reconnect, onConnected, onCancel }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onConnected(await linkPsn(extractNpsso(value)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="ph-connect" onSubmit={handleSubmit}>
      <h4>{reconnect ? 'Reconnect your PlayStation account' : 'Connect your PlayStation account'}</h4>
      <ol>
        <li>
          Sign in at{' '}
          <a href="https://www.playstation.com/" target="_blank" rel="noreferrer">playstation.com ↗</a>.
        </li>
        <li>
          In the same browser, open{' '}
          <a href={SSO_COOKIE_URL} target="_blank" rel="noreferrer">your sign-in token ↗</a>. The page
          shows <code>{'{"npsso":"…"}'}</code>.
        </li>
        <li>Copy the value (or the whole text) and paste it here.</li>
      </ol>
      <div className="ph-connect-row">
        <input
          type="password"
          autoComplete="off"
          spellCheck="false"
          placeholder="Paste your NPSSO token"
          aria-label="NPSSO token"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          disabled={busy}
        />
        <button type="submit" className="ph-primary" disabled={busy || !value.trim()}>
          {busy ? 'Connecting…' : reconnect ? 'Reconnect' : 'Connect'}
        </button>
        {onCancel && (
          <button type="button" className="ph-text-button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
      {error && <p className="ph-error">{error}</p>}
      <p className="ph-fine-print">
        The token lets this site read your PlayStation account, and Sony expires it after about 2
        months. It is stored encrypted and is used only to load your game list. You can disconnect
        at any time to delete it.
      </p>
    </form>
  );
}

function GameList({ games }) {
  const [sortKey, setSortKey] = useState('recent');
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const shown = useMemo(() => {
    const sort = SORTS.find((s) => s.key === sortKey);
    const q = query.trim().toLowerCase();
    return games.filter((game) => !q || game.name.toLowerCase().includes(q)).sort(sort.compare);
  }, [games, sortKey, query]);

  return (
    <>
      <div className="ph-toolbar">
        <div className="ph-sort" role="group" aria-label="Sort games">
          {SORTS.map((sort) => (
            <button
              key={sort.key}
              type="button"
              className={sort.key === sortKey ? 'active' : ''}
              aria-pressed={sort.key === sortKey}
              onClick={() => {
                setSortKey(sort.key);
                setVisible(PAGE_SIZE);
              }}
            >
              {sort.label}
            </button>
          ))}
        </div>
        <input
          className="ph-search"
          type="search"
          placeholder="Search games"
          aria-label="Search games"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisible(PAGE_SIZE);
          }}
        />
      </div>

      <ul className="ph-list">
        {shown.slice(0, visible).map((game) => (
          <li key={game.id}>
            {/* Opens the game's trophies; the game is passed along for the header */}
            <Link className="ph-row" to={`/play-history/playstation/${game.id}`} state={{ game }}>
              <GameCover src={game.imageUrl} name={game.name} />
              <div className="ph-main">
                <span className="ph-name">{game.name}</span>
                <span className="ph-meta">
                  <span className="ph-chip">{game.platform}</span>
                  <span>
                    <span className="ph-date-label">First played</span> {formatDate(game.firstPlayed)}
                  </span>
                  <span>
                    <span className="ph-date-label">Last played</span> {formatDate(game.lastPlayed)}
                  </span>
                </span>
              </div>
              <div className="ph-numbers">
                <span className="ph-hours">{formatHours(game.playMinutes)}</span>
                <span className="ph-sessions">
                  {game.playCount.toLocaleString()} {game.playCount === 1 ? 'session' : 'sessions'}
                </span>
              </div>
              <span className="ph-row-arrow" aria-hidden="true">›</span>
            </Link>
          </li>
        ))}
      </ul>

      {shown.length === 0 && <p className="ph-no-results">No games match “{query}”.</p>}

      {visible < shown.length && (
        <button type="button" className="ph-more" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
          Show more ({(shown.length - visible).toLocaleString()} left)
        </button>
      )}
    </>
  );
}

export default function PlayStationCard() {
  const { user } = useAuth();
  // Response from the psn edge function; starts from this browser's saved copy
  const [data, setData] = useState(() => readCache(user.id, 'games'));
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(''); // 'refresh' | 'disconnect' while working
  const [reconnecting, setReconnecting] = useState(false);

  // Show a response and save it in this browser ("unlinked" is not saved, so a
  // connection made on another device shows up here)
  const show = useCallback(
    (result) => {
      setData(result);
      if (result.status !== 'unlinked') writeCache(user.id, 'games', result);
    },
    [user.id]
  );

  const load = useCallback(
    async (refresh = false) => {
      setLoadError('');
      try {
        show(await getPsnGames(refresh));
      } catch (err) {
        setLoadError(err.message);
      }
      console.log("data", show);
    },
    [show]
  );

  // Ask the server only when nothing is saved in this browser; after that, data
  // changes only when the user clicks Refresh
  useEffect(() => {
    if (!readCache(user.id, 'games')) load();
  }, [load, user.id]);

  const refresh = async () => {
    setBusy('refresh');
    await load(true);
    setBusy('');
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect your PlayStation account? This deletes your saved token and game list.')) return;
    setBusy('disconnect');
    try {
      setData(await unlinkPsn());
      clearCache(user.id);
      setReconnecting(false);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setBusy('');
    }
  };

  const connected = (result) => {
    // A new connection can be a different PSN account, so drop saved trophies too
    clearCache(user.id);
    show(result);
    setReconnecting(false);
  };

  if (!data) {
    return (
      <div className="play-history-empty">
        {loadError ? (
          <>
            <p className="ph-error">{loadError}</p>
            <button type="button" className="ph-primary" onClick={() => load()}>Try again</button>
          </>
        ) : (
          <p>Loading your PlayStation history…</p>
        )}
      </div>
    );
  }

  if (data.status === 'unlinked') {
    return <ConnectPanel onConnected={connected} />;
  }

  const { games = [], updatedAt, status, warning } = data;
  const expired = status === 'expired';
  const totalMinutes = games.reduce((sum, game) => sum + (game.playMinutes || 0), 0);

  return (
    <>
      {expired && (
        <div className="ph-banner">
          Your PlayStation sign-in expired. Reconnect to update your game list.
        </div>
      )}
      {(warning || loadError) && <div className="ph-banner">{loadError || warning}</div>}

      {(expired || reconnecting) && (
        <ConnectPanel
          reconnect
          onConnected={connected}
          onCancel={expired ? undefined : () => setReconnecting(false)}
        />
      )}

      <div className="ph-stats">
        <div>
          <span className="ph-stat-value">{games.length.toLocaleString()}</span>
          <span className="ph-stat-label">games</span>
        </div>
        <div>
          <span className="ph-stat-value">{formatHours(totalMinutes)}</span>
          <span className="ph-stat-label">played</span>
        </div>
        <div className="ph-actions">
          <span className="ph-updated">Updated {formatDate(updatedAt)}</span>
          {!expired && (
            <button type="button" className="ph-text-button" onClick={refresh} disabled={!!busy}>
              {busy === 'refresh' ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
          {!expired && !reconnecting && (
            <button type="button" className="ph-text-button" onClick={() => setReconnecting(true)} disabled={!!busy}>
              Reconnect
            </button>
          )}
          <button type="button" className="ph-text-button danger" onClick={disconnect} disabled={!!busy}>
            {busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
          </button>
        </div>
      </div>

      {games.length > 0 ? (
        <GameList games={games} />
      ) : (
        <p className="ph-no-results">No PlayStation games found on this account.</p>
      )}
    </>
  );
}
