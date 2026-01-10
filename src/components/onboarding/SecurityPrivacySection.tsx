'use client';

import { motion } from 'framer-motion';
import { Shield, Search } from 'lucide-react';

export function SecurityPrivacySection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9, duration: 0.6 }}
      className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 md:p-10 border border-gray-100"
    >
      <div className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-3">
          Your Security & Privacy
        </h2>
        <p className="text-lg text-gray-600">
          We&apos;re committed to protecting your data and maximising your visibility
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Security Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border-2 border-red-200 hover:border-red-300 hover:shadow-xl transition-all duration-300 p-6"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-red-600 to-red-500 shadow-lg flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Your Data Security
              </h3>
            </div>
          </div>
          <p className="text-gray-700 leading-relaxed">
            We take the security of your data seriously. Only share information you feel comfortable sharing. Your privacy is our priority, and we&apos;ll never share your personal details with anyone.
          </p>
        </motion.div>

        {/* SEO Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border-2 border-red-200 hover:border-red-300 hover:shadow-xl transition-all duration-300 p-6"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-red-600 to-red-500 shadow-lg flex items-center justify-center">
              <Search className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                SEO (Search Engine Optimisation)
              </h3>
            </div>
          </div>
          <p className="text-gray-700 leading-relaxed">
            We&apos;ve invested countless hours optimising Voiceover Studio Finder for search engines. Our SEO is so effective that studio listings often rank higher than studios&apos; own websites, giving your profile maximum visibility to potential clients.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
