import os

base_path = r"c:\Users\Sahil Arote\Desktop\society\resident-pwa\src\components"

os.makedirs(os.path.join(base_path, "ui"), exist_ok=True)
os.makedirs(os.path.join(base_path, "layout"), exist_ok=True)

files = {
r"ui\Button.tsx": """import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, fullWidth, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 disabled:pointer-events-none btn-press rounded-xl';
    
    const variants = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
      secondary: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-900',
      ghost: 'hover:bg-slate-100 text-slate-700 hover:text-slate-900',
      danger: 'bg-danger-500 text-white hover:bg-danger-600 shadow-sm',
    };

    const sizes = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-4 text-base min-h-[44px]',
      lg: 'h-14 px-6 text-lg min-h-[56px]',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth ? 'w-full' : '',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!loading && icon && <span className="mr-2">{icon}</span>}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
export default Button;
""",

r"ui\IconButton.tsx": """import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'default', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 disabled:pointer-events-none btn-press shrink-0';
    
    const variants = {
      default: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm',
      ghost: 'hover:bg-slate-100 text-slate-700',
      danger: 'bg-danger-50 text-danger-600 hover:bg-danger-100',
    };

    const sizes = {
      sm: 'h-9 w-9',
      md: 'h-11 w-11 min-h-[44px] min-w-[44px]',
      lg: 'h-[52px] w-[52px]',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';
export default IconButton;
""",

r"ui\Input.tsx": """import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  prefixNode?: React.ReactNode;
  suffixNode?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, prefixNode, suffixNode, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {prefixNode && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              {prefixNode}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'flex h-11 w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              'placeholder:text-slate-400',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              'disabled:cursor-not-allowed disabled:opacity-50',
              prefixNode ? 'pl-10' : '',
              suffixNode ? 'pr-10' : '',
              error ? 'border-danger-500 focus-visible:ring-danger-500' : 'border-slate-200',
              className
            )}
            {...props}
          />
          {suffixNode && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {suffixNode}
            </div>
          )}
        </div>
        {(error || helperText) && (
          <p className={cn('mt-1.5 text-xs', error ? 'text-danger-500' : 'text-slate-500')}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
export default Input;
""",

r"ui\Select.tsx": """import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'flex h-11 w-full appearance-none rounded-xl border bg-white pl-3 pr-10 py-2 text-sm text-slate-900 shadow-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error ? 'border-danger-500 focus-visible:ring-danger-500' : 'border-slate-200',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        {error && <p className="mt-1.5 text-xs text-danger-500">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
export default Select;
""",

r"ui\Avatar.tsx": """import React from 'react';
import { cn } from '../../lib/utils';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, name, size = 'md', className }) => {
  const sizes = {
    xs: 'h-8 w-8 text-xs',
    sm: 'h-10 w-10 text-sm',
    md: 'h-12 w-12 text-base',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-20 w-20 text-xl',
  };

  const [error, setError] = React.useState(false);

  return (
    <div
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full bg-slate-200 items-center justify-center',
        sizes[size],
        className
      )}
    >
      {src && !error ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className="aspect-square h-full w-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        <span className="font-medium text-primary-600">
          {name ? getInitials(name) : '?'}
        </span>
      )}
    </div>
  );
};
export default Avatar;
""",

r"ui\Badge.tsx": """import React from 'react';
import { cn } from '../../lib/utils';
import { VisitorStatus } from '../../types';

type BadgeStatus = VisitorStatus | 'expired' | 'cancelled' | 'pending';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: BadgeStatus;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ status, className, children, ...props }) => {
  const variants = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-danger-100 text-danger-700',
    entered: 'bg-sky-100 text-sky-700',
    exited: 'bg-slate-100 text-slate-700',
    expired: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-gray-100 text-gray-700',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider',
        variants[status] || variants.pending,
        className
      )}
      {...props}
    >
      {children || status}
    </div>
  );
};
export default Badge;
""",

r"ui\Card.tsx": """import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, noPadding, onClick, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden',
          !noPadding && 'p-4',
          onClick && 'cursor-pointer hover:shadow-md transition-shadow card-pressable',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';
export default Card;
""",

r"ui\Modal.tsx": """import React, { useEffect } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import IconButton from './IconButton';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', className }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
            className={cn(
              'relative w-full rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col max-h-[90vh]',
              sizes[size],
              className
            )}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 shrink-0">
                <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                <IconButton aria-label="Close" variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-5 w-5" />
                </IconButton>
              </div>
            )}
            <div className="overflow-y-auto p-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default Modal;
""",

r"ui\BottomSheet.tsx": """import React, { useEffect } from 'react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, title, children, className }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              'relative w-full rounded-t-2xl bg-white shadow-xl flex flex-col max-h-[90vh]',
              className
            )}
          >
            <div className="flex items-center justify-center pt-3 pb-1 w-full shrink-0" onClick={onClose}>
              <div className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>
            {title && (
              <div className="px-4 py-3 border-b border-slate-100 shrink-0">
                <h2 className="text-lg font-semibold text-slate-900 text-center">{title}</h2>
              </div>
            )}
            <div className="overflow-y-auto p-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default BottomSheet;
""",

r"ui\Toast.tsx": """import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export interface ToastProps {
  toasts: ToastItem[];
  onDismiss?: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col items-center gap-2 p-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg pointer-events-auto max-w-sm w-full',
                isSuccess ? 'bg-emerald-50 text-emerald-900 border border-emerald-100' :
                isError ? 'bg-danger-50 text-danger-900 border border-danger-100' :
                'bg-blue-50 text-blue-900 border border-blue-100'
              )}
            >
              {isSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
              {isError && <XCircle className="h-5 w-5 text-danger-500 shrink-0" />}
              {!isSuccess && !isError && <Info className="h-5 w-5 text-blue-500 shrink-0" />}
              <p className="text-sm font-medium">{toast.message}</p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
export default Toast;
""",

r"ui\Skeleton.tsx": """import React from 'react';
import { cn } from '../../lib/utils';

export const SkeletonText: React.FC<{ width?: string; className?: string }> = ({ width = '100%', className }) => (
  <div className={cn('skeleton h-4 rounded', className)} style={{ width }} />
);

export const SkeletonCircle: React.FC<{ size: string; className?: string }> = ({ size, className }) => (
  <div className={cn('skeleton rounded-full shrink-0', className)} style={{ width: size, height: size }} />
);

export const SkeletonRect: React.FC<{ width?: string; height: string; className?: string }> = ({ width = '100%', height, className }) => (
  <div className={cn('skeleton rounded-xl', className)} style={{ width, height }} />
);
""",

r"ui\EmptyState.tsx": """import React from 'react';
import { LucideIcon } from 'lucide-react';
import Button from './Button';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, actionLabel, onAction, className }) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <div className="bg-slate-50 p-4 rounded-full mb-4">
        <Icon className="h-12 w-12 text-slate-300" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
export default EmptyState;
""",

r"ui\ErrorState.tsx": """import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';
import { cn } from '../../lib/utils';

export interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ title, description, onRetry, retryLabel = 'Try Again', className }) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <div className="bg-danger-50 p-4 rounded-full mb-4">
        <AlertTriangle className="h-12 w-12 text-danger-300" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary">
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
export default ErrorState;
""",

r"ui\ConfirmationDialog.tsx": """import React from 'react';
import Modal from './Modal';
import Button from './Button';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-slate-600 mb-6">{message}</p>
      <div className="flex items-center gap-3 w-full">
        <Button variant="secondary" onClick={onClose} fullWidth>
          {cancelLabel}
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} fullWidth>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};
export default ConfirmationDialog;
""",

r"ui\Divider.tsx": """import React from 'react';
import { cn } from '../../lib/utils';

export interface DividerProps {
  label?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ label, className }) => {
  if (label) {
    return (
      <div className={cn('relative my-6', className)}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-slate-50 px-2 text-slate-500">{label}</span>
        </div>
      </div>
    );
  }

  return <hr className={cn('my-4 border-t border-slate-200', className)} />;
};
export default Divider;
""",

r"ui\Chip.tsx": """import React from 'react';
import { cn } from '../../lib/utils';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
}

export const Chip: React.FC<ChipProps> = ({ label, active, className, ...props }) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 whitespace-nowrap',
        active ? 'bg-primary-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
        className
      )}
      {...props}
    >
      {label}
    </button>
  );
};
export default Chip;
""",

r"ui\index.ts": """export * from './Button';
export { default as Button } from './Button';

export * from './IconButton';
export { default as IconButton } from './IconButton';

export * from './Input';
export { default as Input } from './Input';

export * from './Select';
export { default as Select } from './Select';

export * from './Avatar';
export { default as Avatar } from './Avatar';

export * from './Badge';
export { default as Badge } from './Badge';

export * from './Card';
export { default as Card } from './Card';

export * from './Modal';
export { default as Modal } from './Modal';

export * from './BottomSheet';
export { default as BottomSheet } from './BottomSheet';

export * from './Toast';
export { default as Toast } from './Toast';

export * from './Skeleton';

export * from './EmptyState';
export { default as EmptyState } from './EmptyState';

export * from './ErrorState';
export { default as ErrorState } from './ErrorState';

export * from './ConfirmationDialog';
export { default as ConfirmationDialog } from './ConfirmationDialog';

export * from './Divider';
export { default as Divider } from './Divider';

export * from './Chip';
export { default as Chip } from './Chip';
""",

r"layout\AppHeader.tsx": """import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import IconButton from '../ui/IconButton';
import { cn } from '../../lib/utils';

export interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  className?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, showBack, rightAction, transparent, className }) => {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 w-full items-center justify-between px-4 transition-colors',
        transparent ? 'bg-transparent' : 'bg-white border-b border-slate-100',
        className
      )}
    >
      <div className="flex items-center flex-1">
        {showBack && (
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="mr-2 -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </IconButton>
        )}
        <h1 className="text-lg font-semibold text-slate-900 line-clamp-1">{title}</h1>
      </div>
      {rightAction && <div className="flex items-center shrink-0 ml-4">{rightAction}</div>}
    </header>
  );
};
export default AppHeader;
""",

r"layout\BottomNavigation.tsx": """import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Bell, User } from 'lucide-react';
import { cn } from '../../lib/utils';

export const BottomNavigation: React.FC = () => {
  const navItems = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/visitors', icon: Users, label: 'Visitors' },
    { to: '/notifications', icon: Bell, label: 'Alerts', badge: true },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 pb-safe lg:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center w-full h-full space-y-1',
                isActive ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <item.icon
                    className="h-6 w-6"
                    fill={isActive ? 'currentColor' : 'none'}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  {item.badge && (
                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-danger-500 ring-2 ring-white" />
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
export default BottomNavigation;
""",

r"layout\PageContainer.tsx": """import React from 'react';
import { cn } from '../../lib/utils';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, noPadding, className, ...props }) => {
  return (
    <div
      className={cn(
        'w-full mx-auto pb-24', // Extra padding bottom for mobile nav
        !noPadding && 'px-4 pt-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
export default PageContainer;
""",

r"layout\DesktopSidebar.tsx": """import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, Bell, User, Plus, Building } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../ui/Button';

export const DesktopSidebar: React.FC = () => {
  const navItems = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/visitors', icon: Users, label: 'Visitors' },
    { to: '/notifications', icon: Bell, label: 'Notifications', badge: 3 },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[260px] h-screen sticky top-0 bg-white border-r border-slate-100">
      <div className="p-6">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Resident Hub</h1>
        <p className="text-sm text-slate-500 mt-1">Green Valley Residency</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors font-medium text-sm',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )
            }
          >
            {({ isActive }) => (
              <div className="flex items-center">
                <item.icon
                  className={cn('h-5 w-5 mr-3', isActive ? 'text-primary-600' : 'text-slate-400')}
                  fill={isActive ? 'currentColor' : 'none'}
                />
                {item.label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 space-y-3 border-t border-slate-100">
        <Button variant="primary" fullWidth icon={<Plus className="h-4 w-4" />}>
          Invite Visitor
        </Button>
        <Button variant="secondary" fullWidth icon={<Building className="h-4 w-4" />}>
          My Flat
        </Button>
      </div>
      
      <div className="p-4 text-center">
        <p className="text-xs text-slate-400">&copy; 2024 Green Valley Residency</p>
      </div>
    </aside>
  );
};
export default DesktopSidebar;
""",

r"layout\ResponsiveShell.tsx": """import React from 'react';
import { Outlet } from 'react-router-dom';
import DesktopSidebar from './DesktopSidebar';
import BottomNavigation from './BottomNavigation';

export const ResponsiveShell: React.FC = () => {
  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <DesktopSidebar />
      <main className="flex-1 w-full max-w-lg mx-auto lg:mx-0 lg:max-w-none relative">
        <div className="lg:max-w-2xl lg:mx-auto">
          <Outlet />
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
};
export default ResponsiveShell;
""",

r"layout\PublicLayout.tsx": """import React from 'react';
import { Outlet } from 'react-router-dom';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8">
        <Outlet />
      </div>
    </div>
  );
};
export default PublicLayout;
""",

r"layout\index.ts": """export * from './AppHeader';
export { default as AppHeader } from './AppHeader';

export * from './BottomNavigation';
export { default as BottomNavigation } from './BottomNavigation';

export * from './PageContainer';
export { default as PageContainer } from './PageContainer';

export * from './DesktopSidebar';
export { default as DesktopSidebar } from './DesktopSidebar';

export * from './ResponsiveShell';
export { default as ResponsiveShell } from './ResponsiveShell';

export * from './PublicLayout';
export { default as PublicLayout } from './PublicLayout';
"""
}

for rel_path, content in files.items():
    full_path = os.path.join(base_path, rel_path)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Files created successfully.")
