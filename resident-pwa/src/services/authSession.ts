// Resident Authentication & Session Manager for GreenGate Resident PWA

const TOKEN_KEY = 'greengate_resident_token';
const USER_KEY = 'greengate_resident_user';

export interface ResidentSessionUser {
  id: string;
  name: string;
  phone: string;
  mobile?: string;
  flat: string;
  flatNumber?: string;
  wing?: string;
  societyId?: string;
}

type AuthListener = (isAuthenticated: boolean) => void;

class AuthSessionManager {
  private listeners: Set<AuthListener> = new Set();

  public isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem(TOKEN_KEY);
    return Boolean(token && token.trim().length > 0);
  }

  public getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  public setSession(token: string, user: Partial<ResidentSessionUser>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    const sessionUser: ResidentSessionUser = {
      id: user.id || 'res_sahil',
      name: user.name || 'Sahil Arote',
      phone: user.phone || user.mobile || '+91 98765 43210',
      mobile: user.mobile || user.phone || '9876543210',
      flat: user.flat || user.flatNumber || 'A-402',
      flatNumber: user.flatNumber || user.flat || 'A-402',
      wing: user.wing || 'Tower A',
      societyId: user.societyId || 'soc_greengate',
    };
    localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
    this.notify();
  }

  public clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.notify();
  }

  public getUser(): ResidentSessionUser | null {
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

