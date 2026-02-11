import { forwardRef, InputHTMLAttributes } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, className = '', disabled, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <label className={`flex items-start ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
          <input
            ref={ref}
            type="checkbox"
            disabled={disabled}
            className={`mt-0.5 h-4 w-4 text-red-600 accent-red-600 border-gray-300 rounded focus:ring-red-500 focus:ring-2 focus:ring-offset-0 transition-colors ${
              error ? 'border-red-500' : ''
            } ${disabled ? 'cursor-not-allowed' : ''} ${className}`}
            {...props}
          />
          {(label || description) && (
            <div className="ml-3 flex-1">
              {label && (
                <span className="text-sm font-medium text-text-primary block">
                  {label}
                </span>
              )}
              {description && (
                <span className="text-xs text-gray-500 block mt-0.5">
                  {description}
                </span>
              )}
            </div>
          )}
        </label>
        {error && (
          <p className="text-xs text-red-600 ml-7 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

