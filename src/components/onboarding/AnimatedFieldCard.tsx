'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useState } from 'react';

interface ProfileField {
  name: string;
  required: boolean;
  completed: boolean;
  where: string;
  how: string;
  why: string;
}

interface AnimatedFieldCardProps {
  field: ProfileField;
  index: number;
}

export function AnimatedFieldCard({ field, index }: AnimatedFieldCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative"
    >
      <div
        role="article"
        aria-label={`${field.name} field`}
        className={`p-5 rounded-xl border-2 transition-all duration-300 ${
          field.completed
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 hover:border-green-400 hover:shadow-lg hover:shadow-green-100'
            : field.required
            ? 'bg-white border-red-200 hover:border-red-300 hover:shadow-lg hover:shadow-red-100'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Icon and Title */}
          <div className="flex items-start gap-3 flex-1">
            <motion.div
              animate={{
                scale: field.completed ? [1, 1.2, 1] : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              {field.completed ? (
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle
                  className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                    field.required ? 'text-red-600' : 'text-gray-400'
                  }`}
                />
              )}
            </motion.div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-bold text-gray-900 text-lg">{field.name}</h4>
                {field.required && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded">
                    Required
                  </span>
                )}
                {!field.required && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-600 rounded">
                    Optional
                  </span>
                )}
              </div>

              {/* Details (always visible for better UX) */}
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-700 min-w-[60px]">Where:</span>
                  <span className="text-gray-600">{field.where}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-700 min-w-[60px]">How:</span>
                  <span className="text-gray-600">{field.how}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-gray-700 min-w-[60px]">Why:</span>
                  <span className="text-gray-600">{field.why}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Button with Tooltip */}
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className={`p-2 rounded-lg transition-colors ${
                field.completed
                  ? 'bg-green-100 hover:bg-green-200'
                  : field.required
                  ? 'bg-red-100 hover:bg-red-200'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              aria-label="More information"
            >
              <Info
                className={`w-5 h-5 ${
                  field.completed
                    ? 'text-green-600'
                    : field.required
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              />
            </button>

            {/* Tooltip */}
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-64 p-4 bg-gray-900 text-white text-sm rounded-lg shadow-xl z-10"
              >
                <div className="space-y-2">
                  <p>
                    <strong>Location:</strong> {field.where}
                  </p>
                  <p>
                    <strong>Purpose:</strong> {field.why}
                  </p>
                </div>
                <div className="absolute -top-2 right-4 w-4 h-4 bg-gray-900 transform rotate-45" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Completion Status */}
        {field.completed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-green-200"
          >
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-semibold">Completed ✓</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
