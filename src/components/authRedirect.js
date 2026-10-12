// Pages that send the user to /login or /register pass the page they came from
// as link state: { from: location }. After signing in, the user goes back there.

/** Where to go after signing in or registering: the page the user came from, or home. */
export function returnPath(location) {
  const from = location.state?.from;
  return from ? `${from.pathname}${from.search || ''}${from.hash || ''}` : '/';
}
