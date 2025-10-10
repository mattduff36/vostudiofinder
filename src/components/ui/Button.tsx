import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

// New color palette
const colors = {
  primary: '#d42027',
  primaryHover: '#a1181d',
  background: '#ffffff',
  textPrimary: '#000000',
  textSecondary: '#444444',
  textSubtle: '#888888',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background';
    
    const getVariantStyles = (variant: string) => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: colors.primary,
            color: '#ffffff',
            border: 'none',
            transition: 'all 0.2s ease',
            ':hover': { backgroundColor: colors.primaryHover }
          };
        case 'secondary':
          return {
            backgroundColor: colors.textSecondary,
            color: '#ffffff',
            border: 'none',
            transition: 'all 0.2s ease',
            ':hover': { backgroundColor: colors.textPrimary }
          };
        case 'outline':
          return {
            backgroundColor: 'transparent',
            color: colors.primary,
            border: `1px solid ${colors.primary}`,
            transition: 'all 0.2s ease',
            ':hover': { backgroundColor: `${colors.primary}10`, color: colors.primaryHover }
          };
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            color: colors.textSecondary,
            border: 'none',
            transition: 'all 0.2s ease',
            ':hover': { backgroundColor: `${colors.primary}10`, color: colors.primary }
          };
        case 'danger':
          return {
            backgroundColor: '#dc2626',
            color: '#ffffff',
            border: 'none',
            transition: 'all 0.2s ease',
            ':hover': { backgroundColor: '#b91c1c' }
          };
        default:
          return {};
      }
    };
    
    const sizes = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-10 py-2 px-4',
      lg: 'h-11 px-8',
    };

    const variantStyles = getVariantStyles(variant);
    
    return (
      <button
        className={cn(
          baseStyles,
          sizes[size],
          className
        )}
        style={{
          ...variantStyles,
          ...(props.style || {})
        }}
        ref={ref}
        disabled={disabled || loading}
        onMouseEnter={(e) => {
          if (variant === 'primary') {
            e.currentTarget.style.backgroundColor = colors.primaryHover;
          } else if (variant === 'secondary') {
            e.currentTarget.style.backgroundColor = colors.textPrimary;
          } else if (variant === 'outline') {
            e.currentTarget.style.backgroundColor = `${colors.primary}10`;
            e.currentTarget.style.color = colors.primaryHover;
          } else if (variant === 'ghost') {
            e.currentTarget.style.backgroundColor = `${colors.primary}10`;
            e.currentTarget.style.color = colors.primary;
          } else if (variant === 'danger') {
            e.currentTarget.style.backgroundColor = '#b91c1c';
          }
        }}
        onMouseLeave={(e) => {
          if (variant === 'primary') {
            e.currentTarget.style.backgroundColor = colors.primary;
          } else if (variant === 'secondary') {
            e.currentTarget.style.backgroundColor = colors.textSecondary;
          } else if (variant === 'outline') {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = colors.primary;
          } else if (variant === 'ghost') {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = colors.textSecondary;
          } else if (variant === 'danger') {
            e.currentTarget.style.backgroundColor = '#dc2626';
          }
        }}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.display_name = 'Button';

export { Button };
