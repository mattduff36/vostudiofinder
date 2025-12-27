'use client';

import Image from 'next/image';
import { PageHero } from '@/components/common/PageHero';
import { Footer } from '@/components/home/Footer';

export default function AboutPage() {

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-6.jpg"
          alt="About us background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      {/* Hero Section */}
      <PageHero
        title="About"
        description="About Voiceover Studio Finder"
        backgroundImage="/background-images/21920-2.jpg"
      />

      {/* Content Section */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 flex-1">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-8 md:p-12">
          <div className="prose prose-gray max-w-none">
            
            <p className="text-2xl text-gray-900 font-light mb-8 text-center">
              Finding a great recording studio shouldn't be hard, so we built a better way to do it.
            </p>
            
            <p className="text-lg text-gray-700 mb-6">
              Voiceover Studio Finder connects voice artists, podcasters, broadcasters and producers with professional recording studios worldwide — all in one clean, simple directory.
            </p>
            
            <p className="mb-8">
              Whether you need a voiceover booth, a full recording studio, or a podcast space, we make it easy to find verified studios near you, see what they offer, and contact them directly — with no commission and no middlemen.
            </p>

            <div className="w-24 h-1 bg-[#d42027] mx-auto my-12"></div>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Why We Exist</h2>
            
            <p className="mb-4">
              This platform was created by working voiceover professionals who know the problem first-hand: great studios sitting empty, while people urgently search for a reliable place to record.
            </p>
            
            <p className="mb-4">We built Voiceover Studio Finder to:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Showcase high-quality studios beyond the usual big-city bubbles</li>
              <li>Help studio owners earn extra income from their spaces</li>
              <li>Give creatives a fast, trustworthy way to find the right room for the job</li>
            </ul>
            
            <p className="mb-8 font-semibold">
              Simple, transparent, and built for people who actually record for a living.
            </p>

            <div className="w-24 h-1 bg-[#d42027] mx-auto my-12"></div>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">For Studio Owners</h2>
            
            <p className="mb-4 text-lg font-semibold text-gray-800">
              Voiceover Studio Finder is a listing platform, not a booking agent.
            </p>
            
            <p className="mb-6 text-lg font-semibold text-gray-800">
              You stay fully in control of your studio.
            </p>
            
            <p className="mb-4">Choose how much — or how little — you want to share:</p>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Write a detailed studio description or keep it brief</li>
              <li>Add hourly rates, equipment lists, and services</li>
              <li>Link to your website and social media profiles</li>
              <li>Decide who can contact you, and when</li>
            </ul>
            
            <p className="mb-6">
              You choose whether your studio is hired out, who you work with, and on what terms. Enquiries come directly to you — no commission, no interference.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-4">For location privacy:</h3>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Commercial studios can show their full address</li>
              <li>Home studios can list a town, city, or local landmark instead</li>
            </ul>
            
            <p className="mb-8">
              Every studio page is designed to present your space clearly and professionally — often giving studios a stronger, more focused showcase than their own website.
            </p>

            <div className="w-24 h-1 bg-[#d42027] mx-auto my-12"></div>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">What Makes Us Different</h2>
            
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Voiceover, recording and podcast studios — not just one niche</li>
              <li>Direct contact between studios and clients</li>
              <li>Verified listings with real photos, real equipment, real locations</li>
              <li>Built by industry insiders, not a generic booking platform</li>
            </ul>
            
            <p className="mb-8 text-lg font-semibold text-gray-800">
              If it's a space where spoken word, broadcast, or audio content gets made — it belongs here.
            </p>

          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}



















