'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { colors } from '@/components/home/HomePage';
import { Building, Users, Star, Check, ArrowRight, Shield, Sparkles } from 'lucide-react';
import { Footer } from '@/components/home/Footer';
import { getPromoConfig } from '@/lib/promo';

export default function JoinWaitlistPage() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const promoConfig = getPromoConfig();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, type: 'GENERAL' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join waitlist');
      }

      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="h-[calc(100dvh-5rem)] relative overflow-hidden flex flex-col justify-start sm:justify-center py-8 sm:py-12 sm:px-6 lg:px-8">
        {/* Background Image */}
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src="/background-images/21920-5.jpg"
            alt="Success background"
            fill
            className="object-cover opacity-10"
            priority={false}
          />
        </div>

        <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-2xl">
          <div className="bg-white/90 backdrop-blur-sm py-12 px-8 shadow-xl sm:rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: `${colors.primary}20` }}>
                <Check className="w-8 h-8" style={{ color: colors.primary }} />
              </div>
              <h2 className="text-3xl font-bold mb-4" style={{ color: colors.primary }}>
                Welcome to the Waitlist!
              </h2>
              <p className="text-lg text-gray-700 mb-8">
                Thank you for your interest in Voiceover Studio Finder. We'll notify you as soon as we're ready to welcome new studio owners to our community.
              </p>
              <div className="space-y-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-300 hover:shadow-xl"
                  style={{ backgroundColor: colors.primary, color: '#ffffff' }}
                >
                  Return to Homepage
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <div className="text-center">
                  <Link
                    href="/studios"
                    className="text-gray-600 hover:text-gray-900 underline"
                  >
                    Browse Studios
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Background Image */}
      <div className="absolute inset-0 h-full pointer-events-none">
        <Image
          src="/background-images/21920-5.jpg"
          alt="Waitlist background"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      <div className="relative z-10 py-12 sm:px-6 lg:px-8 flex-1">
        <div className="max-w-7xl mx-auto px-4">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/images/voiceover-studio-finder-logo-black-BIG 1.png"
            alt="VoiceoverStudioFinder"
            width={450}
            height={71}
            priority
            className="h-auto"
          />
        </div>

        {/* Full Width Intro Section (without title) */}
        <div className="mb-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <p className="text-xl text-gray-700">
              We're almost ready to welcome new studios to the platform.
            </p>
            <p className="text-lg text-gray-600">
              Voiceover Studio Finder is in its final testing phase. We're fine-tuning every detail to make sure the experience is smooth, reliable, and genuinely useful for both studio owners and voice artists. We'd love to add you and your studio.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column - Form */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white/90 backdrop-blur-sm py-8 px-6 shadow-xl sm:rounded-lg">
              <h2 className="text-2xl font-bold mb-3 text-center" style={{ color: colors.textPrimary }}>
                Join the Waitlist
              </h2>
              <p className="text-center text-gray-600 mb-6">
                Register your interest now, and we'll notify you the moment we're ready to welcome new members.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-black"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-black"
                    placeholder="your.email@example.com"
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 text-lg font-semibold rounded-lg transition-all duration-300 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: colors.primary, color: '#ffffff' }}
                >
                  {isSubmitting ? 'Joining...' : 'Join the Waitlist'}
                </button>

                <p className="text-sm text-gray-500 text-center">
                  We'll only use your information to notify you when we launch. No spam, we promise.
                </p>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-600">
                  Already a member?{' '}
                  <Link href="/auth/signin" className="font-semibold hover:underline" style={{ color: colors.primary }}>
                    Sign In
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Information */}
          <div className="space-y-8">
            {/* Features Grid */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                Why List Your Studio?
              </h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${colors.primary}20` }}>
                    <Star className="w-6 h-6" style={{ color: colors.primary }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      No Commission
                      {promoConfig.isActive && (
                        <span className="ml-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {promoConfig.badgeText}
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-600">
                      Keep 100% of what you earn. No stupid monthly payments!{' '}
                      {promoConfig.isActive ? (
                        <>
                          It&apos;s <span className="line-through">{promoConfig.normalPrice}</span>{' '}
                          <span className="font-semibold text-green-600">{promoConfig.promoPrice} for a limited time</span>
                        </>
                      ) : (
                        <>It&apos;s just {promoConfig.normalPrice}</>
                      )}{' '}
                      to list your studio! One booking more than covers the listing fee.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${colors.primary}20` }}>
                    <Users className="w-6 h-6" style={{ color: colors.primary }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Global Reach</h3>
                    <p className="text-gray-600">Be discovered by thousands of voice artists, agencies, and production teams worldwide. Ideal for travelling voiceovers who need a trusted local studio for a last minute job.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${colors.primary}20` }}>
                    <Building className="w-6 h-6" style={{ color: colors.primary }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Full Control</h3>
                    <p className="text-gray-600">Set your own availability, prices, and session rules. All enquiries go straight to you — no middlemen, no interference.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${colors.primary}20` }}>
                    <Shield className="w-6 h-6" style={{ color: colors.primary }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Privacy First</h3>
                    <p className="text-gray-600">You choose what information is visible. Display your contact details or hide them — your studio, your privacy, your call.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

