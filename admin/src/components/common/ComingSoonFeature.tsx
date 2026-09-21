import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';

interface ComingSoonFeatureProps {
  featureName: string;
  icon: React.ElementType;
  accentColor?: string;
  gradient?: string;
  description?: string;
}

export function ComingSoonFeature({
  featureName,
  icon: Icon,
  accentColor = '#2563EB',
  gradient,
  description = 'This module is currently being finalized and will be available in an upcoming release.',
}: ComingSoonFeatureProps) {
  const navigate = useNavigate();

  // Normalize color to valid hex
  const primaryColor = accentColor.startsWith('#') ? accentColor : '#2563EB';
  const cardGradient = gradient || `linear-gradient(135deg, ${primaryColor} 0%, #1e3a8a 100%)`;

  return (
    <div
      style={{
        position: 'relative',
        minHeight: 'calc(100vh - 180px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        overflow: 'hidden',
      }}
    >
      {/* Ambient Radial Background Glow */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.25, 0.45, 0.25],
        }}
        transition={{
          repeat: Infinity,
          duration: 6,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primaryColor}30 0%, transparent 70%)`,
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main Glassmorphic Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 580,
          width: '100%',
          margin: '0 auto',
          padding: '48px 36px',
          textAlign: 'center',
          borderRadius: '28px',
          background: 'linear-gradient(165deg, var(--bg-surface) 0%, var(--bg-card) 100%)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 45px -12px rgba(0, 0, 0, 0.08), 0 0 1px 1px var(--border)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Centerpiece Icon Hero */}
        <div
          style={{
            position: 'relative',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Soft Ambient Glow Underlay */}
          <div
            style={{
              position: 'absolute',
              width: 110,
              height: 110,
              borderRadius: '32px',
              background: `${primaryColor}25`,
              filter: 'blur(14px)',
              pointerEvents: 'none',
            }}
          />

          {/* Main Elevated Vibrant Icon Badge */}
          <motion.div
            animate={{ y: [-4, 4, -4] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            style={{
              position: 'relative',
              width: 96,
              height: 96,
              borderRadius: '28px',
              background: cardGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 16px 32px -4px ${primaryColor}55, inset 0 1px 2px rgba(255, 255, 255, 0.35)`,
              border: '1px solid rgba(255, 255, 255, 0.25)',
            }}
          >
            <Icon size={46} color="#ffffff" strokeWidth={2.2} />

            {/* Sparkle Badge in Top-Right Corner */}
            <div
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--bg-surface)',
                border: `2.5px solid ${primaryColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.12)',
              }}
            >
              <Sparkles size={16} color={primaryColor} />
            </div>
          </motion.div>
        </div>

        {/* Feature Category Identifier Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 99,
            background: `${primaryColor}14`,
            border: `1px solid ${primaryColor}35`,
            marginBottom: 20,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: primaryColor,
              display: 'inline-block',
              boxShadow: `0 0 10px ${primaryColor}`,
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: primaryColor,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {featureName}
          </span>
        </div>

        {/* Hero Title: COMING SOON */}
        <h1
          style={{
            fontSize: 'clamp(2.4rem, 5vw, 3.4rem)',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: '0 0 14px 0',
            color: 'var(--text-primary)',
          }}
        >
          Coming Soon
        </h1>

        {/* Clean, Focused Subtitle */}
        <p
          style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: 440,
            margin: '0 0 32px 0',
          }}
        >
          {description}
        </p>

        {/* Back to Dashboard CTA */}
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 28px',
            borderRadius: '14px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
            transition: 'all 0.2s ease',
          }}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </motion.div>
    </div>
  );
}

