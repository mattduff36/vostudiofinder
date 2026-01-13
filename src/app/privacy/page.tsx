'use client';

import Image from 'next/image';
import { PageHero } from '@/components/common/PageHero';
import { Footer } from '@/components/home/Footer';

export default function PrivacyPage() {

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Background Image */}
      <div className="absolute inset-0 pointer-events-none">
        <Image
          src="/background-images/21920-3.jpg"
          alt="Privacy policy background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      {/* Hero Section */}
      <PageHero
        title="Privacy Policy"
        description="Your privacy is important to us"
        backgroundImage="/background-images/21920-5.jpg"
      />

      {/* Content Section */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 flex-1">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-8 md:p-12">
          <div className="prose prose-gray max-w-none">
            <p className="text-sm text-gray-500 mb-8">Last updated: 23 November 2025</p>
            
            <p className="text-lg text-gray-700 mb-6">
              This Privacy Policy explains how Voiceover Studio Finder ("we", "us", "our") collects, uses and protects your personal data.
            </p>
            
            <p className="mb-4">
              We comply with the UK General Data Protection Regulation (UK GDPR) and the Privacy and Electronic Communications Regulations (PECR).
            </p>
            
            <p className="mb-8">
              This website is accessible worldwide.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">1. Information We Collect</h2>
            
            <p className="mb-4">We may collect the following information:</p>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Account & Listing Information</h3>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Name</li>
              <li>Email address</li>
              <li>Studio name and description</li>
              <li>Location (as provided)</li>
              <li>Images you upload</li>
              <li>Any content added to your listing</li>
            </ul>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Technical Data</h3>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>IP address</li>
              <li>Browser type</li>
              <li>Device type</li>
              <li>Pages viewed</li>
              <li>Time spent on site</li>
              <li>Approximate geographic region (IP-based)</li>
            </ul>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Cookies & Analytics</h3>
            
            <p className="mb-4">If you give consent, we use Google Analytics for:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>understanding traffic</li>
              <li>measuring engagement</li>
              <li>improving the website</li>
            </ul>
            
            <p className="mb-6 font-semibold">
              Analytics cookies will only load if you click "Accept All" in the cookie consent banner.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">2. How We Use Your Information</h2>
            
            <p className="mb-4">We use data to:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>create and display studio listings</li>
              <li>manage accounts and communications</li>
              <li>ensure website security</li>
              <li>improve user experience</li>
              <li>analyse traffic (only if consent given)</li>
              <li>comply with legal obligations</li>
            </ul>
            
            <p className="mb-4 font-semibold">We do not sell personal data.</p>
            <p className="mb-6 font-semibold">We do not share information for marketing purposes.</p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">3. Legal Basis for Processing</h2>
            
            <p className="mb-4">We rely on:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li><strong>Contract</strong> — to provide and maintain your listing</li>
              <li><strong>Legitimate Interests</strong> — site security, performance, essential cookies</li>
              <li><strong>Consent</strong> — analytics cookies (Google Analytics)</li>
            </ul>
            
            <p className="mb-6">You may withdraw consent at any time.</p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">4. International Users</h2>
            
            <p className="mb-4">
              This website is operated from the United Kingdom.
            </p>
            
            <p className="mb-4">
              By using the service, you consent to your data being processed under UK GDPR standards, regardless of your location.
            </p>
            
            <p className="mb-4">
              Your data may be stored in the UK or EU.
            </p>
            
            <p className="mb-6">
              Users outside the UK/EU acknowledge that local data protection laws may differ.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">5. Third-Party Services We Use</h2>
            
            <p className="mb-4">We may use the following trusted providers:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li><strong>Google Analytics</strong> – traffic analytics (consent-based)</li>
              <li><strong>Cloudinary</strong> – hosting and processing of uploaded studio images</li>
              <li><strong>Google Maps API</strong> – location search and mapping</li>
              <li><strong>Resend</strong> – sending essential emails</li>
              <li><strong>Stripe</strong> – payment processing for subscriptions</li>
            </ul>
            
            <p className="mb-6">
              Each provider processes data according to its own privacy policy.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">6. Data Retention</h2>
            
            <p className="mb-4">We retain personal data only for as long as necessary to:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>operate your account</li>
              <li>comply with legal requirements</li>
              <li>maintain site security</li>
              <li>resolve potential disputes</li>
            </ul>
            
            <p className="mb-6">
              If you delete your account, your listing and data will be removed.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">7. Your Rights</h2>
            
            <p className="mb-4">Under UK GDPR, you may:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>access your data</li>
              <li>request correction</li>
              <li>request deletion</li>
              <li>object to processing</li>
              <li>withdraw cookie consent</li>
              <li>request a copy of your data</li>
            </ul>
            
            <p className="mb-6">
              To exercise these rights, contact:{' '}
              <a href="mailto:support@voiceoverstudiofinder.com" className="text-[#d42027] hover:text-[#b91c23] font-semibold">
                support@voiceoverstudiofinder.com
              </a>
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">8. Cookies</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Essential cookies (always active)</h3>
            
            <p className="mb-4">Used for:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>login sessions</li>
              <li>account management</li>
              <li>security</li>
              <li>basic site functionality</li>
            </ul>
            
            <p className="mb-6 font-semibold">These cannot be disabled.</p>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">Analytics cookies (optional)</h3>
            
            <p className="mb-4">When you first visit the site, you'll see a cookie consent banner with three options:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li><strong>Accept All</strong> — enables Google Analytics and Vercel Analytics</li>
              <li><strong>Necessary Only</strong> — disables all analytics tracking</li>
              <li><strong>Decline</strong> — disables all analytics tracking</li>
            </ul>
            
            <p className="mb-6">
              Analytics cookies only load after you click "Accept All". You can change your preferences at any time using the Cookie Settings link in the footer, or by clearing your browser cookies.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">9. Contact</h2>
            
            <p className="mb-2">For privacy questions or data access requests:</p>
            
            <p className="mb-8">
              <a href="mailto:support@voiceoverstudiofinder.com" className="text-[#d42027] hover:text-[#b91c23] font-semibold">
                support@voiceoverstudiofinder.com
              </a>
            </p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
