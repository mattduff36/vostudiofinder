import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
    const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');
    const isPublicApiRoute = req.nextUrl.pathname.startsWith('/api/public') || 
                             req.nextUrl.pathname === '/api/studios/search' ||
                             req.nextUrl.pathname.startsWith('/api/studios/search') ||
                             req.nextUrl.pathname.startsWith('/api/search/suggestions') ||
                             req.nextUrl.pathname.startsWith('/api/search/users');
    
    
    // Define public paths that don't require authentication
    const publicPaths = ['/', '/about', '/contact', '/studios', '/search', '/help', '/studios-new-design-1-temp', '/studios-new-design-2-temp', '/studios-new-design-3-temp'];
    const staticRoutes = ['/about', '/admin', '/api', '/auth', '/contact', '/cookies', '/dashboard', '/help', '/privacy', '/profile', '/studio', '/studios', '/terms', '/test-upload', '/unauthorized'];
    
    // Check if path matches static routes or public paths
    const isStaticRoute = staticRoutes.some(route => req.nextUrl.pathname.startsWith(route));
    const isPublicPath = publicPaths.some(path => 
      req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith('/studio/')
    );
    
    // Allow username-based routes (any path that doesn't match static routes)
    const isUsernameRoute = !isStaticRoute && req.nextUrl.pathname !== '/' && !req.nextUrl.pathname.startsWith('/_next');
    
    // Allow API auth routes and public API routes
    if (isApiAuthRoute || isPublicApiRoute) {
      return NextResponse.next();
    }

    // Allow auth pages without authentication
    if (isAuthPage) {
      return NextResponse.next();
    }

    // Allow public paths and username routes without authentication
    if (isPublicPath || isUsernameRoute) {
      return NextResponse.next();
    }

    // Redirect unauthenticated users to sign in for protected routes
    if (!isAuth && !isPublicPath) {
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
        // Allow access to public API routes
        const isPublicApiRoute = req.nextUrl.pathname.startsWith('/api/public') || 
                                 req.nextUrl.pathname === '/api/studios/search' ||
                                 req.nextUrl.pathname.startsWith('/api/studios/search') ||
                                 req.nextUrl.pathname.startsWith('/api/search/suggestions') ||
                                 req.nextUrl.pathname.startsWith('/api/search/users');
        
        if (isPublicApiRoute) {
          return true;
        }
        
        // Allow access to public routes and auth pages
        const publicPaths = ['/', '/about', '/contact', '/studios', '/search', '/help', '/studios-new-design-1-temp', '/studios-new-design-2-temp', '/studios-new-design-3-temp'];
        const staticRoutes = ['/about', '/admin', '/api', '/auth', '/contact', '/cookies', '/dashboard', '/help', '/privacy', '/profile', '/studio', '/studios', '/terms', '/test-upload', '/unauthorized'];
        
        const isStaticRoute = staticRoutes.some(route => req.nextUrl.pathname.startsWith(route));
        const isPublicPath = publicPaths.some(path => 
          req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith('/studio/')
        );
        const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
        const isUsernameRoute = !isStaticRoute && req.nextUrl.pathname !== '/' && !req.nextUrl.pathname.startsWith('/_next');
        
        if (isPublicPath || isAuthPage || isUsernameRoute) {
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
