# Complete Authentication & Onboarding Flow for EduVision

This document outlines the complete authentication and onboarding system implemented for EduVision, supporting Google OAuth, email/password login, face verification, admin approval, and role-based dashboards.

## 🔄 Complete Flow Overview

### 1. **Login Page** (`/login`)
- **Two Options Available:**
  - **Google OAuth** - For new users (primary registration method)
  - **Email/Password** - For returning users who already registered

### 2. **Google OAuth Flow (New Users)**
- Uses Supabase Google OAuth
- After successful login, checks if user exists in `profiles` table
- **If user exists** → Skip registration, redirect to dashboard based on role
- **If user doesn't exist** → Continue to registration form

### 3. **Registration Form** (`/auth/complete-registration`)
- **Form Fields:**
  - `full_name` (auto-filled from Google)
  - `email` (auto-filled from Google, disabled)
  - `department` (dropdown selection)
  - `class/year` (for students only)
  - `phone` (optional)
  - `password` (for future email/password login)
  - `confirm_password`

- **Data Saved to `pending_registrations` table:**
  - `status = 'pending'`
  - `face_verified = false`
  - `role = 'student' OR 'faculty'`
  - `auth_provider = 'google'`

### 4. **Face Verification** (Python + Camera)
- After registration form, opens face capture using Python (OpenCV/DeepFace)
- Captures face image → stores in Supabase Storage
- Updates `pending_registrations.face_verified = true`
- Keeps `status = 'pending'`

### 5. **Pending Approval** (`/auth/pending-approval`)
- User cannot access dashboards until approved
- Shows: "Your registration is pending admin approval"
- Real-time updates when status changes

### 6. **Admin Approval Workflow** (`/admin/pending-approvals`)
- Admin dashboard shows all pending users with:
  - Face images + details
  - Approve/Reject buttons
- **On Approval** → `status = 'active'`, move to main tables
- **On Rejection** → `status = 'rejected'`, set rejection reason

### 7. **Email/Password Login (Returning Users)**
- Once registered via Google, users can login via email/password
- Uses Supabase Auth credentials created during registration
- **Login Logic:**
  - If `status = pending` → Show pending approval screen
  - If `status = active` AND `role = student` → Student Dashboard
  - If `status = active` AND `role = faculty` → Faculty Dashboard
  - If `status = rejected` → Show rejection message

## 🗄️ Database Schema

### Core Tables

#### `pending_registrations`
```sql
CREATE TABLE pending_registrations (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    department TEXT NOT NULL,
    year TEXT, -- For students only
    user_type user_role NOT NULL,
    face_url TEXT,
    status user_status DEFAULT 'pending',
    rejection_reason TEXT,
    auth_provider auth_provider DEFAULT 'google',
    submitted_at TIMESTAMP DEFAULT NOW()
);
```

#### `students` (Approved Students)
```sql
CREATE TABLE students (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    department_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    phone TEXT,
    face_url TEXT,
    status user_status DEFAULT 'active',
    face_verified BOOLEAN DEFAULT TRUE,
    auth_provider auth_provider DEFAULT 'google'
);
```

#### `faculty` (Approved Faculty)
```sql
CREATE TABLE faculty (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    department_id TEXT NOT NULL,
    phone TEXT,
    face_url TEXT,
    status user_status DEFAULT 'active',
    face_verified BOOLEAN DEFAULT TRUE,
    auth_provider auth_provider DEFAULT 'google'
);
```

## 🔧 Key Components

### **AuthFlowManager** (`lib/auth/auth-flow-manager.ts`)
Central authentication manager handling:
- Google OAuth login
- Email/password login
- User status checking
- Role-based redirects
- Session management

```typescript
// Example usage
const redirectPath = await authFlowManager.handlePostLogin(user);
router.push(redirectPath);
```

### **AuthGuard** (`components/auth/AuthGuard.tsx`)
Route protection component:
- Checks authentication status
- Validates user roles
- Handles redirects based on user state
- Protects admin routes

```typescript
// Usage
<AuthGuard requireAuth={true} allowedRoles={['admin']}>
  <AdminDashboard />
</AuthGuard>
```

### **Middleware** (`middleware.ts`)
Server-side route protection:
- Redirects unauthenticated users
- Checks user status in database
- Prevents access to wrong dashboards

## 🎯 Redirect Logic

```typescript
if (user.status === "pending") {
  showPendingPage();
} else if (user.status === "active" && user.role === "student") {
  redirect("/dashboard");
} else if (user.status === "active" && user.role === "faculty") {
  redirect("/dashboard");
} else if (user.status === "rejected") {
  showRejectedPage();
}
```

## 🔐 Security Features

### **Row Level Security (RLS)**
- Users can only view their own data
- Students can see department/class peers
- Faculty can see department colleagues
- Admins have full access

### **Email Domain Validation**
```typescript
// Only institutional emails allowed
if (!email.endsWith('@sanjivani.edu.in') && !email.endsWith('@sanjivani.ac.in')) {
  throw new Error('Invalid email domain');
}
```

### **Role-Based Access Control**
- Student routes: `/dashboard`, `/assignments`, `/announcements`
- Faculty routes: `/dashboard`, `/create-assignment`, `/manage-students`
- Admin routes: `/admin/*`, `/pending-approvals`

## 🚀 Setup Instructions

### 1. **Database Setup**
```sql
-- Run the complete schema
\i lib/database/complete-auth-schema.sql
```

### 2. **Supabase Configuration**
```bash
# Enable Google OAuth in Supabase Dashboard
# Add redirect URLs:
# - http://localhost:3000/auth/callback
# - https://yourdomain.com/auth/callback
```

### 3. **Environment Variables**
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. **Python Face Verification Service**
```python
# Ensure Python service is running
# API endpoint: /api/face-capture
# Saves images to Supabase Storage
```

## 📱 Real-time Features

The system integrates with the existing real-time subscription system:
- **Admin notifications** when new registrations arrive
- **User notifications** when approval status changes
- **Live updates** in pending approval dashboard

## 🔄 Migration from Existing System

If migrating from an existing auth system:

1. **Backup existing user data**
2. **Run database migration scripts**
3. **Update environment variables**
4. **Test Google OAuth configuration**
5. **Verify face verification service**
6. **Test complete flow end-to-end**

## 🐛 Troubleshooting

### Common Issues

1. **Google OAuth not working**
   - Check redirect URLs in Supabase
   - Verify Google Cloud Console settings
   - Ensure domain is authorized

2. **Face verification failing**
   - Check Python service is running
   - Verify Supabase Storage permissions
   - Test camera access in browser

3. **Users stuck in pending**
   - Check admin has access to approval dashboard
   - Verify RLS policies for admin role
   - Check real-time subscriptions

### Debug Commands

```typescript
// Check user status
const user = await authFlowManager.getCurrentUser();
const profile = await authFlowManager.checkUserExists(user.email);
console.log('User profile:', profile);

// Check pending registration
const pending = await authFlowManager.checkPendingRegistration(user.email);
console.log('Pending registration:', pending);
```

## 📊 Analytics & Monitoring

Track key metrics:
- Registration completion rate
- Approval/rejection rates
- Time to approval
- Face verification success rate
- Login method preferences (Google vs Email)

## 🔮 Future Enhancements

- **Multi-factor authentication (MFA)**
- **Social login providers (GitHub, Microsoft)**
- **Automated approval for certain domains**
- **Bulk user import/export**
- **Advanced face recognition features**
- **Mobile app integration**

---

This complete authentication system provides a secure, user-friendly onboarding experience while maintaining administrative control and institutional security requirements.
