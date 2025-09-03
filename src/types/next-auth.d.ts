import { Role } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      username: string;
      displayName: string;
      role: Role;
      avatarUrl: string | null;
      emailVerified: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    username: string;
    displayName: string;
    role: Role;
    avatarUrl: string | null;
    emailVerified: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    emailVerified: boolean;
  }
}
