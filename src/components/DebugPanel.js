import React, { useEffect, useState } from 'react';
import './DebugPanel.css';

// Admin debugging: a "{ } Debug" button that opens a side panel with a JSON tree.
//   saved    the data the page uses (shown at once)
//   loadRaw  optional async function for the unchanged source data; it runs only
//            when the user clicks "Fetch"
//   name     used in the panel title and the downloaded file name

const MAX_CHILDREN = 100; // array/object entries shown before "Show more"

function typeOf(value) {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}

function JsonNode({ label, value, depth, openDepth }) {
  const type = typeOf(value);
  const isContainer = type === 'object' || type === 'array';
  const [open, setOpen] = useState(depth < openDepth);
  const [limit, setLimit] = useState(MAX_CHILDREN);

  const key = label !== undefined && <span className="json-key">{label}: </span>;

  if (!isContainer) {
    const text = type === 'string' ? JSON.stringify(value) : String(value);
    return (
      <div className="json-line">
        {key}
        <span className={`json-${type}`}>{text}</span>
      </div>
    );
  }

  const entries = type === 'array' ? value.map((v, i) => [i, v]) : Object.entries(value);
  const summary =
    type === 'array'
      ? `Array(${entries.length})`
      : `{${entries.length} ${entries.length === 1 ? 'key' : 'keys'}}`;

  return (
    <div className="json-node">
      <button
        type="button"
        className="json-toggle"
        onClick={() => {
          setOpen((o) => !o);
        }}
        aria-expanded={open}
      >
        <span className="json-caret" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        {key}
        <span className="json-summary">{summary}</span>
      </button>
      {open && (
        <div className="json-children">
          {entries.slice(0, limit).map(([k, v]) => (
            <JsonNode key={k} label={k} value={v} depth={depth + 1} openDepth={openDepth} />
          ))}
          {entries.length > limit && (
            <button
              type="button"
              className="json-more"
              onClick={() => {
                setLimit((n) => n + MAX_CHILDREN);
              }}
            >
              Show more ({entries.length - limit} left)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function download(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DebugPanel({ name, saved, loadRaw }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('saved');
  const [raw, setRaw] = useState(null);
  const [rawState, setRawState] = useState(''); // '' | 'loading' | error message
  const [copied, setCopied] = useState(false);
  // Changing this remounts the tree with every node open or closed
  const [treeKey, setTreeKey] = useState({ id: 0, openDepth: 1 });

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const fetchRaw = async () => {
    setRawState('loading');
    try {
      setRaw(await loadRaw());
      setRawState('');
    } catch (err) {
      setRawState(err.message);
    }
  };

  const data = tab === 'saved' ? saved : raw;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      setCopied(false);
    }
  };

  const closeOnBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setOpen(false);
    }
  };

  let body;
  if (tab === 'raw' && raw == null) {
    body = (
      <div className="debug-fetch">
        <p>
          The unchanged responses from PlayStation. This makes new PSN requests and is not saved.
        </p>
        <button
          type="button"
          className="ph-primary"
          onClick={fetchRaw}
          disabled={rawState === 'loading'}
        >
          {rawState === 'loading' ? 'Fetching…' : 'Fetch raw data'}
        </button>
        {rawState && rawState !== 'loading' && <p className="ph-error">{rawState}</p>}
      </div>
    );
  } else if (data == null) {
    body = <p className="debug-empty">No data yet.</p>;
  } else {
    body = (
      <JsonNode key={`${tab}-${treeKey.id}`} value={data} depth={0} openDepth={treeKey.openDepth} />
    );
  }

  return (
    <>
      <button
        type="button"
        className="debug-open"
        onClick={() => {
          setOpen(true);
        }}
        title="Show the data behind this view"
      >
        {'{ }'} Debug
      </button>

      {open && (
        <div className="debug-backdrop" role="presentation" onClick={closeOnBackdropClick}>
          <aside className="debug-panel" role="dialog" aria-label={`Debug: ${name}`}>
            <header className="debug-header">
              <h3>Debug: {name}</h3>
              <button
                type="button"
                className="debug-close"
                onClick={() => {
                  setOpen(false);
                }}
                aria-label="Close"
              >
                ×
              </button>
            </header>

            <div className="debug-toolbar">
              <div className="ph-sort" role="group" aria-label="Data">
                <button
                  type="button"
                  className={tab === 'saved' ? 'active' : ''}
                  onClick={() => {
                    setTab('saved');
                  }}
                >
                  Saved
                </button>
                {loadRaw && (
                  <button
                    type="button"
                    className={tab === 'raw' ? 'active' : ''}
                    onClick={() => {
                      setTab('raw');
                    }}
                  >
                    Raw from PSN
                  </button>
                )}
              </div>
              {data != null && (
                <div className="debug-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setTreeKey((k) => ({ id: k.id + 1, openDepth: 99 }));
                    }}
                  >
                    Expand all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTreeKey((k) => ({ id: k.id + 1, openDepth: 1 }));
                    }}
                  >
                    Collapse
                  </button>
                  <button type="button" onClick={copy}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      download(`${name}-${tab}`, data);
                    }}
                  >
                    Download
                  </button>
                </div>
              )}
            </div>

            <div className="debug-body">{body}</div>
          </aside>
        </div>
      )}
    </>
  );
}
