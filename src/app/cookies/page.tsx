'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { colors } from '../../components/home/HomePage';

export default function CookiesPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-5.jpg"
          alt="Cookie policy background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      {/* Hero Section */}
      <div className="relative z-10 text-white py-20 overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0">
          <Image
            src="/background-images/21920.jpg"
            alt="Hero background texture"
            fill
            className="object-cover opacity-40"
            priority={false}
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 transition-all duration-1000 ease-out ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-20'
          }`} style={{ transitionDelay: '0.2s' }}>Cookie Policy</h1>
          <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
          <p className={`text-xl text-center transition-all duration-1000 ease-out ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.4s', color: 'rgba(255, 255, 255, 0.9)', maxWidth: '768px', margin: '0 auto' }}>
            How we use cookies to improve your experience
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 md:p-12 shadow-lg space-y-8">
            
            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">What are Cookies?</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Cookies are small text files that are stored on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners about how users interact with their sites.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Cookies help us understand which parts of our website are most popular, where visitors are going, and how much time they spend there. We use this information to improve our website and your experience.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">How We Use Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                VoiceoverStudioFinder uses cookies to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
                <li>Remember your login status and preferences</li>
                <li>Analyze website traffic and user behavior</li>
                <li>Provide personalized content and recommendations</li>
                <li>Improve website functionality and user experience</li>
                <li>Enable social media features and integrations</li>
                <li>Serve relevant advertisements (if applicable)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">Types of Cookies We Use</h2>
              
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Essential Cookies</h3>
                  <p className="text-gray-700 text-sm">
                    These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and accessibility.
                  </p>
                  <p className="text-gray-600 text-xs mt-2"><strong>Duration:</strong> Session or up to 1 year</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Analytics Cookies</h3>
                  <p className="text-gray-700 text-sm">
                    We use Google Analytics to understand how visitors use our website. These cookies collect information about how you use our site, which pages you visit, and any errors you encounter.
                  </p>
                  <p className="text-gray-600 text-xs mt-2"><strong>Duration:</strong> Up to 2 years</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Functional Cookies</h3>
                  <p className="text-gray-700 text-sm">
                    These cookies allow us to remember choices you make and provide enhanced, more personal features. They may be set by us or by third-party providers.
                  </p>
                  <p className="text-gray-600 text-xs mt-2"><strong>Duration:</strong> Session or up to 1 year</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Authentication Cookies</h3>
                  <p className="text-gray-700 text-sm">
                    These cookies are used by NextAuth.js to manage user sessions and authentication. They ensure you remain logged in as you navigate the site.
                  </p>
                  <p className="text-gray-600 text-xs mt-2"><strong>Duration:</strong> Session or up to 30 days</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">Third-Party Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may use third-party services that set their own cookies. These include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
                <li><strong>Google Analytics:</strong> For website analytics and performance monitoring</li>
                <li><strong>Social Media Platforms:</strong> For social login and sharing features</li>
                <li><strong>Payment Processors:</strong> For secure payment processing (Stripe, PayPal)</li>
                <li><strong>Content Delivery Networks:</strong> For faster content delivery</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-4">
                These third parties may use cookies to track your activity across different websites. Please refer to their respective privacy policies for more information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">Managing Your Cookie Preferences</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                You have several options for managing cookies:
              </p>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Browser Settings</h3>
                  <p className="text-blue-700 text-sm">
                    Most browsers allow you to control cookies through their settings. You can set your browser to refuse cookies or to alert you when cookies are being sent.
                  </p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">Cookie Banner</h3>
                  <p className="text-yellow-700 text-sm">
                    When you first visit our site, you'll see a cookie banner allowing you to accept or decline non-essential cookies.
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Opt-Out Links</h3>
                  <p className="text-green-700 text-sm">
                    You can opt out of Google Analytics tracking by visiting: 
                    <a href="https://tools.google.com/dlpage/gaoptout" className="text-green-600 hover:text-green-800 underline ml-1" target="_blank" rel="noopener noreferrer">
                      Google Analytics Opt-out
                    </a>
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">Impact of Disabling Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                While you can disable cookies, doing so may affect your experience on our website:
              </p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
                <li>You may need to re-enter login information each time you visit</li>
                <li>Some features may not work properly or may be unavailable</li>
                <li>Personalized content and recommendations may not be available</li>
                <li>We won't be able to remember your preferences</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">Cookie Consent</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By continuing to use our website after seeing our cookie notice, you consent to our use of cookies as described in this policy. You can withdraw your consent at any time by:
              </p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed space-y-2">
                <li>Changing your browser settings to block cookies</li>
                <li>Clearing existing cookies from your browser</li>
                <li>Contacting us to request removal of your data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">Updates to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the updated policy on our website.
              </p>
            </section>

            <section className="bg-primary-50 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-primary-800 mb-4">Contact Us</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-gray-700"><strong>Email:</strong> privacy@voiceoverstudiofinder.com</p>
                <p className="text-gray-700"><strong>Website:</strong> www.voiceoverstudiofinder.com</p>
              </div>
            </section>

            <section className="text-center text-sm text-gray-500 border-t pt-6">
              <p>This policy was last updated on: {new Date().toLocaleDateString()}</p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
