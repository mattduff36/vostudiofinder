'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Search, Book, Mail, Building, Users, Star } from 'lucide-react';
import { useState } from 'react';
import { PageHero } from '@/components/common/PageHero';
import { colors } from '../../components/home/HomePage';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Footer } from '@/components/home/Footer';

export default function HelpPage() {
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);

  const faqData = [
    {
      id: 'what-is-vsf',
      question: 'What is Voiceover Studio Finder?',
      answer: 'Voiceover Studio Finder is a platform that connects voice artists with professional recording studios worldwide. If you have a studio or are voiceover talent and want to earn extra money, you can list your services here for improved SEO and more visibility!'
    },
    {
      id: 'who-can-sign-up',
      question: 'Can anyone sign up?',
      answer: 'Yes. Anyone with a studio who hires it out for voiceover services can sign up. We also accept voiceover artists looking to create professional profiles.'
    },
    {
      id: 'who-uses-it',
      question: 'Who is using it?',
      answer: 'Agencies looking to place an artist into a studio nearby, voice artists searching for professional recording spaces, and studio owners wanting to increase their bookings.'
    },
    {
      id: 'membership-cost',
      question: 'Why is there a membership fee?',
      answer: 'To expand and maintain our platform, we charge a small annual fee to keep VoiceoverStudioFinder live and continuously improving our services.'
    },
    {
      id: 'social-media',
      question: 'Can I add my social media links?',
      answer: 'Yes, of course. Add all of them to your profile to increase your online presence and make it easier for clients to connect with you.'
    },
    {
      id: 'profile-content',
      question: 'What should I put on my profile page?',
      answer: 'A brief description for your heading and then some specifics in your long description. Include details of what you offer, useful services like directing, editing, equipment available, and your unique selling points.'
    },
    {
      id: 'character-limit',
      question: 'Why is there a character limit to the short description?',
      answer: 'This is also your meta description, so it has great SEO benefits on search engines. Keeping it concise ensures better search engine optimization.'
    },
    {
      id: 'featured-studio',
      question: 'What is a Featured Studio?',
      answer: "It's an option to place your studio on the homepage below the map, giving you premium visibility to potential clients browsing the site."
    },
    {
      id: 'voiceover-profile',
      question: "I'm a voiceover, can I create a profile?",
      answer: 'Yes! We now accept voiceovers. A great way to create a unique professional profile and connect with studios and clients.'
    },
    {
      id: 'verified-status',
      question: "What is 'Verified' status?",
      answer: 'Verified is for awesome studio profiles! Want to get verified? Contact us and we\'ll review your profile for verification.'
    },
    {
      id: 'contact-studio',
      question: 'How do I contact a studio or talent?',
      answer: 'Any messages go direct to the email address they provided, not via the site. You can use our contact forms or reach out directly through their listed contact methods.'
    },
    {
      id: 'bookings',
      question: 'Do you deal with bookings?',
      answer: 'No. It is completely up to you to book with the talent or studio. We provide the platform for connection, but all arrangements are made directly between parties.'
    },
    {
      id: 'rates',
      question: 'Do I need to show my rates?',
      answer: 'Not at all. You decide what you would like to show on your profile. Many studios prefer to discuss rates directly with clients.'
    },
    {
      id: 'address',
      question: 'Do I have to show my address?',
      answer: 'No. You have total control. Show & hide what you want. We respect privacy, especially for home studios.'
    },
    {
      id: 'map-zoom',
      question: "Why can't I zoom right in on the map?",
      answer: 'We restrict the zoom so not to reveal exact streets for home studios. If you want to display your full address it\'s up to you, but we protect privacy by default.'
    }
  ];

  const toggleFAQ = (id: string) => {
    setOpenFAQ(openFAQ === id ? null : id);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-6.jpg"
          alt="Help center background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      {/* Hero Section */}
      <PageHero
        title="Help Center"
        description="Find answers to your questions and get the most out of VoiceoverStudioFinder"
        backgroundImage="/background-images/21920-2.jpg"
      />

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 flex-1">
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
          <Link href="/studios" className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${colors.primary}20` }}>
              <Search className="w-8 h-8" style={{ color: colors.primary }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: colors.textPrimary }}>Browse Studios</h3>
            <p style={{ color: colors.textSecondary }}>Start exploring our collection of professional recording studios</p>
          </Link>

          <Link href="/auth/signup" className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${colors.primary}20` }}>
              <Book className="w-8 h-8" style={{ color: colors.primary }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: colors.textPrimary }}>List Your Studio</h3>
            <p style={{ color: colors.textSecondary }}>Join our community and start earning from your studio space</p>
          </Link>
        </div>

        {/* How It Works Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 md:p-12 shadow-lg mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center" style={{ color: colors.textPrimary }}>How It Works</h2>
          
          <div className="max-w-3xl mx-auto space-y-8">
            {/* For Studio Owners */}
            <div>
              <h3 className="text-2xl font-semibold mb-6" style={{ color: colors.primary }}>For Studio Owners</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${colors.primary}20` }}>
                    <Star className="w-6 h-6" style={{ color: colors.primary }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-1">No Commission</h4>
                    <p className="text-gray-600">Keep 100% of what you earn. Just £25/year to list your studio—one booking often pays for the whole year.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${colors.primary}20` }}>
                    <Users className="w-6 h-6" style={{ color: colors.primary }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-1">Global Reach</h4>
                    <p className="text-gray-600">Get discovered by thousands of voice artists worldwide. Connect with travelling voiceovers and agencies needing local studios.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${colors.primary}20` }}>
                    <Building className="w-6 h-6" style={{ color: colors.primary }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-1">Full Control</h4>
                    <p className="text-gray-600">You decide your availability, rates, and who you work with. Enquiries arrive directly to you with no middlemen.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* For Voice Artists */}
            <div>
              <h3 className="text-2xl font-semibold mb-6" style={{ color: colors.primary }}>For Voice Artists</h3>
              <div className="space-y-3 text-gray-700">
                <p>✓ <strong>Find studios quickly:</strong> Search for professional recording spaces near you.</p>
                <p>✓ <strong>Direct contact:</strong> Connect directly with studio owners via their contact details.</p>
                <p>✓ <strong>Transparent information:</strong> View studio photos, equipment, services, and pricing.</p>
                <p>✓ <strong>Book on your terms:</strong> All bookings and arrangements are made directly between you and the studio owner.</p>
              </div>
            </div>

            {/* Platform Features */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4" style={{ color: colors.textPrimary }}>What Makes Us Different</h3>
              <div className="space-y-2 text-gray-700">
                <p>✓ <strong>Privacy first:</strong> Control what information is visible on your profile.</p>
                <p>✓ <strong>No commission fees:</strong> We don't take a cut of your bookings.</p>
                <p>✓ <strong>Simple annual membership:</strong> One flat fee per year for unlimited listings.</p>
                <p>✓ <strong>Direct communication:</strong> All enquiries go straight to you—we're just the platform.</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 md:p-12 shadow-lg">
          <h2 className="text-3xl font-bold mb-8 text-center" style={{ color: colors.textPrimary }}>Frequently Asked Questions</h2>
          <p className="text-center mb-8" style={{ color: colors.textSecondary }}>
            Click the question for the answer
          </p>
          
          <div className="space-y-4">
            {faqData.map((faq) => (
              <div 
                key={faq.id} 
                className="border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                <button
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between focus:outline-none focus:ring-2 transition-all duration-200"
                  style={{ 
                    '--tw-ring-color': colors.primary,
                    backgroundColor: openFAQ === faq.id ? `${colors.primary}10` : 'white'
                  } as React.CSSProperties}
                  onMouseEnter={(e) => {
                    if (openFAQ !== faq.id) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (openFAQ !== faq.id) {
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <span 
                    className="font-semibold text-lg pr-4"
                    style={{ color: openFAQ === faq.id ? colors.primary : colors.textPrimary }}
                  >
                    {faq.question}
                  </span>
                  {openFAQ === faq.id ? (
                    <ChevronUp className="w-5 h-5 flex-shrink-0" style={{ color: colors.primary }} />
                  ) : (
                    <ChevronDown className="w-5 h-5 flex-shrink-0" style={{ color: colors.textSecondary }} />
                  )}
                </button>
                
                {openFAQ === faq.id && (
                  <div 
                    className="px-6 pb-4 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200"
                    style={{ backgroundColor: `${colors.primary}05` }}
                  >
                    <p className="pt-4" style={{ color: colors.textSecondary }}>
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-16 rounded-lg p-8 text-center" style={{ backgroundColor: `${colors.primary}10` }}>
          <h2 className="text-2xl font-bold mb-4" style={{ color: colors.textPrimary }}>Still Need Help?</h2>
          <p className="text-gray-700 mb-6 text-center" style={{ maxWidth: '768px', margin: '0 auto' }}>
            Can't find the answer you're looking for? We're here to help you get the most out of VoiceoverStudioFinder.
          </p>
          <div className="flex items-center justify-center space-x-3">
            <Mail className="w-6 h-6" style={{ color: colors.primary }} />
            <a 
              href="mailto:support@voiceoverstudiofinder.com"
              className="text-lg font-medium transition-colors hover:underline"
              style={{ color: colors.primary }}
            >
              support@voiceoverstudiofinder.com
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            For any questions or issues, please email us and we'll get back to you as soon as possible.
          </p>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}