'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { colors } from '../../components/home/HomePage';


export default function PrivacyPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/bakground-images/21920-3.jpg"
          alt="Privacy policy background texture"
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
            src="/bakground-images/21920-5.jpg"
            alt="Hero background texture"
            fill
            className="object-cover opacity-40"
            priority={false}
          />
        </div>
        {/* Red gradient overlay */}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${colors.primary}e6, ${colors.primary}cc)` }}></div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
          <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
          <p className={`text-xl max-w-3xl mx-auto transition-all duration-1000 ease-out ${
            isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'
          }`} style={{ transitionDelay: '0.4s', color: 'rgba(255, 255, 255, 0.9)' }}>
            Your privacy is important to us
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 md:p-12 shadow-lg space-y-8">
            
            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">What is this Privacy Policy for?</h2>
              <p className="text-gray-700 leading-relaxed">
                This privacy policy is for this website www.voiceoverstudiofinder.com and served by Voiceover Studio Finder and governs the privacy of its users who choose to use it.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                The policy sets out the different areas where user privacy is concerned and outlines the obligations & requirements of the users, the website and website owners. Furthermore the way this website processes, stores and protects user data and information will also be detailed within this policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">The Website</h2>
              <p className="text-gray-700 leading-relaxed">
                This website and its owners take a proactive approach to user privacy and ensure the necessary steps are taken to protect the privacy of its users throughout their visiting experience. This website complies to all UK national laws and requirements for user privacy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">Use of Cookies</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                This website uses cookies to better the users experience while visiting the website. Where applicable this website uses a cookie control system allowing the user on their first visit to the website to allow or disallow the use of cookies on their computer / device. This complies with recent legislation requirements for websites to obtain explicit consent from users before leaving behind or reading files such as cookies on a user's computer / device.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Cookies are small files saved to the user's computers hard drive that track, save and store information about the user's interactions and usage of the website. This allows the website, through its server to provide the users with a tailored experience within this website.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Users are advised that if they wish to deny the use and saving of cookies from this website on to their computers hard drive they should take necessary steps within their web browsers security settings to block all cookies from this website and its external serving vendors.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                This website uses tracking software to monitor its visitors to better understand how they use it. This software is provided by Google Analytics which uses cookies to track visitor usage. The software will save a cookie to your computers hard drive in order to track and monitor your engagement and usage of the website, but will not store, save or collect personal information. You can read Google's <a href="http://www.google.com/privacy.html" className="text-primary-600 hover:text-primary-800 underline">privacy policy</a> here for further information.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Other cookies may be stored to your computers hard drive by external vendors when this website uses referral programs, sponsored links or adverts. Such cookies are used for conversion and referral tracking and typically expire after 30 days, though some may take longer. No personal information is stored, saved or collected.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">Contact & Communication</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Users contacting this website and/or its owners do so at their own discretion and provide any such personal details requested at their own risk. Your personal information is kept private and stored securely until a time it is no longer required or has no use, as detailed in the Data Protection Act 1998. Every effort has been made to ensure a safe and secure form to email submission process but advise users using such form to email processes that they do so at their own risk.
              </p>
              <p className="text-gray-700 leading-relaxed">
                This website and its owners use any information submitted to provide you with further information about the products / services they offer or to assist you in answering any questions or queries you may have submitted. This includes using your details to subscribe you to any email newsletter program the website operates but only if this was made clear to you and your express permission was granted when submitting any form to email process. Or whereby you the consumer have previously purchased from or enquired about purchasing from the company a product or service that the email newsletter relates to. This is by no means an entire list of your user rights in regard to receiving email marketing material. Your details are not passed on to any third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">Email Newsletter</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                This website operates an email newsletter program, used to inform subscribers about products and services supplied by this website. Users can subscribe through an online automated process should they wish to do so but do so at their own discretion. Some subscriptions may be manually processed through prior written agreement with the user.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Subscriptions are taken in compliance with UK Spam Laws detailed in the Privacy and Electronic Communications Regulations 2003. All personal details relating to subscriptions are held securely and in accordance with the Data Protection Act 1998. No personal details are passed on to third parties nor shared with companies / people outside of the company that operates this website. Under the Data Protection Act 1998 you may request a copy of personal information held about you by this website's email newsletter program. A small fee will be payable. If you would like a copy of the information held on you please write to the business address at the bottom of this policy.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Email marketing campaigns published by this website or its owners may contain tracking facilities within the actual email. Subscriber activity is tracked and stored in a database for future analysis and evaluation. Such tracked activity may include; the opening of emails, forwarding of emails, the clicking of links within the email content, times, dates and frequency of activity [this is by no far a comprehensive list].
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                This information is used to refine future email campaigns and supply the user with more relevant content based around their activity.
              </p>
              <p className="text-gray-700 leading-relaxed">
                In compliance with UK Spam Laws and the Privacy and Electronic Communications Regulations 2003 subscribers are given the opportunity to un-subscribe at any time through an automated system. This process is detailed at the footer of each email campaign. If an automated un-subscription system is unavailable clear instructions on how to un-subscribe will by detailed instead.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">External Links</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Although this website only looks to include quality, safe and relevant external links, users are advised adopt a policy of caution before clicking any external web links mentioned throughout this website. (External links are clickable text / banner / image links to other websites.)
              </p>
              <p className="text-gray-700 leading-relaxed">
                The owners of this website cannot guarantee or verify the contents of any externally linked website despite their best efforts. Users should therefore note they click on external links at their own risk and this website and its owners cannot be held liable for any damages or implications caused by visiting any external links mentioned.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">Social Media Platforms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Communication, engagement and actions taken through external social media platforms that this website and its owners participate on are custom to the terms and conditions as well as the privacy policies held with each social media platform respectively.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Users are advised to use social media platforms wisely and communicate / engage upon them with due care and caution in regard to their own privacy and personal details. This website nor its owners will ever ask for personal or sensitive information through social media platforms and encourage users wishing to discuss sensitive details to contact them through primary communication channels such as by telephone or email.
              </p>
              <p className="text-gray-700 leading-relaxed">
                This website may use social sharing buttons which help share web content directly from web pages to the social media platform in question. Users are advised before using such social sharing buttons that they do so at their own discretion and note that the social media platform may track and save your request to share a web page respectively through your social media platform account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">Termination of Account</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Any listing not complying with the terms will be deleted. This includes advertising other services. You should only sign up if you plan to allow your studio to be hired. Do not sign up if you are looking to use it to advertise your voiceover services only.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Strictly, no refund will be given as your sign up fee is the admin charge to create your account and also close your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-primary-800 mb-4">DBS Verification</h2>
              <p className="text-gray-700 leading-relaxed">
                If a studio is listed as DBS checked, please contact the studio direct for proof of status. We have no way of confirming their status so if you need confirmation please request directly with the studio.
              </p>
            </section>

            <section className="bg-primary-50 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-primary-800 mb-4">Contact Information</h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about this Privacy Policy or how we handle your personal information, please contact us at:
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
