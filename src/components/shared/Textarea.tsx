import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  className?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ 
  error = false, 
  className = '', 
  ...props 
}, ref) => {
  const baseClasses = 'block w-full px-3 py-2 border rounded-md shadow-sm placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-offset-0 font-raleway resize-vertical';
  const errorClasses = error 
    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
    : 'border-secondary-300 focus:ring-primary-500 focus:border-primary-500';

  return (
    <textarea
      ref={ref}
      className={`${baseClasses} ${errorClasses} ${className}`}
      {...props}
    />
  );
});

Textarea.display_name = 'Textarea';

export default Textarea;
