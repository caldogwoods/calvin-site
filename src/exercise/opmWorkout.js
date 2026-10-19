// The daily One Punch Man workout. `goal` and the `chunks` buttons are in `unit`,
// which is also the unit of `amount` in the opm_logs table.
export const OPM_EXERCISES = [
  { key: 'pushups', label: 'Push-ups', unit: 'reps', goal: 100, chunks: [10, 20, 25] },
  { key: 'situps', label: 'Sit-ups', unit: 'reps', goal: 100, chunks: [10, 20, 25] },
  { key: 'plank', label: 'Plank', unit: 'seconds', goal: 600, chunks: [30, 60, 120] },
  { key: 'squats', label: 'Squats', unit: 'reps', goal: 100, chunks: [10, 20, 25] },
  { key: 'cardio', label: 'Cardio', unit: 'minutes', goal: 60, chunks: [10, 15, 30] },
];

function formatSeconds(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}

export function formatAmount(exercise, amount) {
  if (exercise.unit === 'seconds') return formatSeconds(amount);
  if (exercise.unit === 'minutes') return `${amount} min`;
  return String(amount);
}

export function formatChunk(exercise, amount) {
  if (exercise.unit === 'seconds') return amount < 60 ? `+${amount}s` : `+${formatSeconds(amount)}`;
  if (exercise.unit === 'minutes') return `+${amount}m`;
  return `+${amount}`;
}

export function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dateKey, days) {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function totalsByDay(logs) {
  const totals = {};
  for (const log of logs) {
    const day = (totals[log.log_date] = totals[log.log_date] || {});
    day[log.exercise] = (day[log.exercise] || 0) + log.amount;
  }
  return totals;
}

export function goalsMet(dayTotals = {}) {
  return OPM_EXERCISES.filter((exercise) => (dayTotals[exercise.key] || 0) >= exercise.goal).length;
}

export function currentStreak(totals, today) {
  const isComplete = (day) => goalsMet(totals[day]) === OPM_EXERCISES.length;

  let day = isComplete(today) ? today : addDays(today, -1);
  let streak = 0;
  while (isComplete(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}
