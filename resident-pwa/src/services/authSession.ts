const TOKEN_KEY = 'greengate_resident_token';
const USER_KEY = 'greengate_resident_user';

export interface ResidentSessionUser {
  id: string;
  name: string;
  mobile: string;
  role: string;
  societyId: string;
  flatId?: string;
  flatNumber?: string;
  wing?: string;
  societyName?: string;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): ResidentSessionUser | null {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function setAuthSession(token: string, user: ResidentSessionUser, remember: boolean = true) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function isAuthenticatedSession(): boolean {
  return Boolean(getStoredToken());
}
