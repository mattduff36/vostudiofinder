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
                take: 1
              }
            }
          });

          // Handle legacy membership grant + enforce studio status (skip for admin accounts)
          const isAdminAccount = dbUser.role === 'ADMIN';
          
          if (dbUser.studio_profiles && !isAdminAccount) {
            const studio = dbUser.studio_profiles;
            const latestSubscription = dbUser.subscriptions[0];
            const now = new Date();
            const LEGACY_CUTOFF = new Date('2026-01-05T00:00:00.000Z');
            const LEGACY_CAP = new Date('2026-08-31T23:59:59.999Z');

            // Check if user qualifies for legacy membership
            const isLegacyUser = studio.created_at < LEGACY_CUTOFF;
            const hasNoExpiry = !latestSubscription || !latestSubscription.current_period_end;

            // Grant legacy membership if eligible
            if (isLegacyUser && hasNoExpiry) {
              const sixMonthsFromNow = new Date(now);
              sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
              
              // Cap at Aug 31, 2026
              const expiryDate = sixMonthsFromNow > LEGACY_CAP ? LEGACY_CAP : sixMonthsFromNow;

              await db.subscriptions.create({
                data: {
                  id: require('crypto').randomBytes(12).toString('base64url'),
                  user_id: dbUser.id,
                  status: 'ACTIVE',
                  payment_method: 'STRIPE',
                  current_period_start: now,
                  current_period_end: expiryDate,
                  created_at: now,
                  updated_at: now
                }
              });

              console.log(`✅ Legacy membership granted to ${user.email}: expires ${expiryDate.toISOString()}`);
            }

            // Enforce studio status based on membership expiry (lazy enforcement)
            const currentExpiry = latestSubscription?.current_period_end;
            if (currentExpiry) {
              const isExpired = currentExpiry < now;
              const desiredStatus = isExpired ? 'INACTIVE' : 'ACTIVE';
              
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

