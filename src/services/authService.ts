// Authentication Service - Handles all Firebase Auth operations
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { COLLECTIONS } from '../constants';
import { User, SignupFormData, LoginFormData, ApiResponse } from '../types';
import { checkBackoff, checkRateLimit, registerBackoffFailure, resetBackoff } from '../utils';

const PASSWORD_RESET_RATE_LIMIT = {
  maxAttempts: 3,
  windowMs: 15 * 60 * 1000,
};

const VERIFICATION_EMAIL_RATE_LIMIT = {
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000,
};

const SIGN_IN_BACKOFF_CONFIG = {
  maxFailuresBeforeBackoff: 3,
  initialBackoffMs: 30 * 1000,
  maxBackoffMs: 15 * 60 * 1000,
};

const getRetryDelayText = (retryAfterMs: number): string => {
  const retryInSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  if (retryInSeconds >= 60) {
    const minutes = Math.ceil(retryInSeconds / 60);
    return `${minutes} minute(s)`;
  }
  return `${retryInSeconds} second(s)`;
};

/**
 * Sign up a new user with email and password
 */
export const signUp = async (data: SignupFormData): Promise<ApiResponse<User>> => {
  try {
    const { email, password, displayName } = data;
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Update display name
    await updateProfile(firebaseUser, { displayName });
    
    // Create user document in Firestore
    const userData: Omit<User, 'uid'> & { uid: string } = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName,
      photoURL: null,
      emailVerified: firebaseUser.emailVerified,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };
    
    await setDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid), {
      ...userData,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
    
    return {
      success: true,
      data: userData,
      message: 'Account created successfully',
    };
  } catch (error: any) {
    console.error('Sign up error:', error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code),
    };
  }
};

/**
 * Sign in existing user with email and password
 */
export const signIn = async (data: LoginFormData): Promise<ApiResponse<User>> => {
  try {
    const { email, password } = data;
    const normalizedEmail = email.trim().toLowerCase();
    const signInBackoffKey = `sign-in:${normalizedEmail}`;

    const backoff = checkBackoff(signInBackoffKey);
    if (backoff.blocked) {
      return {
        success: false,
        error: `Too many failed sign-in attempts. Please try again in ${getRetryDelayText(backoff.retryAfterMs)}.`,
      };
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    resetBackoff(signInBackoffKey);
    
    // Update last login time
    await setDoc(
      doc(db, COLLECTIONS.USERS, firebaseUser.uid),
      { lastLoginAt: serverTimestamp() },
      { merge: true }
    );
    
    const user: User = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };
    
    return {
      success: true,
      data: user,
      message: 'Signed in successfully',
    };
  } catch (error: any) {
    console.error('Sign in error:', error);

    const errorCode = error?.code || '';
    const credentialFailureCodes = [
      'auth/invalid-credential',
      'auth/wrong-password',
      'auth/user-not-found',
      'auth/invalid-email',
    ];

    if (credentialFailureCodes.includes(errorCode)) {
      const email = data.email.trim().toLowerCase();
      const signInBackoffKey = `sign-in:${email}`;
      const backoffResult = registerBackoffFailure(signInBackoffKey, SIGN_IN_BACKOFF_CONFIG);

      if (backoffResult.blocked) {
        return {
          success: false,
          error: `Too many failed sign-in attempts. Please try again in ${getRetryDelayText(backoffResult.retryAfterMs)}.`,
        };
      }
    }

    return {
      success: false,
      error: getAuthErrorMessage(errorCode),
    };
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<ApiResponse<null>> => {
  try {
    await firebaseSignOut(auth);
    return {
      success: true,
      message: 'Signed out successfully',
    };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return {
      success: false,
      error: 'Failed to sign out. Please try again.',
    };
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<ApiResponse<null>> => {
  try {
    const rateLimitResult = checkRateLimit(`reset-password:${email.toLowerCase()}`, PASSWORD_RESET_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      const retryMinutes = Math.max(1, Math.ceil(rateLimitResult.retryAfterMs / 60000));
      return {
        success: false,
        error: `Too many password reset attempts. Please wait ${retryMinutes} minute(s).`,
      };
    }

    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: 'Password reset email sent',
    };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code),
    };
  }
};

/**
 * Send email verification to current user
 */
export const sendVerificationEmail = async (): Promise<ApiResponse<null>> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return {
        success: false,
        error: 'No user is currently signed in.',
      };
    }

    if (user.emailVerified) {
      return {
        success: true,
        message: 'Email is already verified.',
      };
    }

    const rateLimitResult = checkRateLimit(`verify-email:${user.uid}`, VERIFICATION_EMAIL_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      const retryMinutes = Math.max(1, Math.ceil(rateLimitResult.retryAfterMs / 60000));
      return {
        success: false,
        error: `Too many verification email requests. Please wait ${retryMinutes} minute(s).`,
      };
    }

    await sendEmailVerification(user);

    return {
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    };
  } catch (error: any) {
    console.error('Send verification email error:', error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code),
    };
  }
};

/**
 * Update user's display name
 */
export const updateUserDisplayName = async (displayName: string): Promise<ApiResponse<null>> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');
    
    await updateProfile(user, { displayName });
    await setDoc(
      doc(db, COLLECTIONS.USERS, user.uid),
      { displayName, updatedAt: serverTimestamp() },
      { merge: true }
    );
    
    return {
      success: true,
      message: 'Display name updated',
    };
  } catch (error: any) {
    console.error('Update display name error:', error);
    return {
      success: false,
      error: 'Failed to update display name',
    };
  }
};

/**
 * Update user's email
 */
export const updateUserEmail = async (
  newEmail: string,
  currentPassword: string
): Promise<ApiResponse<null>> => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('No user logged in');
    
    // Re-authenticate user before sensitive operation
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    await updateEmail(user, newEmail);
    await setDoc(
      doc(db, COLLECTIONS.USERS, user.uid),
      { email: newEmail, updatedAt: serverTimestamp() },
      { merge: true }
    );
    
    return {
      success: true,
      message: 'Email updated successfully',
    };
  } catch (error: any) {
    console.error('Update email error:', error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code),
    };
  }
};

/**
 * Update user's password
 */
export const updateUserPassword = async (
  currentPassword: string,
  newPassword: string
): Promise<ApiResponse<null>> => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('No user logged in');
    
    // Re-authenticate user before sensitive operation
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    await updatePassword(user, newPassword);
    
    return {
      success: true,
      message: 'Password updated successfully',
    };
  } catch (error: any) {
    console.error('Update password error:', error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code),
    };
  }
};

/**
 * Subscribe to auth state changes
 */
export const subscribeToAuthState = (
  callback: (user: FirebaseUser | null) => void
) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

/**
 * Convert Firebase Auth error codes to user-friendly messages
 */
const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in or use a different email.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'This operation is not allowed. Please contact support.';
    case 'auth/weak-password':
      return 'Please choose a stronger password (at least 6 characters).';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign back in to perform this action.';
    default:
      return 'An error occurred. Please try again.';
  }
};
