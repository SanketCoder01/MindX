-- Auth Migration Script for EduVision
-- This script adds authentication fields to existing tables and creates new auth tables
-- Compatible with existing schema structure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'faculty', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('pending', 'active', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE auth_provider AS ENUM ('google', 'email');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add auth fields to existing students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active';
ALTER TABLE students ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT TRUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS face_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS auth_provider auth_provider DEFAULT 'google';

-- Update existing students to use full_name from name (if name column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'name') THEN
        UPDATE students SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
    END IF;
END $$;

-- Add auth fields to existing faculty table
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS status user_status DEFAULT 'active';
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT TRUE;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS face_url TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS auth_provider auth_provider DEFAULT 'google';

-- Update existing faculty to use full_name from name (if name column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'faculty' AND column_name = 'name') THEN
        UPDATE faculty SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
    END IF;
END $$;

-- Create profiles table (unified user profiles)
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

-- Create pending registrations table (for admin approval workflow)
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

-- Create departments table if it doesn't exist
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default departments
INSERT INTO departments (id, name, code, description) VALUES
('computer_engineering', 'Computer Engineering', 'COMP', 'Computer Engineering Department'),
('information_technology', 'Information Technology', 'IT', 'Information Technology Department'),
('electronics', 'Electronics Engineering', 'ENTC', 'Electronics and Telecommunication Engineering'),
('mechanical', 'Mechanical Engineering', 'MECH', 'Mechanical Engineering Department'),
('civil', 'Civil Engineering', 'CIVIL', 'Civil Engineering Department')
ON CONFLICT (code) DO NOTHING;

-- Create classes table if it doesn't exist
CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    department TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default classes
INSERT INTO classes (id, name, year, department) VALUES
('fe_comp', 'FE Computer', 1, 'Computer Engineering'),
('se_comp', 'SE Computer', 2, 'Computer Engineering'),
('te_comp', 'TE Computer', 3, 'Computer Engineering'),
('be_comp', 'BE Computer', 4, 'Computer Engineering'),
('fe_it', 'FE IT', 1, 'Information Technology'),
('se_it', 'SE IT', 2, 'Information Technology'),
('te_it', 'TE IT', 3, 'Information Technology'),
('be_it', 'BE IT', 4, 'Information Technology')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create RLS policies for pending registrations
CREATE POLICY "Users can view own pending registration" ON pending_registrations FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
CREATE POLICY "Admins can manage pending registrations" ON pending_registrations FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create RLS policies for departments and classes (public read)
CREATE POLICY "Anyone can view departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Anyone can view classes" ON classes FOR SELECT USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_status ON pending_registrations(status);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_faculty_user_id ON faculty(user_id);

-- Create updated_at trigger for new tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Admin helper functions
CREATE OR REPLACE FUNCTION approve_pending_registration(registration_id UUID, admin_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    reg_record RECORD;
    new_user_id UUID;
BEGIN
    -- Get the pending registration
    SELECT * INTO reg_record FROM pending_registrations WHERE id = registration_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending registration not found or already processed';
    END IF;
    
    -- Create auth user if using email provider
    IF reg_record.auth_provider = 'email' THEN
        -- This would need to be handled by the application layer
        RAISE EXCEPTION 'Email user creation must be handled by application layer';
    END IF;
    
    -- Get user_id from auth.users by email
    SELECT id INTO new_user_id FROM auth.users WHERE email = reg_record.email;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auth user not found for email: %', reg_record.email;
    END IF;
    
    -- Create profile record
    INSERT INTO profiles (user_id, full_name, email, department, year, phone, role, status, face_verified, face_url, auth_provider)
    VALUES (new_user_id, reg_record.full_name, reg_record.email, reg_record.department, reg_record.year, reg_record.phone, reg_record.user_type, 'active', true, reg_record.face_url, reg_record.auth_provider);
    
    -- Insert into appropriate table
    IF reg_record.user_type = 'student' THEN
        INSERT INTO students (user_id, name, full_name, email, prn, department, year, phone, status, face_verified, face_url, auth_provider)
        VALUES (new_user_id, reg_record.full_name, reg_record.full_name, reg_record.email, 
                'PRN' || EXTRACT(YEAR FROM NOW()) || LPAD(nextval('students_prn_seq')::TEXT, 6, '0'), 
                reg_record.department, reg_record.year, reg_record.phone, 'active', true, reg_record.face_url, reg_record.auth_provider);
    ELSIF reg_record.user_type = 'faculty' THEN
        INSERT INTO faculty (user_id, name, full_name, email, department, designation, phone, status, face_verified, face_url, auth_provider)
        VALUES (new_user_id, reg_record.full_name, reg_record.full_name, reg_record.email, reg_record.department, 'Assistant Professor', reg_record.phone, 'active', true, reg_record.face_url, reg_record.auth_provider);
    END IF;
    
    -- Update pending registration
    UPDATE pending_registrations 
    SET status = 'approved', reviewed_at = NOW(), reviewed_by = admin_user_id
    WHERE id = registration_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_pending_registration(registration_id UUID, admin_user_id UUID, reason TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE pending_registrations 
    SET status = 'rejected', rejection_reason = reason, reviewed_at = NOW(), reviewed_by = admin_user_id
    WHERE id = registration_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending registration not found or already processed';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create sequence for PRN generation if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS students_prn_seq START 1;

-- Create admin user function
CREATE OR REPLACE FUNCTION create_admin_user(admin_email TEXT, admin_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get user_id from auth.users
    SELECT id INTO admin_user_id FROM auth.users WHERE email = admin_email;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auth user not found for email: %. Please create the user first.', admin_email;
    END IF;
    
    -- Insert into profiles
    INSERT INTO profiles (user_id, full_name, email, role, status, face_verified, auth_provider)
    VALUES (admin_user_id, admin_name, admin_email, 'admin', 'active', true, 'email')
    ON CONFLICT (email) DO UPDATE SET role = 'admin', status = 'active';
    
    -- Insert into faculty table as well (admins are typically faculty)
    INSERT INTO faculty (user_id, name, full_name, email, department, designation, status, face_verified, auth_provider)
    VALUES (admin_user_id, admin_name, admin_name, admin_email, 'Administration', 'Administrator', 'active', true, 'email')
    ON CONFLICT (email) DO UPDATE SET designation = 'Administrator', status = 'active';
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE pending_registrations;
