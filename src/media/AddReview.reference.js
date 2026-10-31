// A readable reference copy of AddReview.js. Nothing imports this file, so it is
// not part of the site. The live page is still AddReview.js.
//
// The live page builds every form from the `fields` lists in mediaTypes.js.
// This copy writes out each form by hand instead: one form state, one
// "form to review" function, and one fields component for each review type.
// It saves the same JSON, with the keys in the same order.

import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { games, books, shows } from './reviewFiles';
import { newFileUrl, slugify } from './github';
import './AddReview.css';

// Browsers and GitHub can reject very long URLs. Above this, suggest copying instead.
const MAX_GITHUB_URL_LENGTH = 8000;

const REVIEW_TYPES = {
  games: {
    label: 'Game',
    icon: '🎮',
    imageLabel: 'Cover',
    folder: 'src/media/reviews/games',
    existingReviews: games,
  },
  books: {
    label: 'Book',
    icon: '📚',
    imageLabel: 'Cover',
    folder: 'src/media/reviews/books',
    existingReviews: books,
  },
  shows: {
    label: 'Movie / Show',
    icon: '🎬',
    imageLabel: 'Poster',
    folder: 'src/media/reviews/shows',
    existingReviews: shows,
  },
};

const TYPE_NAMES = Object.keys(REVIEW_TYPES);

// ---------------------------------------------------------------------------
// Values from older reviews, offered as suggestions while you type
// ---------------------------------------------------------------------------

function pastValues(reviews, key) {
  const values = reviews.map((review) => review[key]).filter(Boolean);
  return [...new Set(values)].sort();
}

const PAST_PLATFORMS = pastValues(games, 'platform');
const PAST_DEVELOPERS = pastValues(games, 'developer');
const PAST_AUTHORS = pastValues(books, 'author');
const PAST_GENRES = pastValues(books, 'genre');
const PAST_CREATORS = pastValues(shows, 'creator');

// ---------------------------------------------------------------------------
// Converting what was typed into what is saved
// ---------------------------------------------------------------------------

function dateOrNull(date) {
  if (date === '') {
    return null;
  }
  return date;
}

function numberOrNull(text) {
  if (text === '') {
    return null;
  }
  return Number(text);
}

function endDateOrNull(endDate, isOngoing) {
  if (isOngoing) {
    return null;
  }
  return dateOrNull(endDate);
}

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

function emptyGameForm() {
  return {
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
}

// The PlayStation page links here with some values already known.
// See reviewPrefill() in src/play/PsnGameTrophies.js.
function gameFormFromPrefill(values) {
  return {
    ...emptyGameForm(),
    name: values.name || '',
    platform: values.platform || '',
    imageUrl: values.imageUrl || '',
    playedStart: values.playedStart || '',
    playedEnd: values.playedEnd || '',
    stillPlaying: Boolean(values.playedEndOngoing),
  };
}

function gameFormToReview(form) {
  return {
    name: form.name.trim(),
    platform: form.platform.trim(),
    developer: form.developer.trim(),
    releaseDate: dateOrNull(form.releaseDate),
    playedStart: dateOrNull(form.playedStart),
    playedEnd: endDateOrNull(form.playedEnd, form.stillPlaying),
    score: numberOrNull(form.score),
    imageUrl: form.imageUrl.trim(),
    review: form.review.trim(),
  };
}

function GameFields({ form, setForm }) {
  const setValue = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <>
      <TextField
        id="game-name"
        label="Name"
        value={form.name}
        onChange={(value) => {
          setValue('name', value);
        }}
        required
      />
      <TextField
        id="game-platform"
        label="Platform"
        value={form.platform}
        onChange={(value) => {
          setValue('platform', value);
        }}
        suggestions={PAST_PLATFORMS}
        required
      />
      <TextField
        id="game-developer"
        label="Developer"
        value={form.developer}
        onChange={(value) => {
          setValue('developer', value);
        }}
        suggestions={PAST_DEVELOPERS}
      />
      <DateField
        id="game-release-date"
        label="Release date"
        value={form.releaseDate}
        onChange={(value) => {
          setValue('releaseDate', value);
        }}
      />
      <DateRangeFields
        idPrefix="game-played"
        startLabel="Started playing"
        endLabel="Finished"
        ongoingLabel="Still playing"
        startDate={form.playedStart}
        endDate={form.playedEnd}
        isOngoing={form.stillPlaying}
        onStartDateChange={(value) => {
          setValue('playedStart', value);
        }}
        onEndDateChange={(value) => {
          setValue('playedEnd', value);
        }}
        onOngoingChange={(value) => {
          setValue('stillPlaying', value);
        }}
      />
      <ScoreField
        id="game-score"
        value={form.score}
        onChange={(value) => {
          setValue('score', value);
        }}
      />
      <TextField
        id="game-image-url"
        label="Cover image URL"
        inputType="url"
        value={form.imageUrl}
        onChange={(value) => {
          setValue('imageUrl', value);
        }}
      />
      <ReviewTextField
        id="game-review"
        value={form.review}
        onChange={(value) => {
          setValue('review', value);
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------------

function emptyBookForm() {
  return {
    name: '',
    author: '',
    genre: '',
    pages: '',
    releaseDate: '',
    readStart: '',
    readEnd: '',
    stillReading: false,
    score: '',
    imageUrl: '',
    review: '',
  };
}

function bookFormToReview(form) {
  return {
    name: form.name.trim(),
    author: form.author.trim(),
    genre: form.genre.trim(),
    pages: numberOrNull(form.pages),
    releaseDate: dateOrNull(form.releaseDate),
    readStart: dateOrNull(form.readStart),
    readEnd: endDateOrNull(form.readEnd, form.stillReading),
    score: numberOrNull(form.score),
    imageUrl: form.imageUrl.trim(),
    review: form.review.trim(),
  };
}

function BookFields({ form, setForm }) {
  const setValue = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <>
      <TextField
        id="book-name"
        label="Title"
        value={form.name}
        onChange={(value) => {
          setValue('name', value);
        }}
        required
      />
      <TextField
        id="book-author"
        label="Author"
        value={form.author}
        onChange={(value) => {
          setValue('author', value);
        }}
        suggestions={PAST_AUTHORS}
        required
      />
      <TextField
        id="book-genre"
        label="Genre"
        value={form.genre}
        onChange={(value) => {
          setValue('genre', value);
        }}
        suggestions={PAST_GENRES}
      />
      <NumberField
        id="book-pages"
        label="Pages"
        value={form.pages}
        onChange={(value) => {
          setValue('pages', value);
        }}
        min={1}
        step={1}
      />
      <DateField
        id="book-release-date"
        label="Published"
        value={form.releaseDate}
        onChange={(value) => {
          setValue('releaseDate', value);
        }}
      />
      <DateRangeFields
        idPrefix="book-read"
        startLabel="Started reading"
        endLabel="Finished"
        ongoingLabel="Still reading"
        startDate={form.readStart}
        endDate={form.readEnd}
        isOngoing={form.stillReading}
        onStartDateChange={(value) => {
          setValue('readStart', value);
        }}
        onEndDateChange={(value) => {
          setValue('readEnd', value);
        }}
        onOngoingChange={(value) => {
          setValue('stillReading', value);
        }}
      />
      <ScoreField
        id="book-score"
        value={form.score}
        onChange={(value) => {
          setValue('score', value);
        }}
      />
      <TextField
        id="book-image-url"
        label="Cover image URL"
        inputType="url"
        value={form.imageUrl}
        onChange={(value) => {
          setValue('imageUrl', value);
        }}
      />
      <ReviewTextField
        id="book-review"
        value={form.review}
        onChange={(value) => {
          setValue('review', value);
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Movies and shows
// ---------------------------------------------------------------------------

function emptyShowForm() {
  return {
    kind: 'Movie',
    name: '',
    creator: '',
    seasons: '',
    releaseDate: '',
    watchedStart: '',
    watchedEnd: '',
    stillWatching: false,
    score: '',
    imageUrl: '',
    review: '',
  };
}

function showFormToReview(form) {
  const isMovie = form.kind === 'Movie';
  const watchedStart = dateOrNull(form.watchedStart);

  // A movie is watched on one day, and it has no seasons
  let watchedEnd = endDateOrNull(form.watchedEnd, form.stillWatching);
  let seasons = numberOrNull(form.seasons);
  if (isMovie) {
    watchedEnd = watchedStart;
    seasons = null;
  }

  return {
    kind: form.kind,
    name: form.name.trim(),
    creator: form.creator.trim(),
    seasons,
    releaseDate: dateOrNull(form.releaseDate),
    watchedStart,
    watchedEnd,
    score: numberOrNull(form.score),
    imageUrl: form.imageUrl.trim(),
    review: form.review.trim(),
  };
}

function ShowFields({ form, setForm }) {
  const isMovie = form.kind === 'Movie';

  const setValue = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <>
      <SelectField
        id="show-kind"
        label="Type"
        options={['Movie', 'Show']}
        value={form.kind}
        onChange={(value) => {
          setValue('kind', value);
        }}
      />
      <TextField
        id="show-name"
        label="Title"
        value={form.name}
        onChange={(value) => {
          setValue('name', value);
        }}
        required
      />
      <TextField
        id="show-creator"
        label={isMovie ? 'Director' : 'Creator'}
        value={form.creator}
        onChange={(value) => {
          setValue('creator', value);
        }}
        suggestions={PAST_CREATORS}
      />
      {!isMovie && (
        <NumberField
          id="show-seasons"
          label="Seasons watched"
          value={form.seasons}
          onChange={(value) => {
            setValue('seasons', value);
          }}
          min={1}
          step={1}
        />
      )}
      <DateField
        id="show-release-date"
        label="Release date"
        value={form.releaseDate}
        onChange={(value) => {
          setValue('releaseDate', value);
        }}
      />
      {isMovie && (
        <DateField
          id="show-watched-start"
          label="Date watched"
          value={form.watchedStart}
          onChange={(value) => {
            setValue('watchedStart', value);
          }}
          required
        />
      )}
      {!isMovie && (
        <DateRangeFields
          idPrefix="show-watched"
          startLabel="Started watching"
          endLabel="Finished"
          ongoingLabel="Still watching"
          startDate={form.watchedStart}
          endDate={form.watchedEnd}
          isOngoing={form.stillWatching}
          onStartDateChange={(value) => {
            setValue('watchedStart', value);
          }}
          onEndDateChange={(value) => {
            setValue('watchedEnd', value);
          }}
          onOngoingChange={(value) => {
            setValue('stillWatching', value);
          }}
        />
      )}
      <ScoreField
        id="show-score"
        value={form.score}
        onChange={(value) => {
          setValue('score', value);
        }}
      />
      <TextField
        id="show-image-url"
        label="Poster image URL"
        inputType="url"
        value={form.imageUrl}
        onChange={(value) => {
          setValue('imageUrl', value);
        }}
      />
      <ReviewTextField
        id="show-review"
        value={form.review}
        onChange={(value) => {
          setValue('review', value);
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Inputs shared by all three forms. Each one gives back the new value, not the
// change event.
// ---------------------------------------------------------------------------

function TextField({ id, label, value, onChange, inputType = 'text', suggestions, required }) {
  const suggestionListId = `${id}-suggestions`;
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={inputType}
        list={suggestions ? suggestionListId : undefined}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        required={required}
      />
      {suggestions && (
        <datalist id={suggestionListId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} aria-label={suggestion} />
          ))}
        </datalist>
      )}
    </div>
  );
}

function NumberField({ id, label, value, onChange, min, max, step }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </div>
  );
}

function ScoreField({ id, value, onChange }) {
  return (
    <NumberField
      id={id}
      label="Score (0–10, leave empty if not scored)"
      value={value}
      onChange={onChange}
      min={0}
      max={10}
      step={0.5}
    />
  );
}

function DateField({ id, label, value, onChange, min, disabled, required }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        min={min}
        disabled={disabled}
        required={required}
      />
    </div>
  );
}

function SelectField({ id, label, options, value, onChange }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function ReviewTextField({ id, value, onChange }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>My thoughts</label>
      <textarea
        id={id}
        rows="6"
        placeholder="Leave a blank line between paragraphs."
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </div>
  );
}

// A start date, an end date, and a "still ..." box. While the box is checked,
// the end date is turned off and saved as null.
function DateRangeFields({
  idPrefix,
  startLabel,
  endLabel,
  ongoingLabel,
  startDate,
  endDate,
  isOngoing,
  onStartDateChange,
  onEndDateChange,
  onOngoingChange,
}) {
  let shownEndDate = endDate;
  if (isOngoing) {
    shownEndDate = '';
  }

  return (
    <>
      <div className="form-row">
        <DateField
          id={`${idPrefix}-start`}
          label={startLabel}
          value={startDate}
          onChange={onStartDateChange}
          required
        />
        <DateField
          id={`${idPrefix}-end`}
          label={endLabel}
          value={shownEndDate}
          onChange={onEndDateChange}
          min={startDate || undefined}
          disabled={isOngoing}
        />
      </div>
      <label className="form-checkbox">
        <input
          type="checkbox"
          checked={isOngoing}
          onChange={(e) => {
            onOngoingChange(e.target.checked);
          }}
        />
        {ongoingLabel}
      </label>
    </>
  );
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

// The file name comes from the review's name. If a review already uses that
// name, add the start year. If that is also used, add 2, 3, and so on.
function newFileName(typeName, reviewName, startDate) {
  const usedNames = new Set(REVIEW_TYPES[typeName].existingReviews.map((review) => review.id));
  const baseName = slugify(reviewName) || typeName;
  if (!usedNames.has(baseName)) {
    return baseName;
  }

  if (startDate) {
    const startYear = startDate.slice(0, 4);
    const nameWithYear = `${baseName}-${startYear}`;
    if (!usedNames.has(nameWithYear)) {
      return nameWithYear;
    }
  }

  let number = 2;
  while (usedNames.has(`${baseName}-${number}`)) {
    number += 1;
  }
  return `${baseName}-${number}`;
}

// Shows the new file, and a link that opens it on GitHub with the file already filled in
function CommitDialog({ filePath, fileContent, onKeepEditing, onDone }) {
  const dialogRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const githubUrl = newFileUrl(filePath, fileContent);
  const urlIsTooLong = githubUrl.length > MAX_GITHUB_URL_LENGTH;

  useEffect(() => {
    // React StrictMode runs effects twice in dev, and showModal throws if the dialog is open
    if (!dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, []);

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(fileContent);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="json-dialog"
      onCancel={onKeepEditing}
    >
      <h3>Commit on GitHub</h3>
      <p className="json-dialog-hint">
        Click <strong>Open on GitHub</strong>, then <strong>Commit changes</strong>. The site
        updates about 2 minutes later once GitHub actions completes its process.
      </p>
      {urlIsTooLong && (
        <p className="json-dialog-note">
          This entry is long, and GitHub may not accept it in a link. If the file opens empty, copy
          the JSON and paste it in.
        </p>
      )}
      <p className="json-dialog-path">
        <code>{filePath}</code>
      </p>
      <pre className="json-output">{fileContent}</pre>
      <div className="json-dialog-actions">
        <button type="button" className="dialog-button secondary" onClick={onKeepEditing}>
          Keep editing
        </button>
        <button type="button" className="dialog-button secondary" onClick={copyJson}>
          {copied ? 'Copied' : 'Copy JSON'}
        </button>
        <button type="button" className="dialog-button secondary" onClick={onDone}>
          Done, clear form
        </button>
        <a className="dialog-button primary" href={githubUrl} target="_blank" rel="noreferrer">
          Open on GitHub ↗
        </a>
      </div>
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

// Give this a `key` that changes with the URL, so a new URL starts with a fresh
// "did it fail to load" state
function ImagePreview({ imageUrl, imageLabel, icon }) {
  const [failedToLoad, setFailedToLoad] = useState(false);

  if (failedToLoad) {
    return <div className="preview-placeholder failed">Image did not load</div>;
  }
  if (!imageUrl) {
    return <div className="preview-placeholder">{icon}</div>;
  }
  return (
    <img
      src={imageUrl}
      alt={`${imageLabel} preview`}
      onError={() => {
        setFailedToLoad(true);
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

export default function AddReview() {
  const [searchParams, setSearchParams] = useSearchParams();
  let typeName = searchParams.get('type');
  if (!TYPE_NAMES.includes(typeName)) {
    typeName = 'games';
  }
  const reviewType = REVIEW_TYPES[typeName];

  // Other pages can open this page with known values: { prefill: { type, values, source } }.
  // Only the PlayStation page does this, and only for games.
  const prefill = useLocation().state?.prefill;

  // One form for each type, so switching types does not lose what was typed
  const [gameForm, setGameForm] = useState(() => {
    if (prefill?.type === 'games') {
      return gameFormFromPrefill(prefill.values);
    }
    return emptyGameForm();
  });
  const [bookForm, setBookForm] = useState(emptyBookForm);
  const [showForm, setShowForm] = useState(emptyShowForm);

  const [errorMessage, setErrorMessage] = useState('');
  const [fileToCommit, setFileToCommit] = useState(null); // { path, content } while the dialog is open

  let review;
  let startDate;
  let endDate;
  let formFields;
  let clearForm;
  if (typeName === 'books') {
    review = bookFormToReview(bookForm);
    startDate = review.readStart;
    endDate = review.readEnd;
    formFields = <BookFields form={bookForm} setForm={setBookForm} />;
    clearForm = () => {
      setBookForm(emptyBookForm());
    };
  } else if (typeName === 'shows') {
    review = showFormToReview(showForm);
    startDate = review.watchedStart;
    endDate = review.watchedEnd;
    formFields = <ShowFields form={showForm} setForm={setShowForm} />;
    clearForm = () => {
      setShowForm(emptyShowForm());
    };
  } else {
    review = gameFormToReview(gameForm);
    startDate = review.playedStart;
    endDate = review.playedEnd;
    formFields = <GameFields form={gameForm} setForm={setGameForm} />;
    clearForm = () => {
      setGameForm(emptyGameForm());
    };
  }

  const switchType = (newTypeName) => {
    setSearchParams({ type: newTypeName }, { replace: true });
    setErrorMessage('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (startDate && endDate && endDate < startDate) {
      setErrorMessage('The end date must be on or after the start date.');
      return;
    }
    setErrorMessage('');

    const fileName = newFileName(typeName, review.name, startDate);
    setFileToCommit({
      path: `${reviewType.folder}/${fileName}.json`,
      content: `${JSON.stringify(review, null, 2)}\n`,
    });
  };

  const showPrefillNotice = prefill?.source && prefill.type === typeName;

  return (
    <div className="add-review-container">
      <header className="add-review-header">
        <div>
          <h2>Add a Review</h2>
          <p className="add-review-subtitle">
            Each review is saved as a file in the site’s GitHub repo.
          </p>
        </div>
        <Link to={`/media-reviews/${typeName}`} className="back-link">
          View reviews →
        </Link>
      </header>

      <div className="type-switch" role="radiogroup" aria-label="Review type">
        {TYPE_NAMES.map((name) => (
          <label key={name} className={`type-option ${name === typeName ? 'active' : ''}`}>
            <input
              type="radio"
              name="review-type"
              value={name}
              checked={name === typeName}
              onChange={() => {
                switchType(name);
              }}
            />
            <span aria-hidden="true">{REVIEW_TYPES[name].icon}</span>
            {REVIEW_TYPES[name].label}
          </label>
        ))}
      </div>

      {showPrefillNotice && (
        <div className="add-review-status info">
          Some fields are filled in from your {prefill.source} data. Check them before you save.
        </div>
      )}

      {errorMessage && <div className="add-review-status error">{errorMessage}</div>}

      <div className="add-review-grid">
        <form className="add-review-card" onSubmit={handleSubmit} key={typeName}>
          {formFields}
          <button type="submit" className="add-review-submit">
            Add {reviewType.label}
          </button>
        </form>

        <aside className="add-review-card add-review-preview">
          <h3>{reviewType.imageLabel} preview</h3>
          <div className="preview-cover">
            <ImagePreview
              key={`${typeName} ${review.imageUrl}`}
              imageUrl={review.imageUrl}
              imageLabel={reviewType.imageLabel}
              icon={reviewType.icon}
            />
          </div>
        </aside>
      </div>

      {fileToCommit && (
        <CommitDialog
          filePath={fileToCommit.path}
          fileContent={fileToCommit.content}
          onKeepEditing={() => {
            setFileToCommit(null);
          }}
          onDone={() => {
            setFileToCommit(null);
            clearForm();
          }}
        />
      )}
    </div>
  );
}
