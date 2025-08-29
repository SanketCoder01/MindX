import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/auth/callback',
    '/auth/complete-registration',
    '/auth/pending-approval',
    '/auth/registration-rejected',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/',
  ];

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // If no session and trying to access protected route
  if (!session && !isPublicRoute) {
    const redirectUrl = new URL('/login', req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is authenticated, check their status and redirect accordingly
  if (session?.user && pathname === '/login') {
    // Check user status in database
    const { data: student } = await supabase
      .from('students')
      .select('status')
      .eq('email', session.user.email)
      .single();

    const { data: faculty } = await supabase
      .from('faculty')
      .select('status')
      .eq('email', session.user.email)
      .single();

    const { data: pendingReg } = await supabase
      .from('pending_registrations')
      .select('status')
      .eq('email', session.user.email)
      .single();

    // Determine redirect based on user status
    if (pendingReg) {
      if (pendingReg.status === 'pending') {
        return NextResponse.redirect(new URL('/auth/pending-approval', req.url));
      } else if (pendingReg.status === 'rejected') {
        return NextResponse.redirect(new URL('/auth/registration-rejected', req.url));
      }
    } else if (student || faculty) {
      const userStatus = student?.status || faculty?.status;
      if (userStatus === 'active') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      } else if (userStatus === 'pending') {
        return NextResponse.redirect(new URL('/auth/pending-approval', req.url));
      } else if (userStatus === 'rejected') {
        return NextResponse.redirect(new URL('/auth/registration-rejected', req.url));
      }
    } else {
      // New user - redirect to complete registration
      return NextResponse.redirect(new URL('/auth/complete-registration', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
