# Google OAuth Debug Steps

## Current Issue: "User details not found. Please try signing in again."

## Step 1: Test OAuth Configuration
1. Go to: `http://localhost:3000/debug-oauth`
2. Click "Test Google OAuth" button
3. Check the debug logs for errors

## Step 2: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try Google sign-in from login page
4. Look for JavaScript errors

## Step 3: Check Server Console
1. Look at your terminal where `npm run dev` is running
2. Try Google sign-in
3. Check for detailed OAuth callback logs

## Step 4: Verify Supabase Dashboard Settings

### Authentication > Providers > Google:
- ✅ **Enabled**: Must be ON
- ✅ **Client ID**: From Google Cloud Console
- ✅ **Client Secret**: From Google Cloud Console
- ✅ **Redirect URL**: `https://jtguryzyprgqraimyimt.supabase.co/auth/v1/callback`

### Common Issues:
1. **Google provider not enabled** in Supabase
2. **Wrong Client ID/Secret** from Google Cloud Console
3. **Missing redirect URL** in Google Cloud Console
4. **Wrong redirect URL** in Supabase settings

## Step 5: Google Cloud Console Verification

### OAuth 2.0 Client IDs:
- **Authorized redirect URIs** must include:
  ```
  https://jtguryzyprgqraimyimt.supabase.co/auth/v1/callback
  ```

### APIs & Services > Library:
- ✅ **Google+ API**: Must be ENABLED
- ✅ **People API**: Should be ENABLED

## Step 6: Test Results Analysis

### If debug page shows "OAuth initiated successfully":
- Issue is in the callback handling
- Check server console logs during callback

### If debug page shows OAuth errors:
- Issue is in Supabase provider configuration
- Verify Google provider settings in Supabase dashboard

### If browser console shows network errors:
- Check if Supabase URL/keys are correct in .env.local
- Verify network connectivity to Supabase

## Next Steps Based on Results:
1. Run debug test first
2. Share the debug logs and console errors
3. I'll provide specific fix based on the exact error
