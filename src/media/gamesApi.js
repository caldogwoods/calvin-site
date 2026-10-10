import { supabase } from '../supabaseClient';

// Set to true when the Supabase `games` table is live (see supabase/games.sql).
// While false, the review page uses only games.json, and the add form shows the
// JSON entry to paste into games.json.
export const DB_ENABLED = false;

// The page uses the same camelCase shape as games.json; the table uses snake_case.
function fromRow(row) {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    developer: row.developer || '',
    releaseDate: row.release_date,
    playedStart: row.played_start,
    playedEnd: row.played_end,
    score: row.score === null ? null : Number(row.score),
    imageUrl: row.image_url || '',
    review: row.review || '',
  };
}

function toRow(game) {
  return {
    name: game.name,
    platform: game.platform,
    developer: game.developer || null,
    release_date: game.releaseDate,
    played_start: game.playedStart,
    played_end: game.playedEnd,
    score: game.score,
    image_url: game.imageUrl || null,
    review: game.review || null,
  };
}

export function gameKey(game) {
  return `${game.name}|${game.platform}|${game.playedStart}`.toLowerCase();
}

export async function fetchGames() {
  if (!DB_ENABLED) return [];
  const { data, error } = await supabase.from('games').select('*');
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function insertGame(game) {
  const { data, error } = await supabase.from('games').insert(toRow(game)).select().single();
  if (error) throw error;
  return fromRow(data);
}
