'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { updateFacultyProfile } from '../actions';
import { DEPARTMENTS } from '@/lib/constants/departments';
import CourseSelector from '@/components/ui/course-selector';

export default function RegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Extract user info from URL
  const name = searchParams.get('name') || 'New User';
  const email = searchParams.get('email') || '';
  const avatarUrl = searchParams.get('avatar') || '';

  const [formData, setFormData] = useState({
    fullName: name,
    email: email,
    field: '',
    course: '',
    department: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.field || !formData.course || !formData.department) {
      setError('Please select your Field, Course, and Department.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    const { error } = await updateFacultyProfile(formData);

    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      toast({
        title: 'Details Saved!',
        description: 'Your profile is complete. You can now access the dashboard.',
      });
      router.push('/faculty-dashboard');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          {avatarUrl && (
            <Image
              src={avatarUrl}
              alt="Profile Picture"
              width={96}
              height={96}
              className="rounded-full mx-auto mb-4 border-4 border-gray-200"
            />
          )}
          <CardTitle className="text-2xl font-bold">Faculty Registration</CardTitle>
          <CardDescription>Welcome, {name}! Please fill in your details to complete your profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={name} readOnly disabled />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={email} readOnly disabled />
              </div>
            </div>

            {/* Academic Information Section */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-4">Academic Information</h3>
              
              {/* Field and Course Selection */}
              <div className="mb-4">
                <CourseSelector
                  selectedField={formData.field}
                  selectedCourse={formData.course}
                  onFieldChangeAction={(field: string) => handleInputChange('field', field)}
                  onCourseChangeAction={(course: string) => handleInputChange('course', course)}
                />
              </div>

              {/* Department Selection */}
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select onValueChange={(value) => handleInputChange('department', value)} required>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile Number</Label>
              <Input
                id="mobileNumber"
                type="tel"
                placeholder="Enter your mobile number"
                value={formData.mobileNumber}
                onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save and Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
