import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Helper function to set session cookies
function setSessionCookies(response: NextResponse, session: any) {
  if (session?.access_token) {
    response.cookies.set('sb-access-token', session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: session.expires_in || 3600
    });
  }
  
  if (session?.refresh_token) {
    response.cookies.set('sb-refresh-token', session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const userType = requestUrl.searchParams.get('type') || 'student';

  console.log('OAuth Callback Debug:', {
    hasCode: !!code,
    userType,
    url: requestUrl.toString(),
    searchParams: Object.fromEntries(requestUrl.searchParams.entries())
  });

  if (code) {
    try {
      // Create a fresh Supabase client for the OAuth exchange
      const supabase = createClient();
      
      console.log('Attempting to exchange code for session...');
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        console.error('Auth Callback Error:', sessionError.message, sessionError);
        return NextResponse.redirect(`${requestUrl.origin}/login?type=${userType}&error=Authentication failed: ${sessionError.message}`);
      }

      console.log('Session exchange result:', {
        hasSession: !!data.session,
        hasUser: !!data.user,
        hasEmail: !!data.user?.email,
        userEmail: data.user?.email,
        sessionData: data.session ? 'present' : 'missing',
        userData: data.user ? {
          id: data.user.id,
          email: data.user.email,
          provider: data.user.app_metadata?.provider
        } : 'missing'
      });

      if (!data.session || !data.user || !data.user.email) {
        console.log('Missing required data - redirecting to login');
        return NextResponse.redirect(`${requestUrl.origin}/login?type=${userType}&error=User details not found. Please try signing in again.`);
      }

      // Check if user email is from allowed college domains
      const email = data.user.email;
      const allowedDomains = ['sanjivani.org.in', 'set.edu.in', 'sanjivani.edu.in', 'ac.in'];
      const emailDomain = email?.split('@')[1];
      
      if (!emailDomain || !allowedDomains.includes(emailDomain)) {
        // Sign out the user and redirect with error
        await supabase.auth.signOut();
        return NextResponse.redirect(`${requestUrl.origin}/login?type=${userType}&error=Please use your college email address (@sanjivani.edu.in, @sanjivani.org.in, @set.edu.in, or @ac.in)`);
      }

      // Check if user already exists in database
      const { data: existingUser } = await supabase
        .from(userType === 'student' ? 'students' : 'faculty')
        .select('id, approval_status')
        .eq('email', email)
        .single();

      let redirectUrl;
      
      if (existingUser) {
        // User exists, check approval status
        if (existingUser.approval_status === 'approved') {
          // Redirect to dashboard
          redirectUrl = userType === 'student' ? '/student-dashboard' : '/dashboard';
        } else if (existingUser.approval_status === 'pending') {
          // Redirect to check email page
          redirectUrl = '/auth/check-email';
        } else {
          // Rejected or other status, redirect to registration
          redirectUrl = userType === 'student' ? '/student-registration' : '/faculty-registration';
        }
      } else {
        // New user, redirect to registration
        redirectUrl = userType === 'student' ? '/student-registration' : '/faculty-registration';
      }

      const response = NextResponse.redirect(`${requestUrl.origin}${redirectUrl}`);
      setSessionCookies(response, data.session);
      return response;

    } catch (error) {
      console.error('OAuth callback error:', error);
      return NextResponse.redirect(`${requestUrl.origin}/login?type=${userType}&error=Authentication error`);
    }
  }

  // Fallback for invalid requests
  return NextResponse.redirect(`${requestUrl.origin}/login?type=${userType}&error=Invalid callback`);
}
