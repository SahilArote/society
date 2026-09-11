import React from 'react';
import { motion } from 'framer-motion';

export interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  pill?: {
    text: string;
    color: string;
    bg: string;
    dot?: boolean;
    icon?: React.ElementType;
  };
  sub?: React.ReactNode;
  footer?: React.ReactNode;
  accentColor?: string;
  bgColor?: string;
  borderColor?: string;
  delay?: number;
  onClick?: () => void;
  // Optional legacy props kept for seamless compatibility
  unit?: string;
  graphic?: React.ReactNode;
  gaugePercent?: number;
  gaugeColor?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  barData?: number[];
  barColor?: string;
  segments?: any;
  progress?: number;
}

export function CircularGauge() {
  return null;
}

export function MiniSparkline() {
  return null;
}

export function MiniBarSparkline() {
  return null;
}

export function SegmentedBar() {
  return null;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  pill,
  sub,
  footer,
  accentColor = 'var(--accent)',
  bgColor,
  borderColor,
  delay = 0,
  onClick,
}: StatCardProps) {
  const contextText = sub || footer;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
      className="stat-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Top Header: Left Icon & Label | Right Status Pill */}
      <div className="stat-header">
        <div className="stat-header-left">
          <div
            className="stat-icon-mini"
            style={{
              color: accentColor,
              background: bgColor || 'var(--bg-elevated)',
              border: `1px solid ${borderColor || `color-mix(in srgb, ${accentColor} 25%, transparent)`}`,
            }}
          >
            <Icon size={16} color={accentColor} />
          </div>
          <span className="stat-label">{label}</span>
        </div>

        {pill && (
          <span
            className="stat-pill"
            style={{
              background: pill.bg,
              color: pill.color,
              border: `1px solid ${pill.color}25`,
            }}
          >
            {pill.dot && (
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: pill.color,
                }}
              />
            )}
            {pill.icon && <pill.icon size={11} />}
            <span>{pill.text}</span>
          </span>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="stat-value">{value}</div>

      {/* Clean Context / Breakdown Subtitle */}
      {contextText && (
        <div className="stat-sub">
          {contextText}
        </div>
      )}
    </motion.div>
  );
}
