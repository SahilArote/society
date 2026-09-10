import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme, type Theme } from '../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'segmented' | 'dropdown' | 'inline';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'segmented' }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: { value: Theme; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Laptop },
  ];

  if (variant === 'segmented') {
    return (
      <div
        className="theme-segmented-group"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          padding: 2,
          gap: 2,
        }}
        title={`Current Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (${resolvedTheme})`}
      >
        {options.map(opt => {
          const Icon = opt.icon;
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              id={`theme-btn-${opt.value}`}
              onClick={() => setTheme(opt.value)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 8px',
                borderRadius: 'calc(var(--r-md) - 2px)',
                border: 'none',
                background: isActive ? 'var(--bg-card)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
              title={`Switch to ${opt.label} theme`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline" style={{ fontSize: 11.5 }}>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown style (great for compact layouts)
  const ActiveIcon = theme === 'system' ? Laptop : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        id="theme-dropdown-btn"
        className="header-icon-btn"
        onClick={() => setIsOpen(prev => !prev)}
        title={`Theme: ${theme}`}
        style={{ cursor: 'pointer' }}
      >
        <ActiveIcon size={15} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 140,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: 4,
            zIndex: 110,
          }}
        >
          {options.map(opt => {
            const Icon = opt.icon;
            const isSelected = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setTheme(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: 'var(--r-sm)',
                  border: 'none',
                  background: isSelected ? 'var(--bg-hover)' : 'transparent',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: 12.5,
                  fontWeight: isSelected ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={14} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check size={13} color="var(--accent)" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
