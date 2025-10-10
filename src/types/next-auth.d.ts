import { Role } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      username: string;
      display_name: string;
      role: Role;
      avatar_url: string | null;
      email_verified: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    username: string;
    display_name: string;
    role: Role;
    avatar_url: string | null;
    email_verified: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role;
    username: string;
    display_name: string;
    avatar_url: string | null;
    email_verified: boolean;
  }
}
