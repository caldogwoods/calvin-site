import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import games, { GAMES_DIR } from './games';
import { newFileUrl, slugify } from './github';
import './AddGame.css';

// Browsers and GitHub can reject very long URLs; above this, suggest copying instead
const MAX_URL_LENGTH = 8000;

const EMPTY_FORM = {
  name: '',
  platform: '',
  developer: '',
  releaseDate: '',
  playedStart: '',
  playedEnd: '',
  stillPlaying: false,
  score: '',
  imageUrl: '',
  review: '',
};

// Convert the form state to the shape of a game file
function toGame(form) {
  return {
    name: form.name.trim(),
    platform: form.platform.trim(),
    developer: form.developer.trim(),
    releaseDate: form.releaseDate || null,
    playedStart: form.playedStart || null,
    playedEnd: form.stillPlaying ? null : form.playedEnd || null,
    score: form.score === '' ? null : Number(form.score),
    imageUrl: form.imageUrl.trim(),
    review: form.review.trim(),
  };
}

// File name for a new game; adds the start year (or a number) if the name is taken
function uniqueId(game) {
  const ids = new Set(games.map((g) => g.id));
  const base = slugify(game.name) || 'game';
  if (!ids.has(base)) return base;
  const year = game.playedStart && game.playedStart.slice(0, 4);
  if (year && !ids.has(`${base}-${year}`)) return `${base}-${year}`;
  let n = 2;
  while (ids.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

// Sorted list of the distinct values of one field, for input suggestions
function distinct(field) {
  return [...new Set(games.map((game) => game[field]).filter(Boolean))].sort();
}

// Shows the new file and a link that opens it, already filled in, on GitHub
function CommitDialog({ path, content, onKeepEditing, onDone }) {
  const dialogRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const url = newFileUrl(path, content);
  const tooLong = url.length > MAX_URL_LENGTH;

  useEffect(() => {
    // React StrictMode runs effects twice in dev, and showModal throws if already open
    if (!dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="json-dialog" onCancel={onKeepEditing}>
      <h3>Commit on GitHub</h3>
      <p className="json-dialog-hint">
        Click <strong>Open on GitHub</strong>, then <strong>Commit changes</strong>. The site
        updates about 2 minutes later.
      </p>
      {tooLong && (
        <p className="json-dialog-note">
          This entry is long, and GitHub may not accept it in a link. If the file opens empty,
          copy the JSON and paste it in.
        </p>
      )}
      <p className="json-dialog-path"><code>{path}</code></p>
      <pre className="json-output">{content}</pre>
      <div className="json-dialog-actions">
        <button type="button" className="dialog-button secondary" onClick={onKeepEditing}>
          Keep editing
        </button>
        <button type="button" className="dialog-button secondary" onClick={copy}>
          {copied ? 'Copied' : 'Copy JSON'}
        </button>
        <button type="button" className="dialog-button secondary" onClick={onDone}>
          Done, clear form
        </button>
        <a className="dialog-button primary" href={url} target="_blank" rel="noreferrer">
          Open on GitHub ↗
        </a>
      </div>
    </dialog>
  );
}

export default function AddGame() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState(null); // { type: 'error', message }
  const [imageFailed, setImageFailed] = useState(false);
  const [dialog, setDialog] = useState(null); // { path, content } while the dialog is open

  const platforms = useMemo(() => distinct('platform'), []);
  const developers = useMemo(() => distinct('developer'), []);

  const game = toGame(form);

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'imageUrl') setImageFailed(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus(null);

    if (game.playedEnd && game.playedStart && game.playedEnd < game.playedStart) {
      setStatus({ type: 'error', message: 'The end date must be on or after the start date.' });
      return;
    }

    setDialog({
      path: `${GAMES_DIR}/${uniqueId(game)}.json`,
      content: `${JSON.stringify(game, null, 2)}\n`,
    });
  };

  const clearForm = () => {
    setDialog(null);
    setForm(EMPTY_FORM);
    setImageFailed(false);
  };

  return (
    <div className="add-game-container">
      <header className="add-game-header">
        <div>
          <h2>Add a Game</h2>
          <p className="add-game-subtitle">Each game is saved as a file in the site's GitHub repo.</p>
        </div>
        <Link to="/media-reviews/games" className="back-link">View reviews →</Link>
      </header>

      {status && <div className={`add-game-status ${status.type}`}>{status.message}</div>}

      <div className="add-game-grid">
        <form className="add-game-card" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="game-name">Name</label>
            <input id="game-name" value={form.name} onChange={update('name')} required />
          </div>

          <div className="form-field">
            <label htmlFor="game-platform">Platform</label>
            <input
              id="game-platform"
              list="platform-options"
              value={form.platform}
              onChange={update('platform')}
              required
            />
            <datalist id="platform-options">
              {platforms.map((platform) => (
                <option key={platform} value={platform} />
              ))}
            </datalist>
          </div>

          <div className="form-field">
            <label htmlFor="game-developer">Developer</label>
            <input
              id="game-developer"
              list="developer-options"
              value={form.developer}
              onChange={update('developer')}
            />
            <datalist id="developer-options">
              {developers.map((developer) => (
                <option key={developer} value={developer} />
              ))}
            </datalist>
          </div>

          <div className="form-field">
            <label htmlFor="game-release">Release date</label>
            <input id="game-release" type="date" value={form.releaseDate} onChange={update('releaseDate')} />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="game-start">Started playing</label>
              <input
                id="game-start"
                type="date"
                value={form.playedStart}
                onChange={update('playedStart')}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="game-end">Finished</label>
              <input
                id="game-end"
                type="date"
                value={form.stillPlaying ? '' : form.playedEnd}
                onChange={update('playedEnd')}
                min={form.playedStart || undefined}
                disabled={form.stillPlaying}
              />
            </div>
          </div>

          <label className="form-checkbox">
            <input type="checkbox" checked={form.stillPlaying} onChange={update('stillPlaying')} />
            Still playing
          </label>

          <div className="form-field">
            <label htmlFor="game-score">Score (0–10, leave empty if not scored)</label>
            <input
              id="game-score"
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={form.score}
              onChange={update('score')}
            />
          </div>

          <div className="form-field">
            <label htmlFor="game-image">Cover image URL</label>
            <input id="game-image" type="url" value={form.imageUrl} onChange={update('imageUrl')} />
          </div>

          <div className="form-field">
            <label htmlFor="game-review">My thoughts</label>
            <textarea
              id="game-review"
              rows="6"
              value={form.review}
              onChange={update('review')}
              placeholder="Leave a blank line between paragraphs."
            />
          </div>

          <button type="submit" className="add-game-submit">
            Add Game
          </button>
        </form>

        <aside className="add-game-card add-game-preview">
          <h3>Cover preview</h3>
          <div className="preview-cover">
            {game.imageUrl && !imageFailed ? (
              <img src={game.imageUrl} alt="Cover preview" onError={() => setImageFailed(true)} />
            ) : (
              <div className={`preview-placeholder ${imageFailed ? 'failed' : ''}`}>{imageFailed ? 'Image did not load' : '🎮'}</div>
            )}
          </div>
        </aside>
      </div>

      {dialog && (
        <CommitDialog
          path={dialog.path}
          content={dialog.content}
          onKeepEditing={() => setDialog(null)}
          onDone={clearForm}
        />
      )}
    </div>
  );
}
