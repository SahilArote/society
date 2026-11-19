export interface SubdomainSociety {
  id: string;
  name: string;
  subdomain: string;
  city?: string;
  state?: string;
  logoUrl?: string | null;
  upiId?: string | null;
  maintenanceAmount?: number;
  status: string;
}

export function extractSubdomainFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Explicit query parameter override (e.g. ?subdomain=eco or ?soc=eco)
  const params = new URLSearchParams(window.location.search);
  const paramSub = params.get('subdomain') || params.get('soc');
  if (paramSub && paramSub.trim()) {
    const clean = paramSub.trim().toLowerCase();
    localStorage.setItem('nexgate_subdomain', clean);
    return clean;
  }

  const hostname = window.location.hostname.toLowerCase();

  // 2. Localhost hyphenated format: e.g. "eco-localhost:5174"
  if (hostname.endsWith('-localhost')) {
    const slug = hostname.replace(/-localhost$/, '').trim();
    if (slug) {
      localStorage.setItem('nexgate_subdomain', slug);
      return slug;
    }
  }

  // 3. Dot-based subdomain (e.g. "eco.localhost", "omkar-meredia.localhost", "eco.nexgate.co.in")
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    const firstPart = parts[0];
    // Ignore generic reserved prefixes
    if (firstPart !== 'localhost' && firstPart !== 'www' && firstPart !== 'api' && firstPart !== 'admin') {
      localStorage.setItem('nexgate_subdomain', firstPart);
      return firstPart;
    }
  }

  // 4. Stored local preference (if testing on standard http://localhost:5174)
  const stored = localStorage.getItem('nexgate_subdomain');
  if (stored && stored.trim() && stored !== 'admin') {
    return stored.trim();
  }

  return null;
}

export function setExplicitSubdomain(subdomain: string | null) {
  if (subdomain && subdomain.trim()) {
    const clean = subdomain.trim().toLowerCase();
    localStorage.setItem('nexgate_subdomain', clean);
    window.dispatchEvent(new CustomEvent('nexgate_subdomain_changed', { detail: clean }));
  } else {
    localStorage.removeItem('nexgate_subdomain');
    localStorage.removeItem('nexgate_subdomain_society');
    window.dispatchEvent(new CustomEvent('nexgate_subdomain_changed', { detail: null }));
  }
}
