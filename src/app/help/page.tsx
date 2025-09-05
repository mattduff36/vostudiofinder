'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Search, MessageCircle, Book, Phone, Mail, Users, Building } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function HelpPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/bakground-images/21920-6.jpg"
          alt="Help center background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      {/* Hero Section */}
      <div className="relative z-10 bg-gradient-to-r from-primary-800/90 to-primary-600/90 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Help Center</h1>
          <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
          <p className={`text-xl text-primary-100 max-w-3xl mx-auto transition-all duration-1000 ease-out ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.4s' }}>
            Find answers to your questions and get the most out of VoiceoverStudioFinder
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="relative z-10 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Link href="/contact" className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-primary-800 mb-2">Contact Support</h3>
              <p className="text-gray-600">Get in touch with our support team for personalized help</p>
            </Link>

            <Link href="/studios" className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Search className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-primary-800 mb-2">Browse Studios</h3>
              <p className="text-gray-600">Start exploring our collection of professional recording studios</p>
            </Link>

            <Link href="/auth/signup" className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Building className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-primary-800 mb-2">List Your Studio</h3>
              <p className="text-gray-600">Join our community and start earning from your studio space</p>
            </Link>
          </div>

          {/* FAQ Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 md:p-12 shadow-lg">
            <h2 className="text-3xl font-bold text-primary-800 mb-8 text-center">Frequently Asked Questions</h2>
            
            <div className="space-y-8">
              
              {/* For Voice Artists */}
              <section>
                <h3 className="text-2xl font-semibold text-primary-700 mb-6 flex items-center">
                  <Users className="w-6 h-6 mr-3" />
                  For Voice Artists
                </h3>
                <div className="space-y-4">
                  <div className="border-l-4 border-primary-200 pl-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">How do I find studios near me?</h4>
                    <p className="text-gray-600">
                      Use our search feature on the <Link href="/studios" className="text-primary-600 hover:text-primary-800 underline">Browse Studios</Link> page. 
                      You can filter by location, services, equipment, and more to find the perfect studio for your needs.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-primary-200 pl-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Do I need to create an account to browse studios?</h4>
                    <p className="text-gray-600">
                      No! You can browse all studio profiles, view photos, read descriptions, and see contact information without creating an account. 
                      This makes it easy to find what you need quickly.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-primary-200 pl-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">How do I contact a studio?</h4>
                    <p className="text-gray-600">
                      Each studio profile includes contact information such as phone numbers, email addresses, and website links. 
                      You can contact the studio owner directly to discuss availability and pricing.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-primary-200 pl-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Are there any booking fees?</h4>
                    <p className="text-gray-600">
                      No, we don't charge any booking fees or commissions. All arrangements and payments are made directly between 
                      you and the studio owner, so you get the best possible rates.
                    </p>
                  </div>
                </div>
              </section>

              {/* For Studio Owners */}
              <section>
                <h3 className="text-2xl font-semibold text-primary-700 mb-6 flex items-center">
                  <Building className="w-6 h-6 mr-3" />
                  For Studio Owners
                </h3>
                <div className="space-y-4">
                  <div className="border-l-4 border-green-200 pl-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">How much does it cost to list my studio?</h4>
                    <p className="text-gray-600">
                      Studio listings require a membership of £25 per year. This is a one-time annual fee that covers all administrative costs. 
                      There are no additional fees or commissions on bookings.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-green-200 pl-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">What information should I include in my listing?</h4>
                    <p className="text-gray-600">
                      Include details about your equipment (microphones, preamps, monitors), room acoustics, available services 
                      (recording, mixing, editing), location, rates, and any special features. High-quality photos are essential!
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-green-200 pl-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">How do I manage inquiries and bookings?</h4>
                    <p className="text-gray-600">
                      All inquiries come directly to you via the contact methods you provide in your listing. You have complete control 
                      over your availability, rates, and who you choose to work with.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-green-200 pl-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Can I update my listing after it's published?</h4>
                    <p className="text-gray-600">
                      Yes, you can update your studio information, photos, rates, and availability at any time through your account dashboard. 
                      Changes are reflected immediately on your public listing.
                    </p>
                  </div>
                </div>
              </section>

              {/* General */}
              <section>
                <h3 className="text-2xl font-semibold text-primary-700 mb-6 flex items-center">
                  <Book className="w-6 h-6 mr-3" />
                  General Questions
                </h3>
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-200 pl-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">What makes VoiceoverStudioFinder different?</h4>
                    <p className="text-gray-600">
                      We're often called the "Airbnb of voiceover studios." Unlike other platforms, we don't take commissions, 
                      allow public browsing without registration, and focus specifically on the voiceover industry's unique needs.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-blue-200 pl-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Is my personal information safe?</h4>
                    <p className="text-gray-600">
                      Yes, we take privacy seriously. Please read our <Link href="/privacy" className="text-primary-600 hover:text-primary-800 underline">Privacy Policy</Link> 
                      for detailed information about how we protect and use your data.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-blue-200 pl-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">What if I have a dispute with a studio or client?</h4>
                    <p className="text-gray-600">
                      Since all arrangements are made directly between users, we encourage clear communication about expectations, 
                      rates, and policies upfront. For serious issues, please contact our support team.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-blue-200 pl-4">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Do you verify studio listings?</h4>
                    <p className="text-gray-600">
                      We review all listings for quality and appropriateness, but users should verify details directly with studio owners. 
                      We encourage reading reviews and asking questions before booking.
                    </p>
                  </div>
                </div>
              </section>

            </div>
          </div>

          {/* Contact Information */}
          <div className="mt-16 bg-primary-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-primary-800 mb-4">Still Need Help?</h2>
            <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
              Can't find the answer you're looking for? Our support team is here to help you get the most out of VoiceoverStudioFinder.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-center space-x-3">
                <Mail className="w-5 h-5 text-primary-600" />
                <span className="text-gray-700">support@voiceoverstudiofinder.com</span>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <Phone className="w-5 h-5 text-primary-600" />
                <span className="text-gray-700">+1 (555) 123-4567</span>
              </div>
            </div>
            <div className="mt-4">
              <Link 
                href="/contact" 
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Support
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
