'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, Briefcase, Mail, Lock, Eye, EyeOff, GraduationCap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function OriginalLoginPage() {
  const router = useRouter();
  const [selectedUserType, setSelectedUserType] = useState<'student' | 'faculty' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    if (!selectedUserType) {
      setError('Please select whether you are a student or faculty member first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?type=${selectedUserType}`,
      },
    });

    if (error) {
      setError(`Google Sign-In failed: ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserType) {
      setError('Please select whether you are a student or faculty member first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        if (selectedUserType === 'faculty') {
          router.push('/dashboard');
        } else {
          router.push('/student-dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewUserRegistration = () => {
    if (!selectedUserType) {
      setError('Please select whether you are a student or faculty member first.');
      return;
    }
    router.push(`/auth/complete-registration?type=${selectedUserType}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-8 border-b border-gray-200">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome to EduVision</h1>
              <p className="text-sm text-gray-600">Your Educational Platform</p>
            </div>
          </div>
        </div>

        {/* User Type Selection */}
        <div className="p-8 flex-1">
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">I am a...</h2>
            <div className="space-y-3">
              <button
                onClick={() => setSelectedUserType('student')}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${
                  selectedUserType === 'student'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <User className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-medium">Student</div>
                  <div className="text-sm opacity-75">Access courses and assignments</div>
                </div>
              </button>

              <button
                onClick={() => setSelectedUserType('faculty')}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${
                  selectedUserType === 'faculty'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <Briefcase className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-medium">Faculty</div>
                  <div className="text-sm opacity-75">Manage courses and students</div>
                </div>
              </button>
            </div>
          </div>

          {/* Google Sign In */}
          <div className="mb-6">
            <Button
              onClick={handleGoogleSignIn}
              disabled={!selectedUserType || isLoading}
              className="w-full h-12 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-all duration-200 flex items-center justify-center space-x-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{isLoading ? 'Redirecting...' : 'Sign in with Google'}</span>
            </Button>
          </div>

          <div className="relative mb-6">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-white px-3 text-sm text-gray-500">Or continue with email</span>
            </div>
          </div>

          {/* New User Registration */}
          <Button
            onClick={handleNewUserRegistration}
            disabled={!selectedUserType}
            variant="outline"
            className="w-full mb-4"
          >
            New User? Register Here
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!selectedUserType || isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
