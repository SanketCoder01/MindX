import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, userType, action, newPassword } = await request.json();

    if (!userId || !userType || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    if (action === 'approve') {
      // Get pending registration data
      const { data: pendingReg, error: fetchError } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError || !pendingReg) {
        return NextResponse.json(
          { success: false, error: 'Pending registration not found' },
          { status: 404 }
        );
      }

      // Create user in the appropriate table (students or faculty)
      const userData: any = {
        email: pendingReg.email,
        name: pendingReg.name,
        department: pendingReg.department,
        mobile: pendingReg.mobile,
        face_image_url: pendingReg.face_image_url,
        approval_status: 'approved',
        created_at: new Date().toISOString()
      };

      if (userType === 'student') {
        userData.year = pendingReg.course; // Assuming course maps to year for students
      } else {
        userData.field = pendingReg.field;
        userData.course = pendingReg.course;
      }

      const { error: insertError } = await supabase
        .from(userType === 'student' ? 'students' : 'faculty')
        .insert(userData);

      if (insertError) {
        console.error('User creation error:', insertError);
        return NextResponse.json(
          { success: false, error: 'Failed to create user account' },
          { status: 500 }
        );
      }

      // Update auth user password if provided
      if (pendingReg.auth_user_id && newPassword) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          pendingReg.auth_user_id,
          { password: newPassword }
        );

        if (passwordError) {
          console.error('Password update error:', passwordError);
        }
      }

      // Delete from pending registrations
      await supabase
        .from('pending_registrations')
        .delete()
        .eq('id', userId);

      return NextResponse.json({
        success: true,
        message: 'User approved successfully'
      });

    } else if (action === 'reject') {
      // Update status to rejected
      const { error: updateError } = await supabase
        .from('pending_registrations')
        .update({ status: 'rejected' })
        .eq('id', userId);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: 'Failed to reject user' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'User rejected successfully'
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Admin approval error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
