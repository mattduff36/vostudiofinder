import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  className?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ 
  error = false, 
  className = '', 
  ...props 
}, ref) => {
  const baseClasses = 'block w-full px-3 py-2 border rounded-md shadow-sm placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-offset-0 font-raleway';
  const errorClasses = error 
    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
    : 'border-secondary-300 focus:ring-primary-500 focus:border-primary-500';

  return (
    <input
      ref={ref}
      className={`${baseClasses} ${errorClasses} ${className}`}
      {...props}
    />
  );
});

Input.display_name = 'Input';

export default Input;
