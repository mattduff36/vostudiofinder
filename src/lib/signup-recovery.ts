/**
 * Signup State Recovery Utilities
 * 
 * Provides functions to store, retrieve, and recover signup state
 * across navigation and browser back button presses.
 */

export interface SignupData {
  userId: string;
  email: string;
  display_name: string;
  password?: string;
  username?: string;
  reservation_expires_at?: Date | null;
  timestamp?: number;
}

export interface PaymentRecoveryData {
  sessionId: string;
  email: string;
  username: string;
  display_name: string;
  userId: string;
}

const SIGNUP_DATA_KEY = 'signupData';
const SELECTED_USERNAME_KEY = 'selectedUsername';
const SESSION_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (matches reservation expiry)

/**
 * Store signup data in sessionStorage with timestamp
 */
export function storeSignupData(data: SignupData): void {
  try {
    const dataWithTimestamp = {
      ...data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(SIGNUP_DATA_KEY, JSON.stringify(dataWithTimestamp));
    console.log('✅ Signup data stored in sessionStorage');
  } catch (error) {
    console.error('❌ Failed to store signup data:', error);
  }
}

/**
 * Retrieve and validate signup data from sessionStorage
 */
export function getSignupData(): SignupData | null {
  try {
    const storedData = sessionStorage.getItem(SIGNUP_DATA_KEY);
    if (!storedData) {
      return null;
    }

    const data: SignupData = JSON.parse(storedData);

    // Validate required fields
    if (!data.userId || !data.email || !data.display_name) {
      console.warn('⚠️  Signup data missing required fields');
      return null;
    }

    // Check if data is expired
    if (data.timestamp) {
      const age = Date.now() - data.timestamp;
      if (age > SESSION_TIMEOUT_MS) {
        console.warn('⚠️  Signup data expired');
        clearSignupData();
        return null;
      }
    }

    return data;
  } catch (error) {
    console.error('❌ Failed to retrieve signup data:', error);
    return null;
  }
}

/**
 * Clear all signup-related data from sessionStorage
 */
export function clearSignupData(): void {
  try {
    sessionStorage.removeItem(SIGNUP_DATA_KEY);
    sessionStorage.removeItem(SELECTED_USERNAME_KEY);
    sessionStorage.removeItem('pendingUserId');
    console.log('✅ Signup data cleared from sessionStorage');
  } catch (error) {
    console.error('❌ Failed to clear signup data:', error);
  }
}

/**
 * Recover signup state from database using email
 */
export async function recoverSignupState(email: string): Promise<{
  success: boolean;
  data?: {
    userId: string;
    email: string;
    username: string | null;
    display_name: string;
    resumeStep: 'username' | 'payment' | 'profile';
    hasPayment: boolean;
    sessionId?: string | null;
  };
  error?: string;
}> {
  try {
    const response = await fetch('/api/auth/check-signup-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to recover signup state',
      };
    }

    const data = await response.json();

    if (!data.canResume) {
      return {
        success: false,
        error: data.message || 'Cannot resume signup',
      };
    }

    return {
      success: true,
      data: {
        userId: data.user.id,
        email: data.user.email,
        username: data.user.username,
        display_name: data.user.display_name,
        resumeStep: data.resumeStep,
        hasPayment: data.hasPayment,
        sessionId: data.sessionId,
      },
    };
  } catch (error) {
    console.error('❌ Failed to recover signup state:', error);
    return {
      success: false,
      error: 'Network error while recovering signup state',
    };
  }
}

/**
 * Recover payment state from database using email or userId
 */
export async function recoverPaymentState(identifier: { email?: string; userId?: string }): Promise<{
  success: boolean;
  data?: {
    sessionId: string;
    email: string;
    username: string;
    display_name: string;
    userId: string;
    paymentStatus: string;
  };
  error?: string;
}> {
  try {
    const response = await fetch('/api/auth/check-payment-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(identifier),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to recover payment state',
      };
    }

    const data = await response.json();

    if (!data.hasPayment || data.paymentStatus !== 'succeeded') {
      return {
        success: false,
        error: 'No successful payment found',
      };
    }

    if (!data.sessionId) {
      return {
        success: false,
        error: 'Payment found but session ID missing',
      };
    }

    return {
      success: true,
      data: {
        sessionId: data.sessionId,
        email: data.user.email,
        username: data.user.username || '',
        display_name: data.user.display_name,
        userId: data.user.id,
        paymentStatus: data.paymentStatus,
      },
    };
  } catch (error) {
    console.error('❌ Failed to recover payment state:', error);
    return {
      success: false,
      error: 'Network error while recovering payment state',
    };
  }
}

/**
 * Build URL with all necessary parameters for signup flow navigation
 */
export function buildSignupURL(
  path: string,
  params: {
    userId?: string;
    email?: string;
    name?: string;
    username?: string;
    session_id?: string;
  }
): string {
  const searchParams = new URLSearchParams();

  if (params.userId) searchParams.set('userId', params.userId);
  if (params.email) searchParams.set('email', params.email);
  if (params.name) searchParams.set('name', params.name);
  if (params.username) searchParams.set('username', params.username);
  if (params.session_id) searchParams.set('session_id', params.session_id);

  return `${path}?${searchParams.toString()}`;
}

/**
 * Update URL parameters without navigation (for state recovery)
 */
export function updateURLParams(params: Record<string, string>): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  window.history.replaceState({}, '', url.toString());
  console.log('✅ URL parameters updated');
}

