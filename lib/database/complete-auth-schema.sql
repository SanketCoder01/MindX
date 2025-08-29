-- Complete Authentication and Onboarding Database Schema for EduVision
-- This schema supports the full auth flow: Google OAuth, email/password, face verification, admin approval

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('student', 'faculty', 'admin');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'rejected');
CREATE TYPE auth_provider AS ENUM ('google', 'email');

-- Profiles table (unified user profiles)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT,
    year TEXT,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'student',
    status user_status NOT NULL DEFAULT 'pending',
    face_verified BOOLEAN DEFAULT FALSE,
    face_url TEXT,
    auth_provider auth_provider DEFAULT 'google',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pending registrations table (for admin approval workflow)
CREATE TABLE IF NOT EXISTS pending_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    department TEXT NOT NULL,
    year TEXT, -- For students only
    user_type user_role NOT NULL,
    face_url TEXT,
    status user_status DEFAULT 'pending',
    rejection_reason TEXT,
    auth_provider auth_provider DEFAULT 'google',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id)
);

-- Note: Using existing students table structure
-- The existing students table will be modified to add auth fields
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active';
ALTER TABLE students ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT TRUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS face_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS auth_provider auth_provider DEFAULT 'google';

-- Update existing students table to use full_name if name exists
UPDATE students SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;

-- Students table structure (reference - already exists):
-- CREATE TABLE students (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     name VARCHAR(255) NOT NULL,
--     email VARCHAR(255) UNIQUE NOT NULL,
--     prn VARCHAR(50) UNIQUE NOT NULL,
--     department VARCHAR(100) NOT NULL,
--     year VARCHAR(20) NOT NULL,
    phone TEXT,
    face_url TEXT,
    status user_status DEFAULT 'active',
    face_verified BOOLEAN DEFAULT TRUE,
    auth_provider auth_provider DEFAULT 'google',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Using existing faculty table structure
-- The existing faculty table will be modified to add auth fields
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active';
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT TRUE;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS face_url TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS auth_provider auth_provider DEFAULT 'google';

-- Update existing faculty table to use full_name if name exists
UPDATE faculty SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;

-- Faculty table structure (reference - already exists):
-- CREATE TABLE faculty (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     name VARCHAR(255) NOT NULL,
--     email VARCHAR(255) UNIQUE NOT NULL,
--     department VARCHAR(100) NOT NULL,
--     designation VARCHAR(100) NOT NULL,
    phone TEXT,
    face_url TEXT,
    status user_status DEFAULT 'active',
    face_verified BOOLEAN DEFAULT TRUE,
    auth_provider auth_provider DEFAULT 'google',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department_id TEXT REFERENCES departments(id),
    year TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default departments
INSERT INTO departments (id, name, code) VALUES
    ('cse', 'Computer Science and Engineering', 'CSE'),
    ('cyber', 'Cyber Security', 'CS'),
    ('aids', 'Artificial Intelligence and Data Science', 'AIDS'),
    ('aiml', 'Artificial Intelligence and Machine Learning', 'AIML')
ON CONFLICT (id) DO NOTHING;

-- Insert default classes
INSERT INTO classes (id, name, department_id, year) VALUES
    ('cse_1', '1st Year CSE', 'cse', '1st Year'),
    ('cse_2', '2nd Year CSE', 'cse', '2nd Year'),
    ('cse_3', '3rd Year CSE', 'cse', '3rd Year'),
    ('cse_4', '4th Year CSE', 'cse', '4th Year'),
    ('cyber_1', '1st Year Cyber Security', 'cyber', '1st Year'),
    ('cyber_2', '2nd Year Cyber Security', 'cyber', '2nd Year'),
    ('cyber_3', '3rd Year Cyber Security', 'cyber', '3rd Year'),
    ('cyber_4', '4th Year Cyber Security', 'cyber', '4th Year'),
    ('aids_1', '1st Year AIDS', 'aids', '1st Year'),
    ('aids_2', '2nd Year AIDS', 'aids', '2nd Year'),
    ('aids_3', '3rd Year AIDS', 'aids', '3rd Year'),
    ('aids_4', '4th Year AIDS', 'aids', '4th Year'),
    ('aiml_1', '1st Year AIML', 'aiml', '1st Year'),
    ('aiml_2', '2nd Year AIML', 'aiml', '2nd Year'),
    ('aiml_3', '3rd Year AIML', 'aiml', '3rd Year'),
    ('aiml_4', '4th Year AIML', 'aiml', '4th Year')
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_status ON pending_registrations(status);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_department_class ON students(department_id, class_id);
CREATE INDEX IF NOT EXISTS idx_faculty_email ON faculty(email);
CREATE INDEX IF NOT EXISTS idx_faculty_department ON faculty(department_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Pending registrations policies (admin only)
CREATE POLICY "Only admins can view pending registrations" ON pending_registrations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin' 
            AND status = 'active'
        )
    );

CREATE POLICY "Only admins can update pending registrations" ON pending_registrations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin' 
            AND status = 'active'
        )
    );

-- Students policies
CREATE POLICY "Students can view own record" ON students
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Students in same department can view each other" ON students
    FOR SELECT USING (
        department_id IN (
            SELECT department_id FROM students 
            WHERE user_id = auth.uid()
        )
    );

-- Faculty policies
CREATE POLICY "Faculty can view own record" ON faculty
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Faculty in same department can view each other" ON faculty
    FOR SELECT USING (
        department_id IN (
            SELECT department_id FROM faculty 
            WHERE user_id = auth.uid()
        )
    );

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_registrations_updated_at BEFORE UPDATE ON pending_registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faculty_updated_at BEFORE UPDATE ON faculty
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE pending_registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE students;
ALTER PUBLICATION supabase_realtime ADD TABLE faculty;

-- Create admin user function (to be called after first admin signs up)
CREATE OR REPLACE FUNCTION create_admin_user(admin_email TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles 
    SET role = 'admin', status = 'active' 
    WHERE email = admin_email;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Admin user with email % not found', admin_email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve pending registration
CREATE OR REPLACE FUNCTION approve_pending_registration(pending_id UUID)
RETURNS VOID AS $$
DECLARE
    pending_user pending_registrations%ROWTYPE;
    auth_user_id UUID;
BEGIN
    -- Get pending registration
    SELECT * INTO pending_user FROM pending_registrations WHERE id = pending_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending registration not found';
    END IF;
    
    -- Get auth user ID
    SELECT id INTO auth_user_id FROM auth.users WHERE email = pending_user.email;
    
    -- Move to appropriate table
    IF pending_user.user_type = 'student' THEN
        INSERT INTO students (
            user_id, email, full_name, department_id, class_id, 
            phone, face_url, status, face_verified, auth_provider
        ) VALUES (
            auth_user_id, pending_user.email, pending_user.name, 
            pending_user.department, pending_user.year,
            pending_user.phone, pending_user.face_url, 'active', 
            TRUE, pending_user.auth_provider
        );
    ELSE
        INSERT INTO faculty (
            user_id, email, full_name, department_id, 
            phone, face_url, status, face_verified, auth_provider
        ) VALUES (
            auth_user_id, pending_user.email, pending_user.name, 
            pending_user.department, pending_user.phone, 
            pending_user.face_url, 'active', TRUE, pending_user.auth_provider
        );
    END IF;
    
    -- Remove from pending table
    DELETE FROM pending_registrations WHERE id = pending_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject pending registration
CREATE OR REPLACE FUNCTION reject_pending_registration(pending_id UUID, reason TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE pending_registrations 
    SET status = 'rejected', rejection_reason = reason, updated_at = NOW()
    WHERE id = pending_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending registration not found';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
