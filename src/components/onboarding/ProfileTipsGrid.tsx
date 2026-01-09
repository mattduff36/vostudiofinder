'use client';

import { motion } from 'framer-motion';
import { Target, CheckSquare, Star, Image as ImageIcon, FileText, RefreshCw } from 'lucide-react';

const tips = [
  {
    icon: Target,
    title: 'Complete to 100%',
    description: 'Maximize visibility and attract more clients with a fully completed profile',
    color: 'red',
  },
  {
    icon: CheckSquare,
    title: 'Required Fields First',
    description: 'All required fields must be completed before your profile can go live and be searchable',
    color: 'orange',
  },
  {
    icon: Star,
    title: 'Stand Out',
    description: 'Optional fields improve your profile quality and help you stand out from other studios',
    color: 'yellow',
  },
  {
    icon: ImageIcon,
    title: 'High-Quality Images',
    description: 'Upload professional photos to showcase your studio space and equipment',
    color: 'green',
  },
  {
    icon: FileText,
    title: 'Detailed Descriptions',
    description: 'Keep descriptions concise but informative - focus on what makes your studio unique',
    color: 'blue',
  },
  {
    icon: RefreshCw,
    title: 'Update Regularly',
    description: 'Keep your profile fresh and show you\'re actively managing your listing',
    color: 'purple',
  },
];

const colorClasses = {
  red: {
    bg: 'from-red-50 to-red-100',
    icon: 'from-red-600 to-red-500',
    iconText: 'text-red-600',
    border: 'border-red-200',
    hover: 'hover:border-red-300 hover:shadow-red-100',
  },
  orange: {
    bg: 'from-orange-50 to-orange-100',
    icon: 'from-orange-600 to-orange-500',
    iconText: 'text-orange-600',
    border: 'border-orange-200',
    hover: 'hover:border-orange-300 hover:shadow-orange-100',
  },
  yellow: {
    bg: 'from-yellow-50 to-yellow-100',
    icon: 'from-yellow-600 to-yellow-500',
    iconText: 'text-yellow-600',
    border: 'border-yellow-200',
    hover: 'hover:border-yellow-300 hover:shadow-yellow-100',
  },
  green: {
    bg: 'from-green-50 to-green-100',
    icon: 'from-green-600 to-emerald-500',
    iconText: 'text-green-600',
    border: 'border-green-200',
    hover: 'hover:border-green-300 hover:shadow-green-100',
  },
  blue: {
    bg: 'from-blue-50 to-blue-100',
    icon: 'from-blue-600 to-blue-500',
    iconText: 'text-blue-600',
    border: 'border-blue-200',
    hover: 'hover:border-blue-300 hover:shadow-blue-100',
  },
  purple: {
    bg: 'from-purple-50 to-purple-100',
    icon: 'from-purple-600 to-purple-500',
    iconText: 'text-purple-600',
    border: 'border-purple-200',
    hover: 'hover:border-purple-300 hover:shadow-purple-100',
  },
};

export function ProfileTipsGrid() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.6 }}
      className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 md:p-10 border border-gray-100"
    >
      <div className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-3">
          Profile Tips for Success
        </h2>
        <p className="text-lg text-gray-600">
          Follow these best practices to maximize your studio&apos;s visibility and attract more clients
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {tips.map((tip, index) => {
          const Icon = tip.icon;
          const colors = colorClasses[tip.color as keyof typeof colorClasses];

          return (
            <motion.div
              key={tip.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={`bg-gradient-to-br ${colors.bg} rounded-xl p-6 border-2 ${colors.border} ${colors.hover} hover:shadow-xl transition-all duration-300 group`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5 }}
                  className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${colors.icon} shadow-lg flex items-center justify-center group-hover:shadow-xl transition-shadow`}
                >
                  <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                </motion.div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-gray-800 transition-colors">
                    {tip.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {tip.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
