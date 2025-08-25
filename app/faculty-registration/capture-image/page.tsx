"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { Camera, RefreshCw, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import EduVisionLoader from "@/components/ui/animated-loader"

const videoConstraints = {
  width: 540,
  height: 380,
  facingMode: "user",
}

// Lazy-load Webcam component to avoid SSR/build-time issues
const Webcam = dynamic<any>(async () => (await import("react-webcam")).default as any, {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center text-sm text-gray-500 h-full">
      Initializing camera…
    </div>
  ),
})

export default function CaptureImagePage() {
  const router = useRouter()
  const { toast } = useToast()
  const webcamRef = useRef<any>(null)
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setImgSrc(imageSrc)
    } else {
      setError("Could not capture image. Please ensure camera permissions are enabled.")
    }
  }, [webcamRef])

  const handleRetake = () => {
    setImgSrc(null)
  }

  const handleCompleteRegistration = async () => {
    if (!imgSrc) {
      setError("Please capture an image before proceeding.")
      return
    }
    setIsLoading(true)

    // Simulate API call to save the image
    await new Promise((resolve) => setTimeout(resolve, 2500))

    toast({
      title: "Registration Complete!",
      description: "Welcome to EduVision! Redirecting you to your dashboard.",
    })

    // Redirect to the main faculty dashboard
    router.push("/dashboard")
  }

  if (isLoading) {
    return <EduVisionLoader />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Faculty Profile Image</CardTitle>
            <CardDescription>Please take a clear photo for your faculty profile.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative mb-4 flex items-center justify-center">
              {imgSrc ? (
                <img src={imgSrc} alt="Captured faculty member" className="w-full h-full object-cover" />
              ) : (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={videoConstraints}
                  onUserMediaError={() => setError("Camera not accessible. Please grant permission.")}
                  className="w-full h-full"
                />
              )}
            </div>

            <div className="flex justify-center gap-4">
              {imgSrc ? (
                <>
                  <Button variant="outline" onClick={handleRetake}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retake Photo
                  </Button>
                  <Button onClick={handleCompleteRegistration}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Registration & Go to Dashboard
                  </Button>
                </>
              ) : (
                <Button onClick={capture} size="lg">
                  <Camera className="mr-2 h-5 w-5" />
                  Capture Photo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
