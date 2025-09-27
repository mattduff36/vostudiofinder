import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  actions?: ReactNode;
}

export default function Card({ children, className = '', title, actions }: CardProps) {
  return (
    <div className={`bg-white border border-secondary-200 rounded-lg shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-secondary-200 flex items-center justify-between">
          {title && (
            <h3 className="text-lg font-raleway font-medium text-text-primary">
              {title}
            </h3>
          )}
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
