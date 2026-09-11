/**
 * Centralized Branding Configuration (Single Source of Truth)
 * All UI components, PWA helpers, and meta tags must reference this config.
 */

export const BRAND_CONFIG = {
  name: 'Society',
  shortName: 'Society',
  tagline: 'Your Society, Smarter & Safer',
  description: 'Manage visitors, family, vehicles and security right from your mobile device.',
  
  // Official Logo Assets (production-ready public paths)
  logo: {
    src: '/brand/society-logo.png',
    alt: 'Society Official Logo',
    icon192: '/icons/icon-192.png',
    icon512: '/icons/icon-512.png',
    favicon: '/favicon.svg',
    appleTouchIcon: '/icons/apple-touch-icon.png',
  },

  themeColor: '#4F46E5',
  backgroundColor: '#F8FAFC',
};

export default BRAND_CONFIG;
