/**
 * Seed FAQs into the database
 * Run with: npx tsx scripts/seed-faqs.ts
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const db = new PrismaClient();

const faqs = [
  {
    question: 'What is Voiceover Studio Finder?',
    answer: 'Voiceover Studio Finder is a platform that connects voice artists with professional recording studios worldwide. If you have a studio or are voiceover talent and want to earn extra money, you can list your services here for improved SEO and more visibility!'
  },
  {
    question: 'Can anyone sign up?',
    answer: 'Yes. Anyone with a studio who hires it out for voiceover services can sign up. We also accept voiceover artists looking to create professional profiles.'
  },
  {
    question: 'Who is using it?',
    answer: 'Agencies looking to place an artist into a studio nearby, voice artists searching for professional recording spaces, and studio owners wanting to increase their bookings.'
  },
  {
    question: 'Why is there a membership fee?',
    answer: 'To expand and maintain our platform, we charge a small annual fee to keep VoiceoverStudioFinder live and continuously improving our services.'
  },
  {
    question: 'Can I add my social media links?',
    answer: 'Yes, of course. Add all of them to your profile to increase your online presence and make it easier for clients to connect with you.'
  },
  {
    question: 'What should I put on my profile page?',
    answer: 'A brief description for your heading and then some specifics in your long description. Include details of what you offer, useful services like directing, editing, equipment available, and your unique selling points.'
  },
  {
    question: 'Why is there a character limit to the short description?',
    answer: 'This is also your meta description, so it has great SEO benefits on search engines. Keeping it concise ensures better search engine optimization.'
  },
  {
    question: 'What is a Featured Studio?',
    answer: "It's an option to place your studio on the homepage below the map, giving you premium visibility to potential clients browsing the site."
  },
  {
    question: "I'm a voiceover, can I create a profile?",
    answer: 'Yes! We now accept voiceovers. A great way to create a unique professional profile and connect with studios and clients.'
  },
  {
    question: "What is 'Verified' status?",
    answer: "Verified is for awesome studio profiles! Want to get verified? Contact us and we'll review your profile for verification."
  },
  {
    question: 'How do I contact a studio or talent?',
    answer: 'Any messages go direct to the email address they provided, not via the site. You can use our contact forms or reach out directly through their listed contact methods.'
  },
  {
    question: 'Do you deal with bookings?',
    answer: 'No. It is completely up to you to book with the talent or studio. We provide the platform for connection, but all arrangements are made directly between parties.'
  },
  {
    question: 'Do I need to show my rates?',
    answer: 'Not at all. You decide what you would like to show on your profile. Many studios prefer to discuss rates directly with clients.'
  },
  {
    question: 'Do I have to show my address?',
    answer: 'No. You have total control. Show & hide what you want. We respect privacy, especially for home studios.'
  },
  {
    question: "Why can't I zoom right in on the map?",
    answer: "We restrict the zoom so not to reveal exact streets for home studios. If you want to display your full address it's up to you, but we protect privacy by default."
  }
];

async function seedFAQs() {
  console.log('\n🌱 Seeding FAQs...\n');

  try {
    // Check if FAQs already exist
    const existingCount = await db.faq.count();
    
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing FAQs in database.`);
      console.log('   Skipping seed to avoid duplicates.\n');
      console.log('   To re-seed, first delete existing FAQs:\n');
      console.log('   npx prisma studio (then delete from faq table)\n');
      return;
    }

    // Insert FAQs
    for (let i = 0; i < faqs.length; i++) {
      const faq = faqs[i];
      await db.faq.create({
        data: {
          id: randomBytes(12).toString('base64url'),
          question: faq.question,
          answer: faq.answer,
          sort_order: i + 1,
          updated_at: new Date()
        }
      });
      console.log(`✅ Created: ${faq.question.substring(0, 50)}...`);
    }

    console.log(`\n✅ Successfully seeded ${faqs.length} FAQs!\n`);
  } catch (error) {
    console.error('\n❌ Error seeding FAQs:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

seedFAQs();

