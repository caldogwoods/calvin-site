// PlayStation play history for the signed-in site user.
//
// POST body (JSON), with the user's Supabase session as the Bearer token:
//   { "action": "games" }                 the saved game list
//   { "action": "games", "refresh": true } fetch the game list from PSN now
//   { "action": "link", "npsso": "..." }  connect or reconnect the user's PSN account
//   { "action": "unlink" }                delete the user's token and all saved data
//   { "action": "trophies", "titleId": "PPSA01521_00" }
//                                         the saved trophies for one game, with the user's progress
//   { "action": "trophies", "titleId": "...", "refresh": true }
//                                         fetch that game's trophies from PSN now
//   { "action": "raw" }                   debugging: the unchanged PSN game list (not saved)
//   { "action": "raw", "titleId": "..." } debugging: the unchanged PSN trophy responses
//
// Data is fetched from PSN only when nothing is saved yet or the user asks for a
// refresh (at most once every REFRESH_MINUTES per list). Every response has a
// `status`: "unlinked", "ok", or "expired" (the NPSSO token stopped working; the
// user must reconnect), plus the saved data and its `updatedAt`.

import { createClient } from 'npm:@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Token encryption
// ---------------------------------------------------------------------------

// AES-GCM encryption for tokens stored in the database. The key is the
// PSN_TOKEN_KEY function secret: 32 random bytes, base64-encoded
// (for example, `openssl rand -base64 32`).

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

let keyPromise: Promise<CryptoKey> | null = null;

function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    const secret = Deno.env.get('PSN_TOKEN_KEY');
    if (!secret) {
      throw new Error('PSN_TOKEN_KEY is not set.');
    }
    keyPromise = crypto.subtle.importKey('raw', fromBase64(secret), 'AES-GCM', false, [
      'encrypt',
      'decrypt',
    ]);
  }
  return keyPromise;
}

/** Returns "iv.ciphertext", both base64. */
async function encrypt(plainText: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await getKey(),
    encoder.encode(plainText),
  );
  return `${toBase64(iv)}.${toBase64(new Uint8Array(cipher))}`;
}

async function decrypt(stored: string): Promise<string> {
  const [iv, cipher] = stored.split('.').map(fromBase64);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await getKey(), cipher);
  return decoder.decode(plain);
}

// ---------------------------------------------------------------------------
// PlayStation API
// ---------------------------------------------------------------------------

// Unofficial PlayStation app endpoints, as used by the psn-api library
// (https://github.com/achievements-app/psn-api). They can change without notice.

const AUTH_BASE_URL = 'https://ca.account.sony.com/api/authz/v3/oauth';
const GAMES_URL = 'https://m.np.playstation.com/api/gamelist/v2/users/me/titles';
const CLIENT_ID = '09515159-7237-4370-9b40-3806e67c0891';
const REDIRECT_URI = 'com.scee.psxandroid.scecompcall://redirect';
// Base64 of the PlayStation app's public "client_id:client_secret"
const BASIC_AUTH = 'MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=';
const PAGE_SIZE = 200;

const PLATFORMS: Record<string, string> = {
  ps5_native_game: 'PS5',
  ps4_game: 'PS4',
  unknown: 'PlayStation',
};

interface PsnGame {
  id: string;
  name: string;
  platform: string;
  imageUrl: string;
  playCount: number;
  playMinutes: number | null;
  firstPlayed: string;
  lastPlayed: string;
}

/** Thrown when Sony no longer accepts the NPSSO token; the user must sign in again. */
class ExpiredTokenError extends Error {}

/** NPSSO -> short-lived access token. NPSSO tokens last about 2 months. */
async function getAccessToken(npsso: string): Promise<string> {
  const params = new URLSearchParams({
    access_type: 'offline',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'psn:mobile.v2.core psn:clientapp',
  });
  const authorize = await fetch(`${AUTH_BASE_URL}/authorize?${params}`, {
    headers: { Cookie: `npsso=${npsso}` },
    redirect: 'manual',
  });
  await authorize.body?.cancel();
  const location = authorize.headers.get('location');
  const code = location && new URL(location).searchParams.get('code');
  if (!code) {
    throw new ExpiredTokenError('Sony did not accept the NPSSO token.');
  }

  const response = await fetch(`${AUTH_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${BASIC_AUTH}`,
    },
    body: new URLSearchParams({
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      token_format: 'jwt',
    }),
  });
  if (!response.ok) {
    throw new Error(`PSN token request failed: HTTP ${response.status}`);
  }
  return (await response.json()).access_token;
}

// "PT12H34M56S" (or "P1DT2H") -> whole minutes
function durationToMinutes(duration: string | undefined): number | null {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?)?$/.exec(duration || '');
  if (!match) {
    return null;
  }
  const [, days = '0', hours = '0', minutes = '0', seconds = '0'] = match;
  return Math.round(
    Number(days) * 1440 + Number(hours) * 60 + Number(minutes) + Number(seconds) / 60,
  );
}

/** The unchanged PSN game list entries, all pages. */
// deno-lint-ignore no-explicit-any
async function getRawGameTitles(accessToken: string): Promise<any[]> {
  // deno-lint-ignore no-explicit-any
  const titles: any[] = [];
  let offset = 0;
  for (;;) {
    const params = new URLSearchParams({
      categories: Object.keys(PLATFORMS).join(','),
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    const response = await fetch(`${GAMES_URL}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`PSN game list request failed: HTTP ${response.status}`);
    }
    const page = await response.json();
    titles.push(...page.titles);
    if (!page.nextOffset || page.titles.length === 0) {
      break;
    }
    offset = page.nextOffset;
  }
  return titles;
}

/** All PS4/PS5 games the account has played, most recently played first. */
async function getPlayedGames(accessToken: string): Promise<PsnGame[]> {
  return (await getRawGameTitles(accessToken))
    .map((title) => ({
      id: title.titleId,
      name: title.name,
      platform: PLATFORMS[title.category] || title.category,
      imageUrl: title.imageUrl,
      playCount: title.playCount,
      playMinutes: durationToMinutes(title.playDuration),
      firstPlayed: title.firstPlayedDateTime,
      lastPlayed: title.lastPlayedDateTime,
    }))
    .sort((a, b) => (b.lastPlayed || '').localeCompare(a.lastPlayed || ''));
}

const TROPHY_BASE_URL = 'https://m.np.playstation.com/api/trophy/v1';

// deno-lint-ignore no-explicit-any
async function psnGet(url: string, accessToken: string): Promise<any> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    throw new Error(`PSN request failed: HTTP ${response.status} for ${new URL(url).pathname}`);
  }
  return response.json();
}

const TROPHY_ORDER = ['platinum', 'gold', 'silver', 'bronze'];

/**
 * Every trophy for one game (by game list title id, such as "PPSA01521_00"),
 * merged with the user's progress. Returns null if the game has no trophy list.
 */
/**
 * The unchanged PSN trophy responses for one game: the title lookup, and (if the
 * game has a trophy list) the trophy definitions, the user's progress, and the groups.
 */
async function getRawTrophyResponses(accessToken: string, titleId: string) {
  const lookup = await psnGet(
    `${TROPHY_BASE_URL}/users/me/titles/trophyTitles?npTitleIds=${titleId}`,
    accessToken,
  );
  const title = lookup.titles?.[0]?.trophyTitles?.[0];
  if (!title) {
    return { lookup };
  }

  const id = title.npCommunicationId;
  const service = `npServiceName=${title.npServiceName}`;
  const [definitions, progress, groups] = await Promise.all([
    psnGet(
      `${TROPHY_BASE_URL}/npCommunicationIds/${id}/trophyGroups/all/trophies?${service}`,
      accessToken,
    ),
    psnGet(
      `${TROPHY_BASE_URL}/users/me/npCommunicationIds/${id}/trophyGroups/all/trophies?${service}`,
      accessToken,
    ),
    psnGet(`${TROPHY_BASE_URL}/npCommunicationIds/${id}/trophyGroups?${service}`, accessToken),
  ]);
  return { lookup, definitions, progress, groups };
}

async function getGameTrophies(accessToken: string, titleId: string) {
  const { lookup, definitions, progress, groups } = await getRawTrophyResponses(
    accessToken,
    titleId,
  );
  if (!definitions) {
    return null;
  }
  const title = lookup.titles[0].trophyTitles[0];

  // deno-lint-ignore no-explicit-any
  const earnedById = new Map(progress.trophies.map((t: any) => [t.trophyId, t]));
  // deno-lint-ignore no-explicit-any
  const trophies = definitions.trophies.map((t: any) => {
    // deno-lint-ignore no-explicit-any
    const mine: any = earnedById.get(t.trophyId) || {};
    return {
      id: t.trophyId,
      name: t.trophyName,
      detail: t.trophyDetail,
      iconUrl: t.trophyIconUrl,
      type: t.trophyType,
      hidden: t.trophyHidden,
      groupId: t.trophyGroupId,
      earned: Boolean(mine.earned),
      earnedAt: mine.earnedDateTime || null,
      // Percent of all players who earned it
      earnedRate: mine.trophyEarnedRate != null ? Number(mine.trophyEarnedRate) : null,
    };
  });

  return {
    name: title.trophyTitleName,
    iconUrl: title.trophyTitleIconUrl,
    platform: groups.trophyTitlePlatform,
    progress: title.progress,
    earnedCounts: title.earnedTrophies,
    definedCounts: title.definedTrophies,
    // deno-lint-ignore no-explicit-any
    groups: groups.trophyGroups.map((g: any) => ({ id: g.trophyGroupId, name: g.trophyGroupName })),
    trophies: trophies.sort(
      // deno-lint-ignore no-explicit-any
      (a: any, b: any) =>
        TROPHY_ORDER.indexOf(a.type) - TROPHY_ORDER.indexOf(b.type) || a.id - b.id,
    ),
  };
}

// ---------------------------------------------------------------------------
// Request handling
// ---------------------------------------------------------------------------

const REFRESH_MINUTES = 5;

const ALLOWED_ORIGINS = ['https://caldogwoods.github.io', 'http://localhost:3000'];

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: { persistSession: false },
  },
);

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

const minutesSince = (iso: string | null) =>
  iso ? (Date.now() - new Date(iso).getTime()) / 60000 : Infinity;

// deno-lint-ignore no-explicit-any
function linkedResponse(row: any, extra: Record<string, unknown> = {}) {
  return { status: row.status, games: row.games || [], updatedAt: row.games_updated_at, ...extra };
}

async function getGames(userId: string, refresh: boolean) {
  const { data: row, error } = await admin
    .from('psn_links')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!row) {
    return { status: 'unlinked' };
  }
  if (row.status === 'expired') {
    return linkedResponse(row);
  }

  // Use the saved list unless there is none, or a refresh was asked for (and allowed)
  const age = minutesSince(row.games_updated_at);
  if (row.games_updated_at && !(refresh && age > REFRESH_MINUTES)) {
    return linkedResponse(row);
  }

  try {
    const games = await getPlayedGames(await getAccessToken(await decrypt(row.npsso_encrypted)));
    const updatedAt = new Date().toISOString();
    await admin
      .from('psn_links')
      .update({ games, games_updated_at: updatedAt })
      .eq('user_id', userId);
    return { status: 'ok', games, updatedAt };
  } catch (err) {
    if (err instanceof ExpiredTokenError) {
      await admin.from('psn_links').update({ status: 'expired' }).eq('user_id', userId);
      return linkedResponse({ ...row, status: 'expired' });
    }
    // PSN is down or changed: keep showing the saved list
    console.error('PSN fetch failed:', err);
    return linkedResponse(row, { warning: 'Could not reach PlayStation. Showing saved data.' });
  }
}

async function link(userId: string, npsso: unknown) {
  if (typeof npsso !== 'string' || !/^[A-Za-z0-9]{40,100}$/.test(npsso.trim())) {
    return {
      error: 'That does not look like an NPSSO token. Copy only the value of "npsso".',
      httpStatus: 400,
    };
  }
  let games;
  try {
    games = await getPlayedGames(await getAccessToken(npsso.trim()));
  } catch (err) {
    if (err instanceof ExpiredTokenError) {
      return {
        error:
          'Sony did not accept that token. Sign in at playstation.com again and copy a new one.',
        httpStatus: 400,
      };
    }
    throw err;
  }
  const updatedAt = new Date().toISOString();
  const { error } = await admin.from('psn_links').upsert({
    user_id: userId,
    npsso_encrypted: await encrypt(npsso.trim()),
    status: 'ok',
    linked_at: updatedAt,
    games,
    games_updated_at: updatedAt,
  });
  if (error) {
    throw error;
  }
  return { status: 'ok', games, updatedAt };
}

type ActionResult = Record<string, unknown> & { httpStatus?: number };

async function trophies(userId: string, titleId: unknown, refresh: boolean): Promise<ActionResult> {
  if (typeof titleId !== 'string' || !/^[A-Z]{4}\d{5}_\d{2}$/.test(titleId)) {
    return { error: 'Unknown game.', httpStatus: 400 };
  }
  const { data: row, error } = await admin
    .from('psn_links')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!row) {
    return { status: 'unlinked' };
  }

  const { data: saved, error: savedError } = await admin
    .from('psn_trophies')
    .select('game, updated_at')
    .eq('user_id', userId)
    .eq('title_id', titleId)
    .maybeSingle();
  if (savedError) {
    throw savedError;
  }
  const savedResponse = (status: string, extra: Record<string, unknown> = {}) =>
    saved
      ? { status, game: saved.game, updatedAt: saved.updated_at, ...extra }
      : { status, ...extra };

  if (row.status === 'expired') {
    return savedResponse('expired');
  }
  // Use the saved trophies unless there are none, or a refresh was asked for (and allowed)
  if (saved && !(refresh && minutesSince(saved.updated_at) > REFRESH_MINUTES)) {
    return savedResponse('ok');
  }

  try {
    const accessToken = await getAccessToken(await decrypt(row.npsso_encrypted));
    const game = await getGameTrophies(accessToken, titleId);
    const updatedAt = new Date().toISOString();
    const { error: saveError } = await admin
      .from('psn_trophies')
      .upsert({ user_id: userId, title_id: titleId, game, updated_at: updatedAt });
    if (saveError) {
      throw saveError;
    }
    return { status: 'ok', game, updatedAt };
  } catch (err) {
    if (err instanceof ExpiredTokenError) {
      await admin.from('psn_links').update({ status: 'expired' }).eq('user_id', userId);
      return savedResponse('expired');
    }
    if (saved) {
      // PSN is down or changed: keep showing the saved trophies
      console.error('PSN trophy fetch failed:', err);
      return savedResponse('ok', { warning: 'Could not reach PlayStation. Showing saved data.' });
    }
    throw err;
  }
}

// Debugging: unchanged PSN responses for the signed-in user's own account. Not saved.
async function raw(userId: string, titleId: unknown): Promise<ActionResult> {
  if (titleId != null && (typeof titleId !== 'string' || !/^[A-Z]{4}\d{5}_\d{2}$/.test(titleId))) {
    return { error: 'Unknown game.', httpStatus: 400 };
  }
  const { data: row, error } = await admin
    .from('psn_links')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!row) {
    return { status: 'unlinked' };
  }
  try {
    const accessToken = await getAccessToken(await decrypt(row.npsso_encrypted));
    if (titleId) {
      return { status: 'ok', raw: await getRawTrophyResponses(accessToken, titleId as string) };
    }
    const titles = await getRawGameTitles(accessToken);
    return { status: 'ok', raw: { totalItemCount: titles.length, titles } };
  } catch (err) {
    if (err instanceof ExpiredTokenError) {
      await admin.from('psn_links').update({ status: 'expired' }).eq('user_id', userId);
      return { status: 'expired' };
    }
    throw err;
  }
}

Deno.serve(async (request) => {
  const headers = corsHeaders(request);
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });

  try {
    const jwt = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
    const {
      data: { user },
    } = await admin.auth.getUser(jwt);
    if (!user) {
      return json({ error: 'Not signed in.' }, 401);
    }

    const body = await request.json().catch(() => ({}));
    switch (body.action) {
      case 'games':
        return json(await getGames(user.id, Boolean(body.refresh)));
      case 'link': {
        const { httpStatus, ...result } = await link(user.id, body.npsso);
        return json(result, httpStatus || 200);
      }
      case 'trophies': {
        const { httpStatus, ...result } = await trophies(
          user.id,
          body.titleId,
          Boolean(body.refresh),
        );
        return json(result, httpStatus || 200);
      }
      case 'raw': {
        const { httpStatus, ...result } = await raw(user.id, body.titleId);
        return json(result, httpStatus || 200);
      }
      case 'unlink': {
        const { error } = await admin.from('psn_links').delete().eq('user_id', user.id);
        if (error) {
          throw error;
        }
        const { error: trophyError } = await admin
          .from('psn_trophies')
          .delete()
          .eq('user_id', user.id);
        if (trophyError) {
          throw trophyError;
        }
        return json({ status: 'unlinked' });
      }
      default:
        return json({ error: 'Unknown action.' }, 400);
    }
  } catch (err) {
    console.error(err);
    return json({ error: 'Something went wrong. Try again later.' }, 500);
  }
});
