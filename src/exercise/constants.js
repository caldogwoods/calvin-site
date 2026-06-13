export const ACTIVITY_TYPES = [
  { name: 'Running', points: 0.3, multiplier: true },
  { name: 'Walking', points: 0.2, multiplier: true },
  { name: 'Cycling', points: 0.3, multiplier: true },
  { name: 'Gym Workout', points: 10, multiplier: false },
  { name: 'Yoga (~1 hour)', points: 5, multiplier: false },
  { name: 'Pushups', points: 1, multiplier: false },
  { name: 'Perfect Pushups (full set)', points: 6, multiplier: false },
  { name: 'HITT (~10 min)', points: 7, multiplier: false },
];

export const POINT_THRESHOLDS = [
  { points: 0, title: 'Level 1', emoji: '1️⃣' },
  { points: 10, title: 'Level 2', emoji: '2️⃣' },
  { points: 25, title: 'Level 3', emoji: '3️⃣' },
  { points: 50, title: 'Level 4', emoji: '4️⃣' },
  { points: 100, title: 'Level 5', emoji: '5️⃣' },
  { points: 200, title: 'Level 6', emoji: '6️⃣ ' },
  { points: 500, title: 'Level 7', emoji: '7️⃣' },
  { points: 1000, title: 'Level 8', emoji: '8️⃣' },
];
