import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MEDIA_TYPES, TYPE_KEYS } from './mediaTypes';
import { newFileUrl, slugify } from './github';
import './AddReview.css';

// Browsers and GitHub can reject very long URLs; above this, suggest copying instead
const MAX_URL_LENGTH = 8000;

const ongoingKey = (field) => `${field.endKey}Ongoing`;
const resolve = (value, form) => (typeof value === 'function' ? value(form) : value);

function emptyForm(type) {
  const form = {};
  MEDIA_TYPES[type].fields.forEach((field) => {
    if (field.type === 'range') {
      form[field.startKey] = '';
      form[field.endKey] = '';
      form[ongoingKey(field)] = false;
    } else if (field.type === 'select') {
      form[field.key] = field.options[0];
    } else {
      form[field.key] = '';
    }
  });
  return form;
}

// Convert the form state to the shape of an entry file
function toEntry(type, form) {
  const entry = {};
  MEDIA_TYPES[type].fields.forEach((field) => {
    if (field.type === 'range') {
      const start = form[field.startKey] || null;
      entry[field.startKey] = start;
      if (field.singleIf && field.singleIf(form)) entry[field.endKey] = start;
      else if (form[ongoingKey(field)]) entry[field.endKey] = null;
      else entry[field.endKey] = form[field.endKey] || null;
      return;
    }
    const value = form[field.key];
    if (field.showIf && !field.showIf(form)) entry[field.key] = null;
    else if (field.type === 'number') entry[field.key] = value === '' ? null : Number(value);
    else if (field.type === 'date') entry[field.key] = value || null;
    else entry[field.key] = typeof value === 'string' ? value.trim() : value;
  });
  return entry;
}

// File name for a new entry; adds the start year (or a number) if the name is taken
function uniqueId(type, entry) {
  const ids = new Set(MEDIA_TYPES[type].entries.map((e) => e.id));
  const base = slugify(entry.name || '') || type;
  if (!ids.has(base)) return base;
  const range = MEDIA_TYPES[type].fields.find((field) => field.type === 'range');
  const year = range && entry[range.startKey] && entry[range.startKey].slice(0, 4);
  if (year && !ids.has(`${base}-${year}`)) return `${base}-${year}`;
  let n = 2;
  while (ids.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

// Sorted distinct values of one field across a type's entries, for input suggestions
function distinct(type, key) {
  return [...new Set(MEDIA_TYPES[type].entries.map((e) => e[key]).filter(Boolean))].sort();
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

function SuggestInput({ id, type, field, ...props }) {
  const options = useMemo(() => distinct(type, field.key), [type, field.key]);
  return (
    <>
      <input id={id} list={`${id}-options`} {...props} />
      <datalist id={`${id}-options`}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}

function Field({ type, field, form, update }) {
  if (field.showIf && !field.showIf(form)) return null;

  if (field.type === 'range') {
    const single = field.singleIf && field.singleIf(form);
    const ongoing = form[ongoingKey(field)];
    const startId = `${type}-${field.startKey}`;
    const endId = `${type}-${field.endKey}`;
    return (
      <>
        <div className={single ? '' : 'form-row'}>
          <div className="form-field">
            <label htmlFor={startId}>{resolve(field.startLabel, form)}</label>
            <input
              id={startId}
              type="date"
              value={form[field.startKey]}
              onChange={update(field.startKey)}
              required
            />
          </div>
          {!single && (
            <div className="form-field">
              <label htmlFor={endId}>{resolve(field.endLabel, form)}</label>
              <input
                id={endId}
                type="date"
                value={ongoing ? '' : form[field.endKey]}
                onChange={update(field.endKey)}
                min={form[field.startKey] || undefined}
                disabled={ongoing}
              />
            </div>
          )}
        </div>
        {!single && (
          <label className="form-checkbox">
            <input type="checkbox" checked={ongoing} onChange={update(ongoingKey(field))} />
            {field.ongoingLabel}
          </label>
        )}
      </>
    );
  }

  const id = `${type}-${field.key}`;
  const common = {
    id,
    value: form[field.key],
    onChange: update(field.key),
    required: field.required,
  };

  let input;
  if (field.type === 'textarea') {
    input = <textarea rows="6" placeholder={field.placeholder} {...common} />;
  } else if (field.type === 'select') {
    input = (
      <select {...common}>
        {field.options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  } else if (field.suggest) {
    input = <SuggestInput type={type} field={field} {...common} />;
  } else {
    input = (
      <input type={field.type} min={field.min} max={field.max} step={field.step} {...common} />
    );
  }

  return (
    <div className="form-field">
      <label htmlFor={id}>{resolve(field.label, form)}</label>
      {input}
    </div>
  );
}

export default function AddReview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const type = TYPE_KEYS.includes(searchParams.get('type')) ? searchParams.get('type') : 'games';
  const config = MEDIA_TYPES[type];

  // One form per type, so switching types does not lose what was typed
  const [forms, setForms] = useState(() =>
    Object.fromEntries(TYPE_KEYS.map((key) => [key, emptyForm(key)]))
  );
  const [status, setStatus] = useState(null); // { type: 'error', message }
  const [imageFailed, setImageFailed] = useState(false);
  const [dialog, setDialog] = useState(null); // { path, content } while the dialog is open

  const form = forms[type];
  const entry = toEntry(type, form);

  const setType = (next) => {
    setSearchParams({ type: next }, { replace: true });
    setStatus(null);
    setImageFailed(false);
  };

  const update = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForms((prev) => ({ ...prev, [type]: { ...prev[type], [key]: value } }));
    if (key === 'imageUrl') setImageFailed(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus(null);

    const range = config.fields.find((field) => field.type === 'range');
    const start = range && entry[range.startKey];
    const end = range && entry[range.endKey];
    if (start && end && end < start) {
      setStatus({ type: 'error', message: 'The end date must be on or after the start date.' });
      return;
    }

    setDialog({
      path: `${config.dir}/${uniqueId(type, entry)}.json`,
      content: `${JSON.stringify(entry, null, 2)}\n`,
    });
  };

  const clearForm = () => {
    setDialog(null);
    setForms((prev) => ({ ...prev, [type]: emptyForm(type) }));
    setImageFailed(false);
  };

  return (
    <div className="add-review-container">
      <header className="add-review-header">
        <div>
          <h2>Add a Review</h2>
          <p className="add-review-subtitle">Each review is saved as a file in the site's GitHub repo.</p>
        </div>
        <Link to={`/media-reviews/${type}`} className="back-link">View reviews →</Link>
      </header>

      <div className="type-switch" role="radiogroup" aria-label="Review type">
        {TYPE_KEYS.map((key) => (
          <label key={key} className={`type-option ${key === type ? 'active' : ''}`}>
            <input
              type="radio"
              name="review-type"
              value={key}
              checked={key === type}
              onChange={() => setType(key)}
            />
            <span aria-hidden="true">{MEDIA_TYPES[key].icon}</span>
            {MEDIA_TYPES[key].label}
          </label>
        ))}
      </div>

      {status && <div className={`add-review-status ${status.type}`}>{status.message}</div>}

      <div className="add-review-grid">
        <form className="add-review-card" onSubmit={handleSubmit} key={type}>
          {config.fields.map((field) => (
            <Field
              key={field.key || field.startKey}
              type={type}
              field={field}
              form={form}
              update={update}
            />
          ))}

          <button type="submit" className="add-review-submit">
            Add {config.label}
          </button>
        </form>

        <aside className="add-review-card add-review-preview">
          <h3>{config.imageLabel} preview</h3>
          <div className="preview-cover">
            {entry.imageUrl && !imageFailed ? (
              <img
                src={entry.imageUrl}
                alt={`${config.imageLabel} preview`}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className={`preview-placeholder ${imageFailed ? 'failed' : ''}`}>
                {imageFailed ? 'Image did not load' : config.icon}
              </div>
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
