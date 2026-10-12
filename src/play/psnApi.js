import { supabase } from '../supabaseClient';

// Calls the `psn` Supabase edge function (supabase/functions/psn) as the
// signed-in user. Returns { status, games, updatedAt, warning? }.
async function callPsn(body) {
  const { data, error } = await supabase.functions.invoke('psn', { body });
  if (error) {
    let message = 'Could not reach the server. Try again later.';
    try {
      const details = await error.context.json();
      if (details.error) message = details.error;
    } catch {
      // Not a JSON error response; keep the general message
    }
    throw new Error(message);
  }
  return data;
}

export const getPsnGames = (refresh = false) => callPsn({ action: 'games', refresh });
export const linkPsn = (npsso) => callPsn({ action: 'link', npsso });
export const unlinkPsn = () => callPsn({ action: 'unlink' });
export const getPsnTrophies = (titleId, refresh = false) => callPsn({ action: 'trophies', titleId, refresh });

// Debugging: the unchanged PSN responses (game list, or one game's trophies). Not saved.
export async function getPsnRaw(titleId) {
  const result = await callPsn({ action: 'raw', titleId });
  if (result.status !== 'ok') throw new Error(`PlayStation account is ${result.status}.`);
  return result.raw;
}
