import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MEDIA_TYPES } from './mediaTypes';
import { editFileUrl } from './github';
import { ComingSoon } from './MediaReviews';
import './ReviewTable.css';

// One sortable, expandable table for any review type. Columns and details come
// from mediaTypes.js; entries are the .json files in that type's folder.

const MAX_SCORE = 10;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Format "YYYY-MM-DD"
function formatDate(value) {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

const ARIA_SORT = { asc: 'ascending', desc: 'descending' };

const isMissing = (value) => value === null || value === undefined || value === '';
const resolve = (value, entry) => (typeof value === 'function' ? value(entry) : value);

function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
}

function scoreTier(score) {
  if (score >= 9) {
    return 'great';
  }
  if (score >= 7) {
    return 'good';
  }
  if (score >= 5) {
    return 'mixed';
  }
  return 'poor';
}

const MISSING = <span className="muted">—</span>;

function DateRange({ start, end, ongoingLabel }) {
  if (!start) {
    return MISSING;
  }
  return (
    <div className="played-range">
      <span>{formatDate(start)}</span>
      {!end && <span className="badge-ongoing">{ongoingLabel}</span>}
      {/* A one-day range (such as a movie) shows only the one date */}
      {end && end !== start && <span className="muted">to {formatDate(end)}</span>}
    </div>
  );
}

function Cell({ column, entry }) {
  const value = entry[column.key];
  switch (column.kind) {
    case 'range':
      return (
        <DateRange start={value} end={entry[column.endKey]} ongoingLabel={column.ongoingLabel} />
      );
    case 'date':
      return formatDate(value) || MISSING;
    case 'chip':
      return isMissing(value) ? MISSING : <span className="chip">{value}</span>;
    case 'score':
      return typeof value === 'number' ? (
        <span className={`score-badge score-${scoreTier(value)}`}>
          {value}
          <span className="score-max">/{MAX_SCORE}</span>
        </span>
      ) : (
        MISSING
      );
    default:
      return isMissing(value) ? MISSING : value;
  }
}

function CoverImage({ src, alt, icon }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="review-image review-image-placeholder" aria-hidden="true">
        {icon}
      </div>
    );
  }
  return (
    <img
      className="review-image"
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => {
        setFailed(true);
      }}
    />
  );
}

function Details({ config, entry, canEdit }) {
  const paragraphs = (entry.review || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const details = config.details.filter((detail) => !isMissing(entry[detail.key]));
  return (
    <div className="review-details">
      <dl className="details-meta">
        {details.map((detail) => (
          <div key={detail.key}>
            <dt>{resolve(detail.label, entry)}</dt>
            <dd>{entry[detail.key]}</dd>
          </div>
        ))}
      </dl>
      <div className="details-review">
        <h4>My thoughts</h4>
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
        ) : (
          <p className="muted">No thoughts written yet.</p>
        )}
      </div>
      {canEdit && (
        <a
          className="details-edit-link"
          href={editFileUrl(`${config.dir}/${entry.id}.json`)}
          target="_blank"
          rel="noreferrer"
        >
          Edit on GitHub ↗
        </a>
      )}
    </div>
  );
}

export default function ReviewTable({ type }) {
  const config = MEDIA_TYPES[type];
  const { entries, columns } = config;
  const [nameColumn, ...otherColumns] = columns;
  const { isAdmin } = useAuth();

  // Newest first by the date range column, if the type has one
  const [sort, setSort] = useState(() => {
    const range = columns.find((column) => column.kind === 'range');
    return range ? { key: range.key, dir: 'desc' } : { key: nameColumn.key, dir: 'asc' };
  });
  // ?open=<id> opens that row and scrolls to it (used by links from other pages)
  const [searchParams] = useSearchParams();
  const openId = searchParams.get('open');
  const [expanded, setExpanded] = useState(() => new Set(openId ? [openId] : []));

  useEffect(() => {
    if (!openId) {
      return;
    }
    setExpanded((prev) => new Set(prev).add(openId));
    const row = document.getElementById(`row-${type}-${openId}`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [openId, type]);

  const toggleExpanded = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const sorted = useMemo(() => {
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...entries].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      // Missing values always go last, whichever direction
      if (isMissing(av) && isMissing(bv)) {
        return 0;
      }
      if (isMissing(av)) {
        return 1;
      }
      if (isMissing(bv)) {
        return -1;
      }
      return compareValues(av, bv) * factor;
    });
  }, [entries, sort]);

  if (entries.length === 0) {
    return <ComingSoon icon={config.icon} title={config.title} />;
  }

  const handleSort = (column) => {
    setSort((prev) =>
      prev.key === column.key
        ? { key: column.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key: column.key, dir: column.defaultDir },
    );
  };

  const [one, many, verb] = config.count;

  return (
    <>
      <p className="reviews-subtitle">
        {entries.length} {entries.length === 1 ? one : many} {verb}
      </p>

      <div className="reviews-card">
        <table className="reviews-table">
          <thead>
            <tr>
              {columns.map((column) => {
                const active = sort.key === column.key;
                return (
                  <th
                    key={column.key}
                    className={`col-kind-${column.kind}`}
                    aria-sort={active ? ARIA_SORT[sort.dir] : 'none'}
                  >
                    <button
                      type="button"
                      className={`sort-button ${active ? 'active' : ''}`}
                      onClick={() => {
                        handleSort(column);
                      }}
                    >
                      {column.label}
                      <span className="sort-arrow" aria-hidden="true">
                        {active && sort.dir === 'desc' ? '▼' : '▲'}
                      </span>
                    </button>
                  </th>
                );
              })}
              <th className="col-image">
                <span className="visually-hidden">{config.imageLabel}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => {
              const isOpen = expanded.has(entry.id);
              const detailsId = `details-${type}-${entry.id}`;
              return (
                <React.Fragment key={entry.id}>
                  <tr
                    id={`row-${type}-${entry.id}`}
                    className={`review-row ${isOpen ? 'open' : ''} ${entry.id === openId ? 'linked' : ''}`}
                    onClick={() => {
                      toggleExpanded(entry.id);
                    }}
                  >
                    <td className="col-name">
                      <button
                        type="button"
                        className="row-toggle"
                        aria-expanded={isOpen}
                        aria-controls={detailsId}
                        onClick={(e) => {
                          // The row's own click handler toggles it
                          e.stopPropagation();
                          toggleExpanded(entry.id);
                        }}
                      >
                        <span className="row-chevron" aria-hidden="true">
                          ›
                        </span>
                        <span className="review-name">{entry[nameColumn.key]}</span>
                      </button>
                    </td>
                    {otherColumns.map((column) => (
                      <td
                        key={column.key}
                        className={`col-kind-${column.kind}`}
                        data-label={column.label}
                      >
                        <Cell column={column} entry={entry} />
                      </td>
                    ))}
                    <td className="col-image">
                      <CoverImage
                        src={entry.imageUrl}
                        alt={`${entry[nameColumn.key]} ${config.imageLabel.toLowerCase()}`}
                        icon={config.icon}
                      />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="details-row" id={detailsId}>
                      <td colSpan={columns.length + 1}>
                        <Details config={config} entry={entry} canEdit={isAdmin} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
