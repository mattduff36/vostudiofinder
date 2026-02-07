import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import TwitterProvider from 'next-auth/providers/twitter';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { Role } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  adapter: {
    ...PrismaAdapter(db),
    createUser: async (data: { email?: string; name?: string; image?: string; email_verified?: Date | null }) => {
      // Generate username from email if not provided
      const emailPrefix = data.email?.split('@')[0] || 'user';
      const username = emailPrefix.replace(/[^a-zA-Z0-9]/g, '') + '_' + Math.random().toString(36).substring(7);
      const { randomBytes } = require('crypto');
      
      return db.users.create({
        data: {
          id: randomBytes(12).toString('base64url'),
          email: data.email!,
          password: '', // OAuth users don't have passwords
          username: username,
          display_name: data.name || data.email?.split('@')[0] || 'User',
          avatar_url: data.image || null,
          email_verified: !!data.email_verified,
          role: 'USER',
          updated_at: new Date(),
        },
      });
    },
  } as any,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/dashboard', // Redirect new users directly to dashboard
  },
  providers: [
    // Email/Password Provider
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'your@email.com',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await db.users.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user.password) {
          throw new Error('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          display_name: user.display_name,
          role: user.role,
          avatar_url: user.avatar_url,
          email_verified: user.email_verified,
        };
      },
    }),

    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

    // Facebook OAuth Provider
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),

    // Twitter OAuth Provider
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0',
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.role = user.role;
        token.username = user.username;
        token.display_name = user.display_name;
        token.avatar_url = user.avatar_url;
        token.email_verified = !!user.email_verified;
      }

      // Handle OAuth account linking
      if (account && profile) {
        // Update user profile with OAuth data if available
        const existingUser = await db.users.findUnique({
          where: { email: token.email! },
        });

        if (existingUser) {
          await db.users.update({
            where: { id: existingUser.id },
            data: {
              avatar_url: profile.image || existingUser.avatar_url,
              display_name: profile.name || existingUser.display_name,
              email_verified: true, // OAuth accounts are pre-verified
            },
          });
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.email = token.email as string;
        session.user.role = token.role as Role;
        session.user.username = token.username as string;
        session.user.display_name = token.display_name as string;
        session.user.avatar_url = token.avatar_url as string | null;
        session.user.email_verified = token.email_verified as boolean;
      }
      return session;
    },
    async signIn({ user: _user, account, profile: _profile, email: _email, credentials: _credentials }) {
      // Allow OAuth sign-ins
      if (account?.provider !== 'credentials') {
        return true;
      }

      // For credentials provider, user is already validated in authorize()
      return true;
    },
    async redirect({ url, baseUrl }) {
      // For base URL redirects, check if it's the admin user
      if (url === baseUrl) {
        return `${baseUrl}/dashboard`;
      }
      
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  events: {
    async signIn({ user, account, profile: _profile, isNewUser: _isNewUser }) {
      console.log('User signed in:', { user: user.email, provider: account?.provider });
      
      // Update last_login timestamp and handle membership
      if (user.email) {
        try {
          const dbUser = await db.users.update({
            where: { email: user.email },
            data: { last_login: new Date() },
            include: {
              studio_profiles: true,
              subscriptions: {
                orderBy: { created_at: 'desc' },
                take: 1,
                select: {
                  id: true,
                  status: true,
                  stripe_subscription_id: true,
                  stripe_customer_id: true,
                  current_period_start: true,
                  current_period_end: true,
                  created_at: true,
                  updated_at: true,
                  payment_method: true,
                  user_id: true,
                }
              },
              // Check if user has ever made a successful payment (one-time payments
              // create subscriptions with null stripe_subscription_id AND null
              // stripe_customer_id, making them indistinguishable from legacy grants).
              payments: {
                where: { status: 'SUCCEEDED' },
                take: 1,
                select: { id: true },
              },
            }
          });

          // Handle legacy membership grant + enforce studio status (skip for admin accounts)
          const isAdminAccount = dbUser.role === 'ADMIN';
          
          if (dbUser.studio_profiles && !isAdminAccount) {
            const studio = dbUser.studio_profiles;
            let latestSubscription = dbUser.subscriptions[0];
            const now = new Date();
            const LEGACY_CUTOFF = new Date('2026-01-01T00:00:00.000Z');

            // Check if user qualifies for legacy membership
            const isLegacyUser = studio.created_at < LEGACY_CUTOFF;
            // A "paid" user has a real Stripe subscription, a stripe_customer_id
            // (from coupon/zero-amount payments), or a successful payment record
            // (one-time payments create subscriptions with null stripe IDs).
            const hasPaidSubscription =
              latestSubscription?.stripe_subscription_id != null ||
              latestSubscription?.stripe_customer_id != null ||
              dbUser.payments.length > 0;
            // Legacy grant should fire if:
            //  1. Legacy user with no subscription at all, OR
            //  2. Legacy user with a batch-migrated/legacy-granted subscription (no stripe ID)
            // It should NOT fire for users who paid via Stripe (recurring, one-time, or coupon)
            const needsLegacyGrant = isLegacyUser && !hasPaidSubscription;

            // Grant or re-grant legacy membership (6 months from NOW, no cap)
            // Uses a transaction with SELECT FOR UPDATE to prevent duplicate subscriptions
            // from concurrent login requests for the same user.
            let legacyGrantSucceeded = false;

            if (needsLegacyGrant) {
              const granted = await db.$transaction(async (tx) => {
                // Lock the user row to serialize concurrent legacy-grant attempts
                const [lockedUser] = await tx.$queryRaw<Array<{ membership_tier: string | null }>>`
                  SELECT membership_tier FROM users WHERE id = ${dbUser.id} FOR UPDATE
                `;

                // Re-fetch the latest subscription inside the lock.
                // A Stripe webhook (or another login) may have created a paid
                // subscription between our initial read and acquiring this lock.
                const freshSub = await tx.subscriptions.findFirst({
                  where: { user_id: dbUser.id },
                  orderBy: { created_at: 'desc' },
                });

                // If a paid subscription now exists, skip the legacy grant entirely.
                // Check both stripe_subscription_id (recurring) and stripe_customer_id
                // (one-time / coupon payments) since either indicates a real payment.
                if (freshSub?.stripe_subscription_id != null || freshSub?.stripe_customer_id != null) {
                  return null;
                }

                const sixMonthsFromNow = new Date(now);
                sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

                let newSub;
                if (freshSub && !freshSub.stripe_subscription_id && !freshSub.stripe_customer_id) {
                  // Update existing batch-migrated/legacy subscription to 6 months from now
                  newSub = await tx.subscriptions.update({
                    where: { id: freshSub.id },
                    data: {
                      status: 'ACTIVE',
                      current_period_start: now,
                      current_period_end: sixMonthsFromNow,
                      updated_at: now,
                    }
                  });
                } else {
                  // No subscription exists — create one
                  newSub = await tx.subscriptions.create({
                    data: {
                      id: require('crypto').randomBytes(12).toString('base64url'),
                      user_id: dbUser.id,
                      status: 'ACTIVE',
                      payment_method: 'STRIPE',
                      current_period_start: now,
                      current_period_end: sixMonthsFromNow,
                      created_at: now,
                      updated_at: now
                    }
                  });
                }

                // Set membership tier to PREMIUM if not already
                if (lockedUser?.membership_tier !== 'PREMIUM') {
                  await tx.users.update({
                    where: { id: dbUser.id },
                    data: { membership_tier: 'PREMIUM' }
                  });
                }

                return newSub;
              });

              if (granted) {
                latestSubscription = granted;
                legacyGrantSucceeded = true;
                console.log(`✅ Legacy membership granted to ${user.email}: tier set to PREMIUM, expires ${granted.current_period_end?.toISOString()}`);
              } else {
                // Grant was attempted but aborted — a paid Stripe subscription
                // appeared between our initial read and the lock acquisition.
                // Re-fetch BOTH the current subscription AND the user's membership_tier
                // so enforcement uses fresh data instead of the stale pre-transaction
                // references. The Stripe webhook that created the paid subscription
                // also sets membership_tier to PREMIUM on the user record.
                const [currentSub, freshUser] = await Promise.all([
                  db.subscriptions.findFirst({
                    where: { user_id: dbUser.id },
                    orderBy: { created_at: 'desc' },
                  }),
                  db.users.findUnique({
                    where: { id: dbUser.id },
                    select: { membership_tier: true },
                  }),
                ]);
                if (currentSub) {
                  latestSubscription = currentSub;
                }
                if (freshUser) {
                  dbUser.membership_tier = freshUser.membership_tier;
                }
              }
            }

            // Enforce studio status based on membership tier + expiry (lazy enforcement)
            // Only treat as PREMIUM if the legacy grant actually succeeded.
            // If it was aborted (paid sub found concurrently) or never attempted,
            // fall back to the tier already on the user record.
            const effectiveTier = legacyGrantSucceeded ? 'PREMIUM' : (dbUser.membership_tier || 'BASIC');
            const currentExpiry = latestSubscription?.current_period_end;
            
            // Basic tier: always ACTIVE. Premium tier: check subscription expiry.
            let desiredStatus: 'ACTIVE' | 'INACTIVE';
            if (effectiveTier === 'BASIC') {
              desiredStatus = 'ACTIVE';
            } else if (currentExpiry) {
              desiredStatus = currentExpiry < now ? 'INACTIVE' : 'ACTIVE';
            } else {
              // Premium with no subscription = INACTIVE
              desiredStatus = 'INACTIVE';
            }
            
            // Only update if status needs to change
            if (studio.status !== desiredStatus) {
              await db.studio_profiles.update({
                where: { id: studio.id },
                data: { 
                  status: desiredStatus,
                  updated_at: now
                }
              });
              console.log(`🔄 Studio status updated to ${desiredStatus} for ${user.email}`);
            }
            
            // Enforce featured expiry (lazy enforcement)
            if (studio.is_featured && studio.featured_until) {
              const isFeaturedExpired = studio.featured_until < now;
              if (isFeaturedExpired) {
                await db.studio_profiles.update({
                  where: { id: studio.id },
                  data: { 
                    is_featured: false,
                    updated_at: now
                  }
                });
                console.log(`🔄 Studio unfeatured (expired) for ${user.email}`);
              }
            }
          } else if (dbUser.studio_profiles && isAdminAccount) {
            // Ensure admin studio is always ACTIVE
            const studio = dbUser.studio_profiles;
            if (studio.status !== 'ACTIVE') {
              await db.studio_profiles.update({
                where: { id: studio.id },
                data: { 
                  status: 'ACTIVE',
                  updated_at: new Date()
                }
              });
              console.log(`🔄 Admin studio set to ACTIVE for ${user.email}`);
            }
          }
        } catch (error) {
          console.error('Failed to update last_login or handle membership:', error);
        }
      }
    },
    async signOut({ token }) {
      console.log('User signed out:', token?.email);
    },
    async createUser({ user }) {
      console.log('New user created:', user.email);
      
      // Send welcome email (implement this later)
      // await sendWelcomeEmail(user.email);
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

