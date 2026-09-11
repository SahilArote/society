// Resident Authentication & Session Manager for GreenGate Resident PWA

const SESSION_KEY = 'greengate_resident_session';
const USER_KEY = 'greengate_resident_user';
const TOKEN_KEY = 'greengate_resident_token';

export interface ResidentUser {
  id: string;
  name: string;
  phone: string;
  flat: string;
  societyId?: string;
  societyName?: string;
}

type AuthListener = (isAuthenticated: boolean) => void;

class AuthSessionManager {
  private listeners: Set<AuthListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // Default to demo session for instant usability in development if empty
      if (localStorage.getItem(SESSION_KEY) === null) {
        localStorage.setItem(SESSION_KEY, 'true');
        localStorage.setItem(TOKEN_KEY, 'demo_resident_token');
        localStorage.setItem(
          USER_KEY,
          JSON.stringify({
            id: 'res_sahil',
            name: 'Sahil Arote',
            phone: '+91 98765 43210',
            flat: 'A-402',
            societyId: 'soc_greengate',
          })
        );
      }
    }
  }

  public isAuthenticated(): boolean {
    if (typeof window === 'undefined') return true;
    const val = localStorage.getItem(SESSION_KEY);
    return val === 'true';
  }

  public getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY) || 'demo_resident_token';
  }

  public setFullSession(token: string, user: ResidentUser): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SESSION_KEY, 'true');
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.notify();
  }

  public setSession(phone: string, name = 'Sahil Arote', flat = 'A-402', id = 'res_sahil'): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SESSION_KEY, 'true');
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        id,
        name,
        phone,
        flat,
      })
    );
    this.notify();
  }

  public clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SESSION_KEY, 'false');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.notify();
  }

  public getUser(): ResidentUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.isAuthenticated());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.isAuthenticated();
    this.listeners.forEach((listener) => listener(state));
    window.dispatchEvent(new CustomEvent('greengate-auth-change', { detail: { state } }));
  }
}

export const authSession = new AuthSessionManager();
export default authSession;
