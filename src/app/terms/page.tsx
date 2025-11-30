'use client';

import Image from 'next/image';
import { PageHero } from '@/components/common/PageHero';
import { Footer } from '@/components/home/Footer';

export default function TermsPage() {

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-4.jpg"
          alt="Terms of service background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      {/* Hero Section */}
      <PageHero
        title="Terms & Conditions"
        description="Terms and conditions for using Voiceover Studio Finder"
      />

      {/* Content Section */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-8 md:p-12">
          <div className="prose prose-gray max-w-none">
            <p className="text-sm text-gray-500 mb-8">Last updated: 23 November 2025</p>
            
            <p className="text-lg text-gray-700 mb-6">
              Welcome to Voiceover Studio Finder ("we", "us", "our").
            </p>
            
            <p className="mb-6">
              By accessing or using this website, you agree to these Terms & Conditions.
            </p>
            
            <p className="mb-8 font-semibold">
              If you do not agree, please refrain from using the site.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">1. What Voiceover Studio Finder Is</h2>
            
            <p className="mb-4">
              Voiceover Studio Finder is a directory platform.
            </p>
            
            <p className="mb-4">
              We allow studio owners to list their recording facilities so voiceovers, producers and creatives can find a suitable space.
            </p>
            
            <p className="mb-4">
              We simply provide a place to display listings.
            </p>
            
            <p className="mb-4 font-semibold">We do not:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>handle or manage bookings</li>
              <li>get involved in communication</li>
              <li>take commissions or fees from studio hires</li>
              <li>verify the identity or suitability of studio owners or users</li>
              <li>provide insurance or safety certification</li>
              <li>guarantee the accuracy or quality of any listing</li>
              <li>accept responsibility for studio availability, conduct or pricing</li>
            </ul>
            
            <p className="mb-6 font-semibold">
              All arrangements are made directly between studio owners and clients.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">2. Your Responsibilities</h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">If you are a studio owner</h3>
            
            <p className="mb-4">You are solely responsible for:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>the accuracy of your listing (content, photos, location, rates)</li>
              <li>your pricing, terms and availability</li>
              <li>verifying the identity and suitability of anyone you allow into your property</li>
              <li>ensuring your studio complies with any local laws, regulations or safety requirements</li>
              <li>having your own insurance where applicable</li>
              <li>managing your own communication and bookings outside the platform</li>
            </ul>
            
            <p className="mb-6">
              You accept that all agreements (including cancellations, payments, refunds and conduct) occur independently of Voiceover Studio Finder.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">If you are a studio user</h3>
            
            <p className="mb-4">You are responsible for:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>checking the suitability, quality and safety of any studio</li>
              <li>verifying the studio owner</li>
              <li>agreeing terms and pricing directly with the studio owner</li>
              <li>your conduct while using the space</li>
              <li>complying with any studio rules or requirements</li>
            </ul>
            
            <p className="mb-6">
              We strongly recommend performing due diligence such as confirming identity, asking for references and clarifying all expectations before attending any studio.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">3. No Liability</h2>
            
            <p className="mb-4">
              To the fullest extent permitted by law, we accept no liability whatsoever for:
            </p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>disputes or issues between studio owners and users</li>
              <li>cancellation, missed sessions, no-shows or miscommunication</li>
              <li>personal injury, loss, damage or incidents occurring in any studio</li>
              <li>misuse, loss or damage of equipment</li>
              <li>accuracy or completeness of any listing</li>
              <li>the safety, suitability or conduct of any user or studio owner</li>
              <li>any financial loss, including lost earnings or missed opportunities</li>
              <li>any decisions or actions taken based on information on the website</li>
              <li>technical issues, downtime, or website errors</li>
            </ul>
            
            <p className="mb-6 font-semibold">
              Use of the platform is entirely at your own risk.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">4. User-Generated Content</h2>
            
            <p className="mb-4">Studio owners upload their own:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>text</li>
              <li>images</li>
              <li>rates</li>
              <li>contact details</li>
              <li>studio information</li>
            </ul>
            
            <p className="mb-4">By doing so, you confirm that you:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>own or have permission to use the content</li>
              <li>grant us permission to display it</li>
              <li>will not upload unlawful, harmful or infringing material</li>
            </ul>
            
            <p className="mb-6">
              We reserve the right to edit or remove any content that breaches our guidelines.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">5. Platform Availability</h2>
            
            <p className="mb-4">We do not guarantee that the website will:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>operate without interruption</li>
              <li>be error-free</li>
              <li>be available at all times</li>
              <li>work perfectly on all devices or browsers</li>
            </ul>
            
            <p className="mb-6">
              We may modify, update or suspend parts of the site at any time.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">6. Paid Features & Subscriptions</h2>
            
            <p className="mb-4">If we introduce paid options (such as annual subscriptions or featured listings):</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>all pricing will be displayed clearly</li>
              <li>additional terms may apply</li>
              <li>payments will be processed via Stripe</li>
              <li>cancellation and renewal rules will be published clearly</li>
              <li>refunds will follow the stated policy</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">7. International Users</h2>
            
            <p className="mb-4">
              Voiceover Studio Finder is operated from the United Kingdom.
            </p>
            
            <p className="mb-4">
              Users from all countries are welcome.
            </p>
            
            <p className="mb-4">By using the service, you acknowledge that:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>UK law governs these Terms</li>
              <li>your data may be processed and stored in the UK and EU</li>
              <li>it is your responsibility to comply with local laws in your own jurisdiction</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">8. Governing Law</h2>
            
            <p className="mb-4">
              These Terms & Conditions are governed by the laws of England & Wales.
            </p>
            
            <p className="mb-6">
              Any disputes shall be handled exclusively in the UK courts.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">9. Contact</h2>
            
            <p className="mb-2">For support or questions, email:</p>
            
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
