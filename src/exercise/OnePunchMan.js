import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import {
  OPM_EXERCISES,
  addDays,
  currentStreak,
  formatAmount,
  formatChunk,
  fromDateKey,
  goalsMet,
  toDateKey,
  totalsByDay,
} from './opmWorkout';
import './OnePunchMan.css';

const HISTORY_DAYS = 14;

function dayLabel(dateKey, today) {
  if (dateKey === today) {
    return 'Today';
  }
  if (dateKey === addDays(today, -1)) {
    return 'Yesterday';
  }
  return fromDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function ProgressBar({ label, total, goal }) {
  const percent = Math.round((total / goal) * 100);
  const fillWidth = Math.min(percent, 100);
  return (
    <div className="opm-progress">
      <div
        className="opm-progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={total}
      >
        <div
          className={`opm-progress-fill ${percent >= 100 ? 'done' : ''}`}
          style={{ width: `${fillWidth}%` }}
        />
      </div>
      <span className={`opm-percent ${percent > 100 ? 'over' : ''}`}>{percent}%</span>
    </div>
  );
}

function ExerciseCard({ exercise, entries, onAdd, onRemove }) {
  const [custom, setCustom] = useState('');
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const extra = total - exercise.goal;

  const addCustom = (e) => {
    e.preventDefault();
    const amount = Math.round(Number(custom));
    if (amount > 0) {
      onAdd(exercise.key, amount);
    }
    setCustom('');
  };

  return (
    <section className={`opm-card ${total >= exercise.goal ? 'done' : ''}`}>
      <header className="opm-card-header">
        <h3>{exercise.label}</h3>
        <span className="opm-total">
          <strong>{formatAmount(exercise, total)}</strong> / {formatAmount(exercise, exercise.goal)}
          {exercise.unit === 'reps' && ' reps'}
        </span>
      </header>

      <ProgressBar label={`${exercise.label} progress`} total={total} goal={exercise.goal} />
      {extra > 0 && <p className="opm-extra">{formatAmount(exercise, extra)} over the goal</p>}

      <div className="opm-add">
        {exercise.chunks.map((amount) => (
          <button
            key={amount}
            type="button"
            className="opm-chunk"
            onClick={() => {
              onAdd(exercise.key, amount);
            }}
          >
            {formatChunk(exercise, amount)}
          </button>
        ))}
        <form className="opm-custom" onSubmit={addCustom}>
          <input
            type="number"
            min="1"
            inputMode="numeric"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value);
            }}
            placeholder={exercise.unit}
            aria-label={`Custom ${exercise.label} amount in ${exercise.unit}`}
          />
          <button type="submit" disabled={!custom}>
            Add
          </button>
        </form>
      </div>

      {entries.length > 0 && (
        <ul className="opm-entries" aria-label={`${exercise.label} log`}>
          {entries.map((entry) => (
            <li key={entry.id}>
              {formatChunk(exercise, entry.amount)}
              <button
                type="button"
                onClick={() => {
                  onRemove(entry.id);
                }}
                aria-label={`Remove ${formatChunk(exercise, entry.amount)}`}
                title="Remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function History({ totals, today, selectedDay, onSelect }) {
  const days = Array.from({ length: HISTORY_DAYS }, (_, i) => addDays(today, i - HISTORY_DAYS + 1));
  return (
    <div className="opm-history" aria-label={`Last ${HISTORY_DAYS} days`}>
      {days.map((day) => {
        const met = goalsMet(totals[day]);
        return (
          <button
            key={day}
            type="button"
            className={`opm-history-day ${day === selectedDay ? 'selected' : ''}`}
            onClick={() => {
              onSelect(day);
            }}
            title={`${dayLabel(day, today)}: ${met} of ${OPM_EXERCISES.length} goals`}
          >
            <span className="opm-history-weekday">
              {fromDateKey(day).toLocaleDateString(undefined, { weekday: 'narrow' })}
            </span>
            <span className={`opm-history-dot level-${met}`}>{met || ''}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function OnePunchMan() {
  const { user } = useAuth();
  const today = toDateKey(new Date());
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(today);

  const fetchLogs = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('opm_logs')
      .select('id, exercise, amount, log_date')
      .eq('user_id', user.id)
      .order('created_at');
    if (queryError) {
      setError(`Could not load your log: ${queryError.message}`);
    } else {
      setLogs(data);
    }
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const addEntry = async (exercise, amount) => {
    setError('');
    const { data, error: queryError } = await supabase
      .from('opm_logs')
      .insert({ user_id: user.id, exercise, amount, log_date: selectedDay })
      .select('id, exercise, amount, log_date')
      .single();
    if (queryError) {
      setError(`Could not save: ${queryError.message}`);
    } else {
      setLogs((current) => [...current, data]);
    }
  };

  const removeEntry = async (id) => {
    setError('');
    const { error: queryError } = await supabase.from('opm_logs').delete().eq('id', id);
    if (queryError) {
      setError(`Could not remove: ${queryError.message}`);
    } else {
      setLogs((current) => current.filter((log) => log.id !== id));
    }
  };

  const totals = useMemo(() => totalsByDay(logs), [logs]);
  const streak = currentStreak(totals, today);
  const dayLogs = logs.filter((log) => log.log_date === selectedDay);
  const dayGoalsMet = goalsMet(totals[selectedDay]);

  if (loading) {
    return (
      <div className="opm-container">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="opm-container">
      <header className="opm-header">
        <div>
          <h2>One Punch Man Workout</h2>
          <p className="opm-subtitle">
            100 push-ups, 100 sit-ups, 10 minutes of plank, 100 squats, and 1 hour of cardio.
          </p>
        </div>
        <div className="opm-streak" title="Days in a row with every goal met">
          <span className="opm-streak-number">{streak}</span>
          <span>day streak</span>
        </div>
      </header>

      {error && <div className="opm-error">{error}</div>}

      <History totals={totals} today={today} selectedDay={selectedDay} onSelect={setSelectedDay} />

      <div className="opm-day">
        <button
          type="button"
          onClick={() => {
            setSelectedDay(addDays(selectedDay, -1));
          }}
          aria-label="Previous day"
        >
          ‹
        </button>
        <div className="opm-day-label">
          <h3>{dayLabel(selectedDay, today)}</h3>
          <span>
            {dayGoalsMet} of {OPM_EXERCISES.length} goals met
            {dayGoalsMet === OPM_EXERCISES.length && ' 👊'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedDay(addDays(selectedDay, 1));
          }}
          disabled={selectedDay === today}
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      <div className="opm-grid">
        {OPM_EXERCISES.map((exercise) => (
          <ExerciseCard
            key={exercise.key}
            exercise={exercise}
            entries={dayLogs.filter((log) => log.exercise === exercise.key)}
            onAdd={addEntry}
            onRemove={removeEntry}
          />
        ))}
      </div>
    </div>
  );
}
