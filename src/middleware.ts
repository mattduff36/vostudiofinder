import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
    const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');
    const isPublicApiRoute = req.nextUrl.pathname.startsWith('/api/public');
    
    // Define public paths that don't require authentication
    const publicPaths = ['/', '/about', '/contact', '/studios', '/search'];
    const isPublicPath = publicPaths.some(path => 
      req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith('/studios/')
    );
    
    // Allow API auth routes and public API routes
    if (isApiAuthRoute || isPublicApiRoute) {
      return NextResponse.next();
    }

    // Allow public paths without authentication
    if (isPublicPath) {
      return NextResponse.next();
    }

    // Redirect authenticated users away from auth pages
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Redirect unauthenticated users to sign in for protected routes
    if (!isAuthPage && !isAuth && !isPublicPath) {
      let from = req.nextUrl.pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }

      return NextResponse.redirect(
        new URL(`/auth/signin?callbackUrl=${encodeURIComponent(from)}`, req.url)
      );
    }

    // Role-based access control
    if (isAuth && token) {
      const userRole = token.role;
      const pathname = req.nextUrl.pathname;

      // Admin routes
      if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }

      // Studio owner routes
      if (pathname.startsWith('/studio/manage') && 
          userRole !== 'STUDIO_OWNER' && userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }

      // API route protection
      if (pathname.startsWith('/api/admin') && userRole !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      if (pathname.startsWith('/api/studio/manage') && 
          userRole !== 'STUDIO_OWNER' && userRole !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public routes
        const publicPaths = ['/', '/about', '/contact', '/studios', '/search'];
        const isPublicPath = publicPaths.some(path => 
          req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith('/studios/')
        );
        
        if (isPublicPath) {
          return true;
        }

        // Require authentication for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - api/public (public API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api/auth|api/public|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
