// Real Firebase SDK implementation - supports Emulator
// Firebase configuration should be set in .env.local
// Reference .env.local.example for setup
//
// Note: Even with Emulator, Firebase Analytics/Installations needs properly formatted API key
// Firebase SDK validates API key format (must look like AIzaSy... prefix)
// In Emulator mode, API key doesn't need to be real, but format must be correct

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, connectAuthEmulator, Auth } from 'firebase/auth'
import { getFirestore, Firestore, initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics'

// Check if using Emulator (defined early for config)
const USE_EMULATOR_CONFIG = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' ||
                            process.env.NODE_ENV === 'development'

// Firebase configuration - read from environment variables
// When using Emulator, use demo project ID to ensure proper routing
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDummyApiKeyForEmulatorUseOnly',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'localhost',
  // IMPORTANT: Use demo-project for emulator to avoid routing to real Firebase
  projectId: USE_EMULATOR_CONFIG ? 'demo-project' : (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project'),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-bucket',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1234567890:web:abcd1234',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-ABCD1234'
}

// USE_EMULATOR is now USE_EMULATOR_CONFIG (defined above)
const USE_EMULATOR = USE_EMULATOR_CONFIG

console.log('[Firebase] USE_EMULATOR:', USE_EMULATOR, 'projectId:', firebaseConfig.projectId)

// Track emulator connection status to prevent duplicate connections
let emulatorConnected = false

// Initialize Firebase instances
let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined
let googleProvider: GoogleAuthProvider | undefined
let analytics: Analytics | null = null

/**
 * Check if running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Initialize Firebase for client-side use
 */
function initializeFirebaseClient(): void {
  if (!isBrowser()) {
    return
  }

  try {
    // Initialize or get existing app
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig)
      console.log('[Firebase] App initialized')
    } else {
      app = getApp()
      console.log('[Firebase] Using existing app')
    }

    // Initialize Auth
    if (!auth) {
      auth = getAuth(app)
    }

    // Initialize Google Provider
    if (!googleProvider) {
      googleProvider = new GoogleAuthProvider()
    }

    // Connect to Emulators in development (only once)
    // IMPORTANT: Must connect Auth emulator BEFORE Firestore initialization
    if (USE_EMULATOR && !emulatorConnected) {
      console.log('[Firebase] Connecting to Emulators...')
      try {
        // Connect Auth Emulator first
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
        console.log('[Firebase] Connected to Auth Emulator (127.0.0.1:9099)')
        emulatorConnected = true
      } catch (emulatorError: any) {
        if (emulatorError.message?.includes('already')) {
          console.log('[Firebase] Auth Emulator already connected')
        } else {
          console.warn('[Firebase] Auth Emulator connection warning:', emulatorError.message)
        }
        emulatorConnected = true
      }
    } else if (!USE_EMULATOR) {
      console.log('[Firebase] Using production Firebase services')
    }

    // Initialize Firestore
    // For Emulator mode, use experimentalForceLongPolling to avoid WebChannel 405 errors
    if (!db) {
      if (USE_EMULATOR) {
        // Use initializeFirestore with long polling settings first
        db = initializeFirestore(app, {
          experimentalForceLongPolling: true,
          experimentalAutoDetectLongPolling: false
        })
        // Then connect to emulator using official API
        connectFirestoreEmulator(db, '127.0.0.1', 8080)
        console.log('[Firebase] Firestore connected to emulator (127.0.0.1:8080, long polling)')
      } else {
        db = getFirestore(app)
      }
    }

    console.log('[Firebase] Initialization complete')

  } catch (error) {
    console.error('[Firebase] Initialization failed:', error)
    throw error
  }
}

// Initialize on module load (client-side only)
if (isBrowser()) {
  initializeFirebaseClient()
}

/**
 * Get Firebase Auth instance
 * Returns undefined on server-side
 */
export function getFirebaseAuth(): Auth | undefined {
  if (!isBrowser()) {
    console.log('[Firebase] Auth not available on server-side')
    return undefined
  }
  if (!auth) {
    initializeFirebaseClient()
  }
  return auth
}

/**
 * Get Firestore instance
 * Returns undefined on server-side
 */
export function getFirestoreDb(): Firestore | undefined {
  if (!isBrowser()) {
    console.log('[Firebase] Firestore not available on server-side')
    return undefined
  }
  if (!db) {
    initializeFirebaseClient()
  }
  return db
}

/**
 * Get Google Auth Provider
 */
export function getGoogleProvider(): GoogleAuthProvider | undefined {
  if (!isBrowser()) {
    return undefined
  }
  if (!googleProvider) {
    initializeFirebaseClient()
  }
  return googleProvider
}

/**
 * Get Firebase Analytics instance (client-side only)
 */
export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (!isBrowser()) {
    return null
  }

  if (analytics) {
    return analytics
  }

  // Skip analytics in emulator mode
  if (USE_EMULATOR) {
    console.log('[Firebase] Analytics skipped in emulator mode')
    return null
  }

  try {
    const supported = await isSupported()
    if (supported && app) {
      analytics = getAnalytics(app)
      console.log('[Firebase] Analytics initialized')
      return analytics
    }
    console.log('[Firebase] Analytics not supported in this environment')
    return null
  } catch (error) {
    console.error('[Firebase] Failed to get analytics:', error)
    return null
  }
}

// Export Firebase Auth functions
export {
  signInWithPopup,
  signOut,
  onAuthStateChanged
}

// Re-export Firestore functions for convenience
export {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
  onSnapshot
} from 'firebase/firestore'

// Re-export Unsubscribe type
export type { Unsubscribe } from 'firebase/firestore'
