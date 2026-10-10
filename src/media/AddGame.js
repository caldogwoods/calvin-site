import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import jsonGames from './games.json';
import { DB_ENABLED, insertGame } from './gamesApi';
import './AddGame.css';

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

// Convert the form state to the games.json shape
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

// Sorted list of the distinct values of one field, for input suggestions
function distinct(field) {
  return [...new Set(jsonGames.map((game) => game[field]).filter(Boolean))].sort();
}

// Shows the entry as games.json text, for pasting while there is no database
function JsonDialog({ json, note, onKeepEditing, onDone }) {
  const dialogRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const text = `${json},`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  useEffect(() => {
    // React StrictMode runs effects twice in dev, and showModal throws if already open
    if (!dialogRef.current.open) dialogRef.current.showModal();
    copy();
    // Run once when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <dialog ref={dialogRef} className="json-dialog" onCancel={onKeepEditing}>
      <h3>Paste into games.json</h3>
      {note && <p className="json-dialog-note">{note}</p>}
      <p className="json-dialog-hint">
        {copied ? 'Copied to your clipboard. ' : ''}
        Paste it on the line after the opening <code>[</code> in <code>src/media/games.json</code>,
        then deploy.
      </p>
      <pre className="json-output">{text}</pre>
      <div className="json-dialog-actions">
        <button type="button" className="dialog-button secondary" onClick={onKeepEditing}>
          Keep editing
        </button>
        <button type="button" className="dialog-button secondary" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button type="button" className="dialog-button primary" onClick={onDone}>
          Done, clear form
        </button>
      </div>
    </dialog>
  );
}

export default function AddGame() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message }
  const [imageFailed, setImageFailed] = useState(false);
  const [dialog, setDialog] = useState(null); // { json, note } while the JSON dialog is open

  const platforms = useMemo(() => distinct('platform'), []);
  const developers = useMemo(() => distinct('developer'), []);

  const game = toGame(form);

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'imageUrl') setImageFailed(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (game.playedEnd && game.playedStart && game.playedEnd < game.playedStart) {
      setStatus({ type: 'error', message: 'The end date must be on or after the start date.' });
      return;
    }

    const json = JSON.stringify(game, null, 2);
    if (!DB_ENABLED) {
      setDialog({ json });
      return;
    }

    setSubmitting(true);
    try {
      await insertGame(game);
      setStatus({ type: 'success', message: `Added "${game.name}".` });
      setForm(EMPTY_FORM);
    } catch (error) {
      console.error('Error adding game:', error);
      setDialog({ json, note: `Could not save to the database (${error.message}).` });
    } finally {
      setSubmitting(false);
    }
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
          <p className="add-game-subtitle">New entries show on the review page.</p>
        </div>
        <Link to="/media-reviews" className="back-link">View reviews →</Link>
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

          <button type="submit" className="add-game-submit" disabled={submitting}>
            {submitting ? 'Saving...' : DB_ENABLED ? 'Add Game' : 'Add Game (get JSON)'}
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
        <JsonDialog
          json={dialog.json}
          note={dialog.note}
          onKeepEditing={() => setDialog(null)}
          onDone={clearForm}
        />
      )}
    </div>
  );
}
