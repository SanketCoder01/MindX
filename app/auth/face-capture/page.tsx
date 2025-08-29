"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera } from 'lucide-react';
import PythonFaceCapture from '@/components/PythonFaceCapture';
import AnimatedLoader from '@/components/ui/animated-loader';

function FaceCaptureContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const userEmail = searchParams.get('email') || '';
  const userName = searchParams.get('name') || '';
  const userType = searchParams.get('type') || 'student';

  const handleFaceCaptureSuccess = async (imageData: string) => {
    try {
      // Submit the face capture data to complete registration
      const response = await fetch('/api/auth/complete-face-capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          name: userName,
          userType,
          faceImageData: imageData,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Redirect to check email page for pending approval
        router.push('/auth/check-email');
      } else {
        console.error('Face capture submission failed:', result.error);
      }
    } catch (error) {
      console.error('Face capture error:', error);
    }
  };

  if (!userEmail || !userName) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                Missing user information. Please try the registration process again.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              Face Verification
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Welcome {userName}! Please capture your photo for verification using our advanced face detection system.
            </p>
          </CardHeader>

          <CardContent>
            <PythonFaceCapture
              onSuccess={handleFaceCaptureSuccess}
              userEmail={userEmail}
              userName={userName}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function FaceCapturePage() {
  return (
    <Suspense fallback={<AnimatedLoader />}>
      <FaceCaptureContent />
    </Suspense>
  );
}
