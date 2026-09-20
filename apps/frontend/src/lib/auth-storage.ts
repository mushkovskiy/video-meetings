// The login API (LoggedUserRdo) only returns { email, token } — no name.
// We stash the name locally at registration time (register's UserRdo does
// include it) so the dashboard has something to greet the user with,
// keyed by email so it survives the register -> login redirect.

const TOKEN_KEY = 'video-meetings:auth:token';
const EMAIL_KEY = 'video-meetings:auth:email';
const profileKey = (email: string) => `video-meetings:profile:${email.toLowerCase()}`;

export type StoredProfile = {
  firstName: string;
  lastName: string;
};

export type Session = {
  token: string;
  email: string;
};

export function saveProfile(email: string, profile: StoredProfile): void {
  localStorage.setItem(profileKey(email), JSON.stringify(profile));
}

export function getProfile(email: string): StoredProfile | null {
  const raw = localStorage.getItem(profileKey(email));
  return raw ? (JSON.parse(raw) as StoredProfile) : null;
}

export function saveSession(session: Session): void {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(EMAIL_KEY, session.email);
}

export function getSession(): Session | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const email = localStorage.getItem(EMAIL_KEY);
  return token && email ? { token, email } : null;
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

export function getDisplayName(session: Session): string {
  return getProfile(session.email)?.firstName ?? session.email;
}
