import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, userType } = await request.json();

    if (!email || !password || !name || !userType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for college domains
      user_metadata: {
        name,
        user_type: userType
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return NextResponse.json(
        { success: false, error: 'Failed to create authentication account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Authentication account created successfully',
      userId: authData.user?.id
    });

  } catch (error) {
    console.error('Create auth user error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
