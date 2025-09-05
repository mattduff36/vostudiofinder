'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function TermsPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/bakground-images/21920-4.jpg"
          alt="Terms of service background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      {/* Hero Section */}
      <div className="relative z-10 bg-gradient-to-r from-primary-800/90 to-primary-600/90 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms of Service</h1>
          <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
          <p className={`text-xl text-primary-100 max-w-3xl mx-auto transition-all duration-1000 ease-out ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.4s' }}>
            Terms and conditions for using VoiceoverStudioFinder
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 md:p-12 shadow-lg space-y-8">
            
            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing and using VoiceoverStudioFinder ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                VoiceoverStudioFinder is a platform that connects voice artists with recording studios worldwide. We provide a marketplace where:
              </p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
                <li>Studio owners can list their facilities for rent</li>
                <li>Voice artists can search and find suitable recording spaces</li>
                <li>Users can browse studio profiles, view images, and contact studio owners directly</li>
                <li>Studio owners can manage their listings and respond to inquiries</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">3. User Accounts and Registration</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                To access certain features of the Service, you may be required to create an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password and accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">4. Studio Listings</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Studio owners who list their facilities agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
                <li>Provide accurate and truthful information about their studio</li>
                <li>Only list studios they own or have permission to rent out</li>
                <li>Respond to inquiries in a timely and professional manner</li>
                <li>Honor the terms and pricing stated in their listings</li>
                <li>Maintain their studio in the condition described in their listing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">5. Membership and Payments</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                VoiceoverStudioFinder operates on a membership model:
              </p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
                <li>Browsing studios and viewing profiles is free for all users</li>
                <li>Creating a studio listing requires a paid membership (£25/year)</li>
                <li>Membership fees are non-refundable as they cover administrative costs</li>
                <li>We do not take commission from bookings between users</li>
                <li>All transactions between studio owners and renters are handled directly between parties</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">6. Prohibited Uses</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may not use our Service:
              </p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
                <li>To advertise services other than studio rentals</li>
                <li>To post false, misleading, or fraudulent information</li>
                <li>To harass, abuse, or harm other users</li>
                <li>To violate any applicable laws or regulations</li>
                <li>To upload malicious code or attempt to compromise system security</li>
                <li>To scrape or harvest user data without permission</li>
                <li>To impersonate others or create fake accounts</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">7. Content and Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Users retain ownership of content they upload but grant VoiceoverStudioFinder a license to use, display, and distribute such content as necessary to provide the Service.
              </p>
              <p className="text-gray-700 leading-relaxed">
                The VoiceoverStudioFinder platform, including its design, functionality, and original content, is protected by copyright and other intellectual property rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">8. Privacy and Data Protection</h2>
              <p className="text-gray-700 leading-relaxed">
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices regarding your personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">9. Disclaimers and Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                VoiceoverStudioFinder provides the platform "as is" without warranties of any kind. We:
              </p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
                <li>Do not guarantee the accuracy of studio listings</li>
                <li>Are not responsible for disputes between users</li>
                <li>Do not verify the identity or credentials of users</li>
                <li>Are not liable for any damages arising from use of the Service</li>
                <li>Do not guarantee continuous, uninterrupted access to the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">10. Account Termination</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We reserve the right to suspend or terminate accounts that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
                <li>Violate these Terms of Service</li>
                <li>Engage in fraudulent or deceptive practices</li>
                <li>Advertise services other than studio rentals</li>
                <li>Remain inactive for extended periods</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                No refunds will be provided for terminated accounts as membership fees cover administrative costs.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">11. Indemnification</h2>
              <p className="text-gray-700 leading-relaxed">
                You agree to indemnify and hold harmless VoiceoverStudioFinder and its affiliates from any claims, damages, or expenses arising from your use of the Service or violation of these terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">12. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms of Service are governed by the laws of the United Kingdom. Any disputes arising from these terms or use of the Service will be subject to the jurisdiction of UK courts.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">13. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting. Your continued use of the Service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="bg-primary-50 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-primary-800 mb-4">Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-gray-700"><strong>Email:</strong> legal@voiceoverstudiofinder.com</p>
                <p className="text-gray-700"><strong>Website:</strong> www.voiceoverstudiofinder.com</p>
              </div>
            </section>

            <section className="text-center text-sm text-gray-500 border-t pt-6">
              <p>These terms were last updated on: {new Date().toLocaleDateString()}</p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
