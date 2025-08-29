import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, name, userType, faceImageData } = await request.json();

    if (!email || !name || !userType || !faceImageData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Convert base64 to file and upload to Supabase storage
    const base64Data = faceImageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const fileName = `${email.replace('@', '_')}_${Date.now()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('face-images')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Face image upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload face image' },
        { status: 500 }
      );
    }

    // Get the pending registration data to create auth user
    const { data: pendingReg, error: fetchError } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq('email', email)
      .eq('user_type', userType)
      .single();

    if (fetchError || !pendingReg) {
      console.error('Failed to fetch pending registration:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Registration data not found' },
        { status: 404 }
      );
    }

    // Create user in Supabase Auth with a temporary password
    const tempPassword = `EduVision${Math.random().toString(36).slice(-8)}!`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name,
        user_type: userType
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      // Continue with registration even if auth creation fails
    }

    // Update the pending registration with face image URL and set status to pending
    const { error: updateError } = await supabase
      .from('pending_registrations')
      .update({
        face_image_url: uploadData.path,
        status: 'pending',
        auth_user_id: authData?.user?.id,
        temp_password: tempPassword,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .eq('user_type', userType);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update registration status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Face capture completed successfully. Registration is now pending approval.',
      redirectUrl: '/auth/check-email',
      tempPassword: authData?.user ? tempPassword : null
    });

  } catch (error) {
    console.error('Face capture completion error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
