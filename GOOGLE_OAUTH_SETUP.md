# Google OAuth Setup for EduVision

## Issue: "User details not found. Please try signing in again."

This error occurs when Google OAuth isn't properly configured in Supabase. Follow these steps to fix it:

## 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "EduVision"
   - Authorized redirect URIs:
     ```
     https://jtguryzyprgqraimyimt.supabase.co/auth/v1/callback
     http://localhost:3000/auth/callback
     ```

## 2. Supabase Dashboard Configuration

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" > "Providers"
3. Find "Google" and click to configure
4. Enable Google provider
5. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
6. Set redirect URL to: `https://jtguryzyprgqraimyimt.supabase.co/auth/v1/callback`

## 3. Environment Variables

Add to your `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_URL=https://jtguryzyprgqraimyimt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 4. Test the Setup

1. Restart your development server: `npm run dev`
2. Try Google sign-in from the login page
3. Check browser console and server logs for any errors

## Common Issues:

- **"User details not found"**: Google provider not enabled in Supabase
- **"Authentication failed"**: Wrong client ID/secret or redirect URL mismatch
- **Domain restriction errors**: Email domain validation working correctly

## Debugging:

Check the browser network tab and server console for detailed error messages during OAuth flow.
