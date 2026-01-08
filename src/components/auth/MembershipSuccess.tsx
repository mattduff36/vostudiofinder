'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { CountryAutocomplete } from '@/components/ui/CountryAutocomplete';
import { ImageCropperModal } from '@/components/images/ImageCropperModal';
import { Loader2, Upload, X, AlertCircle } from 'lucide-react';
import { extractCity } from '@/lib/utils/address';
import Image from 'next/image';

const STUDIO_TYPES = [
  { value: 'HOME', label: 'Home', description: 'Personal recording space in a home environment' },
  { value: 'RECORDING', label: 'Recording', description: 'Full, professional recording facility' },
  { value: 'PODCAST', label: 'Podcast', description: 'Studio specialised for podcast recording' },
];

const CONNECTION_TYPES = [
  { id: 'connection1', label: 'Source Connect' },
  { id: 'connection2', label: 'Source Connect Now' },
  { id: 'connection3', label: 'Phone Patch' },
  { id: 'connection4', label: 'Session Link Pro' },
  { id: 'connection5', label: 'Zoom or Teams' },
  { id: 'connection6', label: 'Cleanfeed' },
  { id: 'connection7', label: 'Riverside' },
  { id: 'connection8', label: 'Google Hangouts' },
  { id: 'connection9', label: 'ipDTL' },
  { id: 'connection10', label: 'SquadCast' },
  { id: 'connection11', label: 'Zencastr' },
  { id: 'connection12', label: 'Other (See profile)' },
];

interface ProfileFormData {
  // Pre-filled (locked)
  username: string;
  display_name: string;
  email: string;
  // Required fields
  studio_name: string;
  short_about: string;
  about: string;
  studio_types: string[];
  full_address: string;
  abbreviated_address: string;
  city: string;
  location: string;
  website_url: string;
  connections: Record<string, boolean>;
  images: { url: string; alt_text?: string }[];
}

export function MembershipSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{
    message: string;
    code?: string;
    canRetry?: boolean;
  } | null>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<{ url: string; alt_text?: string }[]>([]);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [nextStep, setNextStep] = useState<'choose' | 'verify_now' | 'build_now'>('choose');
  
  // Extract search params and memoize to prevent infinite loops
  // useSearchParams() returns a new URLSearchParams instance on every render,
  // so we need to extract values and memoize them for stable dependencies
  const sessionId = searchParams?.get('session_id') || null;
  const email = searchParams?.get('email') || '';
  const name = searchParams?.get('name') || '';
  const username = searchParams?.get('username') || '';
  
  // Memoize the extracted values to prevent dependency array instability
  // These stable values are used in useCallback dependencies
  const stableSessionId = useMemo(() => sessionId || '', [sessionId]);
  const stableEmail = useMemo(() => email || '', [email]);
  const stableName = useMemo(() => name || '', [name]);
  const stableUsername = useMemo(() => username || '', [username]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProfileFormData>({
    defaultValues: {
      username: username,
      display_name: name,
      email: email,
      studio_name: '',
      short_about: '',
      about: '',
      studio_types: [],
      full_address: '',
      abbreviated_address: '',
      city: '',
      location: '',
      website_url: '',
      connections: {},
      images: [],
    },
  });

  const studioTypes = watch('studio_types') || [];
  const connections = watch('connections') || {};
  const formUsername = watch('username');
  const formDisplayName = watch('display_name');
  const formEmail = watch('email');

  // Verify payment on component mount
  // Memoize verifyPayment to prevent infinite loops from unstable searchParams
  const verifyPayment = useCallback(async () => {
    // Use stable memoized values instead of direct searchParams.get() results
    // This prevents infinite loops caused by new URLSearchParams instances on each render
    let recoveredEmail = stableEmail;
    let recoveredName = stableName;
    let recoveredUsername = stableUsername;
    let recoveredSessionId = stableSessionId || null;

    // If missing data, try sessionStorage
    if (!recoveredEmail || !recoveredName) {
      const signupDataStr = sessionStorage.getItem('signupData');
      if (signupDataStr) {
        try {
          const signupData = JSON.parse(signupDataStr);
          recoveredEmail = recoveredEmail || signupData.email;
          recoveredName = recoveredName || signupData.display_name;
        } catch (err) {
          console.error('Error parsing signup data:', err);
        }
      }
    }

    // If still missing email, try to recover from payment status
    if (!recoveredEmail && !recoveredSessionId) {
      setError({
        message: 'Session data missing. Please check your email for a recovery link or contact support.',
        code: 'NO_DATA',
        canRetry: false,
      });
      return;
    }

    // If we have email but no session ID, check payment status
    if (recoveredEmail && !recoveredSessionId) {
      // Validate email is not empty before making API call
      if (!recoveredEmail.trim()) {
        setError({
          message: 'Invalid email address. Please check your email and try again.',
          code: 'INVALID_EMAIL',
          canRetry: false,
        });
        return;
      }

      try {
        console.log('🔍 Recovering payment status for:', recoveredEmail);
        const statusResponse = await fetch('/api/auth/check-payment-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: recoveredEmail }),
        });

        if (statusResponse.ok) {
          let statusData;
          try {
            statusData = await statusResponse.json();
          } catch (jsonError) {
            console.error('Error parsing payment status response:', jsonError);
            setError({
              message: 'Invalid response from server. Please try again or contact support.',
              code: 'INVALID_RESPONSE',
              canRetry: true,
            });
            return;
          }

          if (statusData.hasPayment && statusData.paymentStatus === 'succeeded') {
            // Ensure sessionId was actually returned
            if (!statusData.sessionId) {
              setError({
                message: 'Payment found but session ID is missing. Please contact support.',
                code: 'MISSING_SESSION_ID',
                canRetry: false,
              });
              return;
            }
            recoveredSessionId = statusData.sessionId;
            recoveredUsername = statusData.user?.username;
            recoveredName = statusData.user?.display_name;
            console.log('✅ Recovered payment data from database');
            // Continue to payment verification below
          } else {
            setError({
              message: 'No successful payment found. Please complete your payment first.',
              code: 'NO_PAYMENT',
              canRetry: true,
            });
            return;
          }
        } else {
          // Handle non-OK response from payment status check
          let errorData;
          try {
            errorData = await statusResponse.json();
          } catch (jsonError) {
            // If JSON parsing fails, use status code for error message
            errorData = { error: `Server error (${statusResponse.status})` };
          }
          
          setError({
            message: errorData.error || `Failed to check payment status (${statusResponse.status}). Please try again or contact support.`,
            code: 'PAYMENT_STATUS_CHECK_FAILED',
            canRetry: true,
          });
          return;
        }
      } catch (err) {
        console.error('Error recovering payment status:', err);
        setError({
          message: err instanceof Error ? err.message : 'Failed to check payment status. Please try again or contact support.',
          code: 'PAYMENT_STATUS_CHECK_ERROR',
          canRetry: true,
        });
        return;
      }
    }

    if (!recoveredSessionId) {
      setError({
        message: 'No payment session found. Please start the signup process again.',
        code: 'NO_SESSION',
        canRetry: false,
      });
      return;
    }

    try {
      const params = new URLSearchParams();
      if (recoveredEmail) params.set('email', recoveredEmail);
      if (recoveredName) params.set('name', recoveredName);
      if (recoveredUsername) params.set('username', recoveredUsername);

      const response = await fetch(`/api/stripe/verify-membership-payment?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: recoveredSessionId }),
      });

      const result = await response.json();

      console.log('🔍 Verification result:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Payment verification failed');
      }

      // Populate form fields with customer data from Stripe session metadata
      if (result.customerData) {
        console.log('✅ Customer data found:', result.customerData);
        // Use reset() to properly update disabled fields and trigger re-render
        reset({
          username: result.customerData.username || recoveredUsername || '',
          display_name: result.customerData.name || recoveredName || '',
          email: result.customerData.email || recoveredEmail || '',
          studio_name: '',
          short_about: '',
          about: '',
          studio_types: [],
          full_address: '',
          abbreviated_address: '',
          city: '',
          location: '',
          website_url: '',
          connections: {},
          images: [],
        });
        console.log('✅ Form reset with customer data');
      } else {
        console.error('❌ No customer data in verification response');
      }

      setPaymentVerified(true);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Payment verification failed. Please refresh the page or contact support.',
        code: 'PAYMENT_VERIFICATION_ERROR',
        canRetry: true,
      });
    }
    // Use stable memoized values instead of direct searchParams.get() results
    // This prevents infinite loops caused by new URLSearchParams instances on each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableSessionId, stableEmail, stableName, stableUsername]);

  useEffect(() => {
    verifyPayment();
  }, [verifyPayment]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (!files || files.length === 0) {
      return;
    }

    // IMPORTANT: Capture the file BEFORE clearing the input
    // FileList is a live object that gets cleared when input.value is cleared
    const file = files[0];
    
    if (!file) {
      return;
    }

    // Clear the input so the same file can be selected again
    // Do this AFTER capturing the file
    e.target.value = '';

    if (images.length >= 5) {
      setError({
        message: 'Maximum 5 images allowed. Please remove an image before adding another.',
        code: 'IMAGE_LIMIT',
        canRetry: false,
      });
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      setError({
        message: 'Please select a valid image file (.png, .jpg, .jpeg, .webp)',
        code: 'INVALID_FILE_TYPE',
        canRetry: false,
      });
      setTimeout(() => setError(null), 5000);
      return;
    }

    // Validate file size (10MB - will be compressed)
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setError({
        message: `Image too large (${sizeMB}MB). Maximum size is 10MB. Please compress or resize your image.`,
        code: 'FILE_TOO_LARGE',
        canRetry: false,
      });
      setTimeout(() => setError(null), 7000);
      return;
    }

    // Clear any existing error and open cropper
    setError(null);
    setSelectedFile(file);
    setCropperOpen(true);
  };

  const handleCropConfirm = async (croppedFile: File) => {
    try {
      setUploading(true);
      setCropperOpen(false);
      setSelectedFile(null);

      const formData = new FormData();
      formData.append('file', croppedFile);
      formData.append('folder', 'voiceover-studios');

      const response = await fetch('/api/upload/signup-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      const newImages = [...images, { url: result.image.url, alt_text: '' }];
      setImages(newImages);
      setValue('images', newImages);
      setError(null);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to process image. Please try again.',
        code: 'IMAGE_UPLOAD_ERROR',
        canRetry: true,
      });
      setTimeout(() => setError(null), 5000);
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setCropperOpen(false);
    setSelectedFile(null);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    setValue('images', newImages);
  };

  const toggleStudioType = (type: string) => {
    const currentTypes = studioTypes;
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    setValue('studio_types', newTypes);
  };

  const toggleConnection = (connectionId: string) => {
    setValue(`connections.${connectionId}`, !connections[connectionId]);
  };

  const handleVerifyNow = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get password from session storage (stored during signup)
      const signupDataStr = sessionStorage.getItem('signupData');
      let password = '';
      if (signupDataStr) {
        const signupData = JSON.parse(signupDataStr);
        password = signupData.password;
      }

      if (!password) {
        setError({
          message: 'Session expired. Please start the signup process again from the beginning.',
          code: 'SESSION_EXPIRED',
          canRetry: false,
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/create-paid-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          username: formUsername,
          email: formEmail,
          display_name: formDisplayName,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Throw the entire result object so we can parse it in the catch block
        throw new Error(JSON.stringify(result));
      }

      // Clear signup data from session storage
      sessionStorage.removeItem('signupData');
      sessionStorage.removeItem('selectedUsername');

      // Redirect to email verification page with flow=account
      router.push(`/auth/verify-email?flow=account&email=${encodeURIComponent(formEmail)}`);
    } catch (err) {
      // Parse API error response safely
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      let apiError: any = { error: errorMessage, canRetry: true };
      
      if (typeof errorMessage === 'string' && errorMessage.includes('{')) {
        try {
          apiError = JSON.parse(errorMessage);
        } catch (parseError) {
          // If parsing fails, use the original error message
          console.warn('Failed to parse error message as JSON:', errorMessage);
        }
      }
      
      setError({
        message: apiError.error || apiError.message || 'Failed to create account. Please try again.',
        code: apiError.errorCode || 'UNKNOWN_ERROR',
        canRetry: apiError.canRetry !== false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    // Validation
    if (images.length === 0) {
      setError({
        message: 'Please upload at least 1 image of your studio to continue.',
        code: 'MISSING_IMAGES',
        canRetry: false,
      });
      return;
    }

    if (data.studio_types.length === 0) {
      setError({
        message: 'Please select at least one studio type to continue.',
        code: 'MISSING_STUDIO_TYPE',
        canRetry: false,
      });
      return;
    }

    const hasConnection = Object.values(data.connections).some(v => v);
    if (!hasConnection) {
      setError({
        message: 'Please select at least one connection method to continue.',
        code: 'MISSING_CONNECTION',
        canRetry: false,
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get password from session storage (stored during signup)
      const signupDataStr = sessionStorage.getItem('signupData');
      let password = '';
      if (signupDataStr) {
        const signupData = JSON.parse(signupDataStr);
        password = signupData.password;
      }

      if (!password) {
        setError({
          message: 'Session expired. Please start the signup process again from the beginning.',
          code: 'SESSION_EXPIRED',
          canRetry: false,
        });
        setIsLoading(false);
        return;
      }

      // Auto-add https:// to website URL if not present and validate format
      let websiteUrl = data.website_url.trim();
      if (websiteUrl && !websiteUrl.match(/^https?:\/\//i)) {
        websiteUrl = `https://${websiteUrl}`;
      }

      // Validate the final URL format
      if (websiteUrl) {
        try {
          const url = new URL(websiteUrl);
          // Ensure it's a valid HTTP/HTTPS URL with a proper domain
          if (!url.protocol.match(/^https?:$/)) {
            throw new Error('Invalid protocol');
          }
          // Check for valid hostname (not just "invalid" or single word)
          if (!url.hostname || !url.hostname.includes('.')) {
            throw new Error('Invalid domain');
          }
        } catch (err) {
          setError({
            message: 'Please enter a valid website URL (e.g., yourstudio.com)',
            code: 'INVALID_WEBSITE_URL',
            canRetry: false,
          });
          setIsLoading(false);
          return;
        }
      }

      console.log('📤 Submitting profile data:', {
        hasPassword: !!password,
        hasSessionId: !!sessionId,
        studioTypes: data.studio_types,
        imageCount: images.length,
        connections: Object.keys(data.connections).filter(k => data.connections[k]),
        websiteUrl
      });

      const response = await fetch('/api/auth/create-studio-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          website_url: websiteUrl, // Use the auto-prefixed URL
          password, // Include password from signup
          sessionId,
          images,
        }),
      });

      const result = await response.json();
      console.log('📥 Server response:', { ok: response.ok, status: response.status, result });

      if (!response.ok) {
        // Throw the entire result object so we can parse it in the catch block
        throw new Error(JSON.stringify(result));
      }

      // Clear signup data from session storage
      sessionStorage.removeItem('signupData');
      sessionStorage.removeItem('selectedUsername');

      // Redirect to email verification page
      router.push(`/auth/verify-email?flow=profile&email=${encodeURIComponent(formEmail)}`);
    } catch (err) {
      // Parse API error response safely
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      let apiError: any = { error: errorMessage, canRetry: true };
      
      if (typeof errorMessage === 'string' && errorMessage.includes('{')) {
        try {
          apiError = JSON.parse(errorMessage);
        } catch (parseError) {
          // If parsing fails, use the original error message
          console.warn('Failed to parse error message as JSON:', errorMessage);
        }
      }
      
      setError({
        message: apiError.error || apiError.message || 'Failed to create profile. Please try again.',
        code: apiError.errorCode || 'UNKNOWN_ERROR',
        canRetry: apiError.canRetry !== false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!paymentVerified && !error) {
    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="absolute inset-0">
          <Image
            src="/background-images/21920-5.jpg"
            alt="Background texture"
            fill
            className="object-cover opacity-10"
            priority={false}
          />
        </div>
        <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/voiceover-studio-finder-header-logo2-black.png"
              alt="VoiceoverStudioFinder"
              width={450}
              height={71}
              priority
              className="h-auto max-w-full"
            />
          </div>
          <div className="bg-white/90 backdrop-blur-sm py-8 px-6 shadow sm:rounded-lg text-center">
            <div className="flex justify-center mb-4">
              <Image
                src="/favicon_transparent/android-chrome-192x192.png"
                alt="Loading"
                width={64}
                height={64}
                className="animate-pulse"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Verifying Payment...
            </h1>
            <p className="mt-2 text-gray-600">
              Please wait while we confirm your membership payment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !paymentVerified) {
    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="absolute inset-0">
          <Image
            src="/background-images/21920-5.jpg"
            alt="Background texture"
            fill
            className="object-cover opacity-10"
            priority={false}
          />
        </div>
        <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/voiceover-studio-finder-header-logo2-black.png"
              alt="VoiceoverStudioFinder"
              width={450}
              height={71}
              priority
              className="h-auto max-w-full"
            />
          </div>
          <div className="bg-white/90 backdrop-blur-sm py-8 px-6 shadow sm:rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Verification Failed
              </h1>
              <p className="text-red-600 mb-6">{error.message}</p>
              <Button
                onClick={() => router.push('/auth/signup')}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-start py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0">
        <Image
          src="/background-images/21920-5.jpg"
          alt="Background texture"
          fill
          className="object-cover opacity-10"
          priority={false}
        />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-4xl px-4">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/images/voiceover-studio-finder-header-logo2-black.png"
            alt="VoiceoverStudioFinder"
            width={450}
            height={71}
            priority
            className="h-auto max-w-full"
          />
        </div>

        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Payment Successful!
          </h1>
          <p className="mt-2 text-gray-600">
            {nextStep === 'choose' 
              ? 'Choose your next step to get started'
              : 'Complete your studio profile to get your listing live'
            }
          </p>
        </div>

        {/* Two-Card Chooser UI */}
        {nextStep === 'choose' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Option 1: Verify Now */}
            <button
              type="button"
              onClick={handleVerifyNow}
              disabled={isLoading}
              className="group bg-white/90 backdrop-blur-sm p-8 shadow-lg hover:shadow-2xl rounded-lg transition-all duration-300 hover:scale-105 border-2 border-transparent hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Verify your email now, go live when you're ready
                  </h3>
                  <div className="text-gray-600 space-y-2 text-sm">
                    <p>We'll send your verification email immediately.</p>
                    <p>After you verify and sign in, you can build your studio profile from your dashboard at your own pace.</p>
                    <p>Your profile stays hidden until you complete the required details and turn visibility on.</p>
                  </div>
                </div>
                {isLoading && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Creating account...</span>
                  </div>
                )}
              </div>
            </button>

            {/* Option 2: Build Now */}
            <button
              type="button"
              onClick={() => setNextStep('build_now')}
              disabled={isLoading}
              className="group bg-white/90 backdrop-blur-sm p-8 shadow-lg hover:shadow-2xl rounded-lg transition-all duration-300 hover:scale-105 border-2 border-transparent hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Complete your studio details now, publish faster
                  </h3>
                  <div className="text-gray-600 space-y-2 text-sm">
                    <p>Add the required studio info and at least one image now.</p>
                    <p>After verification, your profile will be visible right away and you'll be able to start connecting with voice artists immediately.</p>
                    <p>Best choice if you want your profile ready to share as soon as you sign in.</p>
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && nextStep === 'choose' && (
          <div className="mb-6 p-6 bg-red-50 border-2 border-red-200 rounded-lg shadow-md">
            <div className="flex items-start space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-red-900 mb-1">
                  {error.code === 'SESSION_EXPIRED' && 'Session Expired'}
                  {error.code === 'EMAIL_EXISTS' && 'Account Already Exists'}
                  {error.code === 'USERNAME_TAKEN' && 'Username Unavailable'}
                  {error.code === 'PAYMENT_VERIFICATION_FAILED' && 'Payment Issue'}
                  {error.code === 'VALIDATION_ERROR' && 'Invalid Information'}
                  {error.code === 'SERVER_ERROR' && 'Technical Issue'}
                  {!error.code && 'Error'}
                </h3>
                <p className="text-sm text-red-700 leading-relaxed">
                  {error.message}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              {error.canRetry && (
                <Button
                  onClick={() => {
                    setError(null);
                    // Retry logic could be added here
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Try Again
                </Button>
              )}
              <Button
                onClick={() => router.push('/contact')}
                variant="outline"
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
              >
                Contact Support
              </Button>
              {error.code === 'EMAIL_EXISTS' && (
                <Button
                  onClick={() => router.push('/auth/signin')}
                  className="flex-1 bg-gray-700 hover:bg-gray-800 text-white"
                >
                  Sign In
                </Button>
              )}
              {(error.code === 'SESSION_EXPIRED' || error.code === 'USERNAME_TAKEN') && (
                <Button
                  onClick={() => router.push('/auth/signup')}
                  className="flex-1 bg-gray-700 hover:bg-gray-800 text-white"
                >
                  Start Over
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Profile Setup Form - Only show when Option 2 is chosen */}
        {nextStep === 'build_now' && (
          <div className="bg-white/90 backdrop-blur-sm py-8 px-6 shadow sm:rounded-lg">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {error && (
              <div className="p-6 bg-red-50 border-2 border-red-200 rounded-lg shadow-md">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-red-900 mb-1">
                      {error.code === 'MISSING_IMAGES' && 'Images Required'}
                      {error.code === 'MISSING_STUDIO_TYPE' && 'Studio Type Required'}
                      {error.code === 'MISSING_CONNECTION' && 'Connection Method Required'}
                      {error.code === 'INVALID_WEBSITE_URL' && 'Invalid Website URL'}
                      {error.code === 'SESSION_EXPIRED' && 'Session Expired'}
                      {error.code === 'EMAIL_EXISTS' && 'Account Already Exists'}
                      {error.code === 'SERVER_ERROR' && 'Technical Issue'}
                      {!error.code && 'Error'}
                    </h3>
                    <p className="text-sm text-red-700 leading-relaxed">
                      {error.message}
                    </p>
                  </div>
                </div>
                {(error.canRetry || error.code === 'SERVER_ERROR') && (
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <Button
                      type="button"
                      onClick={() => setError(null)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      Dismiss & Try Again
                    </Button>
                    <Button
                      type="button"
                      onClick={() => router.push('/contact')}
                      variant="outline"
                      className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Contact Support
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Account Details (locked) */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Username"
                  value={formUsername || ''}
                  disabled
                  className="bg-gray-50"
                />
                <Input
                  label="Display Name"
                  value={formDisplayName || ''}
                  disabled
                  className="bg-gray-50"
                />
                <Input
                  label="Email"
                  value={formEmail || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>

            {/* Studio Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Studio Information</h3>
              
              <Input
                label="Studio Name *"
                {...register('studio_name', { required: 'Studio name is required' })}
                error={errors.studio_name?.message || ''}
                maxLength={35}
                helperText="Your studio or business name"
                placeholder="e.g., Smith Studios"
              />

            <div>
              <Input
                  label="Short About *"
                  {...register('short_about', { required: 'Short description is required' })}
                  error={errors.short_about?.message || ''}
                  maxLength={150}
                  helperText="Brief description shown in listings"
                  placeholder="e.g., Professional recording studio in London"
                />
            </div>

            <div>
                <Textarea
                  label="Full About *"
                  {...register('about', { required: 'Full description is required' })}
                  error={errors.about?.message || ''}
                  rows={6}
                  maxLength={1500}
                  helperText="Detailed description for your profile page"
                  placeholder="Tell voice artists about your studio, equipment, experience..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Studio Types *
              </label>
                <div className="grid grid-cols-3 gap-3">
                  {STUDIO_TYPES.map((type) => (
                    <div key={type.value} className="relative group">
                      <Checkbox
                        label={type.label}
                        checked={studioTypes.includes(type.value)}
                        onChange={() => toggleStudioType(type.value)}
                      />
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none">
                        {type.description}
                      </div>
                    </div>
                  ))}
              </div>
                {studioTypes.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">Select at least one type</p>
              )}
            </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Location</h3>
              
              <AddressAutocomplete
                label="Full Address *"
                value={watch('full_address') || ''}
                onChange={(value) => {
                  setValue('full_address', value);
                  setValue('abbreviated_address', value);
                  setValue('city', extractCity(value));
                }}
                placeholder="Start typing your full address..."
                helperText="Complete address used for map coordinates"
              />

              <Input
                label="Abbreviated Address"
                {...register('abbreviated_address')}
                placeholder="e.g., London, UK"
                helperText="Shortened address shown publicly"
              />

              <Input
                label="City"
                {...register('city')}
                placeholder="Auto-filled from address"
                helperText="Auto-populated from full address"
              />

              <CountryAutocomplete
                label="Country *"
                value={watch('location') || ''}
                onChange={(value) => setValue('location', value)}
                placeholder="e.g., United Kingdom"
                helperText="Your primary country of operation"
              />
            </div>

            {/* Contact & Connection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Contact & Connection Methods</h3>
              
              <Input
                label="Website URL *"
                type="text"
                {...register('website_url', { 
                  required: 'Website URL is required',
                  validate: (value) => {
                    if (!value) return true; // Let required handle empty
                    
                    // Add https:// if not present (for validation)
                    let url = value.trim();
                    if (!url.match(/^https?:\/\//i)) {
                      url = `https://${url}`;
                    }
                    
                    try {
                      const parsed = new URL(url);
                      // Require proper domain with at least one dot
                      if (!parsed.hostname.includes('.')) {
                        return 'Please enter a valid domain (e.g., yourstudio.com)';
                      }
                      return true;
                    } catch {
                      return 'Please enter a valid website URL';
                    }
                  }
                })}
                error={errors.website_url?.message || ''}
                placeholder="yourstudio.com"
                helperText="https:// will be added automatically if not included"
              />

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Connection Methods * (Select all that apply)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CONNECTION_TYPES.map((connection) => (
                    <label
                      key={connection.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={connections[connection.id] || false}
                        onChange={() => toggleConnection(connection.id)}
                        className="mr-3 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {connection.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Studio Images *</h3>
              <p className="text-sm text-gray-600">Upload 1-5 high-quality images of your studio. Each image will be cropped to the optimal ratio.</p>
              
              {images.length < 5 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
                          {uploading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            'Select Image to Crop'
                          )}
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={handleImageSelect}
                          disabled={uploading || cropperOpen}
                          className="hidden"
                        />
              </label>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      PNG, JPG, WEBP up to 10MB • You'll crop each image before uploading
                    </p>
                  </div>
                </div>
              )}

              {images.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group border border-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={image.url}
                        alt={`Studio image ${index + 1}`}
                        className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                      >
                        <X className="w-4 h-4" />
                </button>
              </div>
                  ))}
                </div>
              )}

              {images.length === 0 && (
                <p className="text-sm text-red-600">At least 1 image is required</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t">
            <Button
              type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-lg font-semibold"
              loading={isLoading}
                disabled={isLoading || uploading}
            >
                Create My Profile!
            </Button>
            </div>
          </form>
        </div>
        )}
      </div>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        file={selectedFile}
        isOpen={cropperOpen}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
        aspect={25 / 12}
        maxWidth={2000}
        maxHeight={960}
      />
    </div>
  );
}
