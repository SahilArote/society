import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';

interface ComingSoonFeatureProps {
  featureName: string;
  icon: React.ElementType;
  accentColor?: string;
  description?: string;
}

export function ComingSoonFeature({
  featureName,
  icon: Icon,
  accentColor = 'var(--accent)',
  description = 'This module is currently being finalized and will be available in an upcoming release.',
}: ComingSoonFeatureProps) {
  const navigate = useNavigate();

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
      {/* Background Ambient Glow Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.35, 0.55, 0.35],
        }}
        transition={{
          repeat: Infinity,
          duration: 6,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          top: '25%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}25 0%, transparent 70%)`,
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <motion.div
        animate={{
          scale: [1.1, 0.95, 1.1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          repeat: Infinity,
          duration: 8,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '25%',
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}18 0%, transparent 65%)`,
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main Glassmorphic Showcase Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 580,
          width: '100%',
          margin: '0 auto',
          padding: '56px 36px',
          textAlign: 'center',
          borderRadius: '28px',
          background: 'linear-gradient(165deg, var(--bg-surface) 0%, var(--bg-card) 100%)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xl), 0 20px 40px -15px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Floating Glowing Icon */}
        <motion.div
          animate={{ y: [-5, 5, -5] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          style={{
            position: 'relative',
            width: 88,
            height: 88,
            borderRadius: '26px',
            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 14px 32px -4px ${accentColor}55`,
            marginBottom: 28,
          }}
        >
          <Icon size={42} color="#ffffff" strokeWidth={2.2} />

          {/* Sparkle Floating Badge */}
          <div
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--bg-surface)',
              border: `2px solid ${accentColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Sparkles size={14} color={accentColor} />
          </div>
        </motion.div>

        {/* Status Pill Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            borderRadius: 99,
            background: `${accentColor}14`,
            border: `1px solid ${accentColor}35`,
            marginBottom: 20,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: accentColor,
              display: 'inline-block',
              boxShadow: `0 0 10px ${accentColor}`,
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: accentColor,
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
            margin: '0 0 16px 0',
            color: 'var(--text-primary)',
          }}
        >
          Coming Soon
        </h1>

        {/* Clean, Elegant Subtitle */}
        <p
          style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: 440,
            margin: '0 0 36px 0',
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
