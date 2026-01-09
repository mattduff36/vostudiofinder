import { PrismaClient, SupportTicketType, SupportTicketStatus, SupportPriority, PaymentStatus, UserStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

// Email pattern to identify dummy data
const DUMMY_EMAIL_PATTERN = 'dummy.test';

// Payment amount: £25 = 2500 pence
const MEMBERSHIP_AMOUNT = 2500;
const CURRENCY = 'gbp';

// First names for realistic dummy data
const FIRST_NAMES = [
  'Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery',
  'Quinn', 'Sage', 'River', 'Phoenix', 'Blake', 'Cameron', 'Dakota', 'Emery',
  'Finley', 'Harper', 'Hayden', 'Indigo', 'Jasper', 'Kai', 'Logan', 'Marley',
  'Noah', 'Oakley', 'Parker', 'Reese', 'Rowan', 'Skyler', 'Tatum', 'Willow',
  'Zephyr', 'Aria', 'Briar', 'Cedar'
];

// Last names for realistic dummy data
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
  'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen',
  'King', 'Wright', 'Scott', 'Torres', 'Nguyen'
];

// Support ticket categories
const SUPPORT_CATEGORIES = [
  'Payment Issue',
  'Account Access',
  'Profile Setup',
  'Technical Support',
  'Feature Request',
  'Billing Question',
  'General Inquiry'
];

// Support ticket messages
const SUPPORT_MESSAGES: Record<SupportTicketType, string[]> = {
  [SupportTicketType.ISSUE]: [
    'I cannot access my account after payment. Please help.',
    'My payment was processed but I still see PENDING status.',
    'I cannot upload my studio profile image.',
    'The search function is not working correctly.',
    'I received a payment confirmation but no email.',
    'My username reservation expired unexpectedly.',
    'I cannot reset my password.',
  ],
  [SupportTicketType.SUGGESTION]: [
    'It would be great to have more filter options in the search.',
    'Could you add a dark mode option?',
    'I suggest adding more payment methods like PayPal.',
    'Would be nice to have email notifications for new reviews.',
    'Consider adding a mobile app version.',
    'Could you add more studio type categories?',
    'I suggest improving the profile editing interface.',
  ],
};

function generateId(): string {
  return randomBytes(16).toString('hex');
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateUsername(firstName: string, lastName: string, index: number): string {
  const base = `${firstName.toLowerCase()}${lastName.toLowerCase()}${index}`;
  return base.substring(0, 20); // Username max length
}

async function addDummyData() {
  console.log('🎭 Starting dummy data generation...\n');

  try {
    // Calculate date range: 7 days ago to today
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const usersCreated: string[] = [];
    let userIndex = 1;

    // Generate ~5 users per day for 7 days = ~35 users
    for (let day = 0; day < 7; day++) {
      const currentDay = new Date(sevenDaysAgo);
      currentDay.setDate(currentDay.getDate() + day);
      
      // Set random time during the day (9 AM to 6 PM)
      const hour = randomInt(9, 18);
      const minute = randomInt(0, 59);
      currentDay.setHours(hour, minute, 0, 0);

      const usersPerDay = randomInt(4, 6); // 4-6 users per day

      console.log(`📅 Day ${day + 1} (${currentDay.toLocaleDateString()}): Creating ${usersPerDay} users...`);

      for (let i = 0; i < usersPerDay; i++) {
        const firstName = randomElement(FIRST_NAMES);
        const lastName = randomElement(LAST_NAMES);
        const email = `${DUMMY_EMAIL_PATTERN}.${userIndex}@example.com`;
        const username = generateUsername(firstName, lastName, userIndex);
        const displayName = `${firstName} ${lastName}`;

        // Create user with random status distribution
        // 60% PENDING, 30% ACTIVE, 10% EXPIRED
        const statusRoll = Math.random();
        let userStatus: UserStatus;
        let reservationExpiresAt: Date | null = null;
        let paymentAttemptedAt: Date | null = null;
        let paymentRetryCount = 0;

        if (statusRoll < 0.6) {
          userStatus = UserStatus.PENDING;
          reservationExpiresAt = new Date(currentDay);
          reservationExpiresAt.setDate(reservationExpiresAt.getDate() + 7);
          // Some PENDING users attempted payment
          if (Math.random() < 0.4) {
            paymentAttemptedAt = randomDate(currentDay, new Date());
            paymentRetryCount = randomInt(0, 2);
          }
        } else if (statusRoll < 0.9) {
          userStatus = UserStatus.ACTIVE;
        } else {
          userStatus = UserStatus.EXPIRED;
          reservationExpiresAt = new Date(currentDay);
          reservationExpiresAt.setDate(reservationExpiresAt.getDate() - 1); // Expired yesterday
        }

        // Create user
        const user = await prisma.users.create({
          data: {
            id: generateId(),
            email: email.toLowerCase(),
            username,
            display_name: displayName,
            password: '$2a$10$dummy.hash.for.testing.purposes.only', // Dummy hash
            status: userStatus,
            reservation_expires_at: reservationExpiresAt,
            payment_attempted_at: paymentAttemptedAt,
            payment_retry_count: paymentRetryCount,
            created_at: currentDay,
            updated_at: currentDay,
          },
        });

        usersCreated.push(user.id);
        console.log(`  ✅ Created user: ${email} (${userStatus})`);

        // Create payment for ACTIVE users and some PENDING users
        if (userStatus === UserStatus.ACTIVE || (userStatus === UserStatus.PENDING && Math.random() < 0.7)) {
          const paymentStatusRoll = Math.random();
          let paymentStatus: PaymentStatus;
          let refundedAmount = 0;

          if (userStatus === UserStatus.ACTIVE) {
            // ACTIVE users have succeeded payments
            if (paymentStatusRoll < 0.85) {
              paymentStatus = PaymentStatus.SUCCEEDED;
            } else if (paymentStatusRoll < 0.95) {
              paymentStatus = PaymentStatus.REFUNDED;
              refundedAmount = MEMBERSHIP_AMOUNT;
            } else {
              paymentStatus = PaymentStatus.PARTIALLY_REFUNDED;
              refundedAmount = Math.floor(MEMBERSHIP_AMOUNT * 0.5);
            }
          } else {
            // PENDING users have mixed payment statuses
            if (paymentStatusRoll < 0.3) {
              paymentStatus = PaymentStatus.PENDING;
            } else if (paymentStatusRoll < 0.5) {
              paymentStatus = PaymentStatus.FAILED;
            } else {
              paymentStatus = PaymentStatus.SUCCEEDED;
            }
          }

          const paymentCreatedAt = userStatus === UserStatus.ACTIVE 
            ? randomDate(currentDay, new Date(currentDay.getTime() + 2 * 60 * 60 * 1000)) // Within 2 hours
            : currentDay;

          const payment = await prisma.payments.create({
            data: {
              id: generateId(),
              user_id: user.id,
              amount: MEMBERSHIP_AMOUNT,
              currency: CURRENCY,
              status: paymentStatus,
              refunded_amount: refundedAmount,
              stripe_checkout_session_id: `cs_test_${randomBytes(12).toString('hex')}`,
              stripe_payment_intent_id: `pi_test_${randomBytes(12).toString('hex')}`,
              stripe_charge_id: paymentStatus === PaymentStatus.SUCCEEDED ? `ch_test_${randomBytes(12).toString('hex')}` : null,
              created_at: paymentCreatedAt,
              updated_at: paymentCreatedAt,
            },
          });

          console.log(`    💳 Created payment: ${paymentStatus} (${(payment.amount / 100).toFixed(2)} ${payment.currency.toUpperCase()})`);

          // Create refunds for REFUNDED and PARTIALLY_REFUNDED payments
          if (refundedAmount > 0) {
            const refund = await prisma.refunds.create({
              data: {
                id: generateId(),
                stripe_refund_id: `re_test_${randomBytes(12).toString('hex')}`,
                stripe_payment_intent_id: payment.stripe_payment_intent_id!,
                amount: refundedAmount,
                currency: CURRENCY,
                reason: randomElement(['requested_by_customer', 'duplicate', 'fraudulent']),
                status: 'SUCCEEDED',
                processed_by: user.id, // Using user as processed_by for dummy data
                user_id: user.id,
                payment_id: payment.id,
                created_at: randomDate(paymentCreatedAt, new Date()),
                updated_at: new Date(),
              },
            });
            console.log(`    ↩️  Created refund: ${(refund.amount / 100).toFixed(2)} ${refund.currency.toUpperCase()}`);
          }
        }

        // Create waitlist entries (some users might be on waitlist before signing up)
        if (Math.random() < 0.2) {
          const waitlistCreatedAt = new Date(currentDay);
          waitlistCreatedAt.setHours(waitlistCreatedAt.getHours() - randomInt(1, 24));

          await prisma.waitlist.create({
            data: {
              id: generateId(),
              name: displayName,
              email: email.toLowerCase(),
              created_at: waitlistCreatedAt,
            },
          });
          console.log(`    📋 Created waitlist entry`);
        }

        // Create support tickets (some users submit tickets)
        if (Math.random() < 0.3) {
          const ticketType = randomElement([SupportTicketType.ISSUE, SupportTicketType.SUGGESTION]);
          const ticketStatus = randomElement([
            SupportTicketStatus.OPEN,
            SupportTicketStatus.IN_PROGRESS,
            SupportTicketStatus.RESOLVED,
            SupportTicketStatus.CLOSED,
          ]);
          const ticketPriority = randomElement([
            SupportPriority.LOW,
            SupportPriority.MEDIUM,
            SupportPriority.HIGH,
            SupportPriority.URGENT,
          ]);
          const category = randomElement(SUPPORT_CATEGORIES);
          const message = randomElement(SUPPORT_MESSAGES[ticketType]);

          const ticketCreatedAt = randomDate(currentDay, new Date());

          await prisma.support_tickets.create({
            data: {
              id: generateId(),
              user_id: user.id,
              type: ticketType,
              category,
              subject: ticketType === SupportTicketType.ISSUE ? `Issue: ${category}` : `Suggestion: ${category}`,
              message,
              status: ticketStatus,
              priority: ticketPriority,
              resolved_at: ticketStatus === SupportTicketStatus.RESOLVED || ticketStatus === SupportTicketStatus.CLOSED 
                ? randomDate(ticketCreatedAt, new Date())
                : null,
              created_at: ticketCreatedAt,
              updated_at: ticketCreatedAt,
            },
          });
          console.log(`    🎫 Created support ticket: ${ticketType} (${ticketStatus})`);
        }

        userIndex++;
      }
    }

    // Create some standalone waitlist entries (people who haven't signed up yet)
    console.log(`\n📋 Creating standalone waitlist entries...`);
    for (let i = 0; i < 10; i++) {
      const firstName = randomElement(FIRST_NAMES);
      const lastName = randomElement(LAST_NAMES);
      const email = `${DUMMY_EMAIL_PATTERN}.waitlist.${i + 1}@example.com`;
      const waitlistDate = randomDate(sevenDaysAgo, today);

      await prisma.waitlist.create({
        data: {
          id: generateId(),
          name: `${firstName} ${lastName}`,
          email: email.toLowerCase(),
          created_at: waitlistDate,
        },
      });
      console.log(`  ✅ Created waitlist entry: ${email}`);
    }

    console.log(`\n✨ Dummy data generation complete!`);
    console.log(`📊 Summary:`);
    console.log(`   - Users created: ${usersCreated.length}`);
    console.log(`   - Waitlist entries: ${10} standalone + some user entries`);
    console.log(`   - Payments: Created for active users and some pending users`);
    console.log(`   - Support tickets: Created for some users`);
    console.log(`\n💡 All dummy data uses email pattern: ${DUMMY_EMAIL_PATTERN}.*@example.com`);
    console.log(`💡 Use 'npm run delete-dummy-data' to remove all dummy data`);

  } catch (error) {
    console.error('❌ Error creating dummy data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addDummyData()
  .then(() => {
    console.log('\n✅ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

