// Firebase initialization for Pin-It Board.
//
// Config is loaded from Vite env vars (VITE_FIREBASE_*) so secrets-ish values
// aren't baked into git. For local dev, drop them into .env.local:
//
//   VITE_FIREBASE_API_KEY=...
//   VITE_FIREBASE_AUTH_DOMAIN=...
//   VITE_FIREBASE_PROJECT_ID=...
//   VITE_FIREBASE_APP_ID=...
//
// (Firebase web SDK config values are technically not secret — they identify
// the project, not authenticate it — but keeping them out of source control
// gives us flexibility to swap projects per environment.)
//
// If config is missing, the app falls back to local-only mode and sync.js
// no-ops gracefully. This lets the existing localStorage UX keep working
// without any cloud setup.

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
}

export const FIREBASE_CONFIGURED = Boolean(
  config.apiKey && config.projectId && config.appId
)

let app = null
let auth = null
let db = null
let currentUid = null
const uidWaiters = []

if (FIREBASE_CONFIGURED) {
  app = initializeApp(config)
  auth = getAuth(app)
  // Offline persistence so the board still loads when network is flaky.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  })

  // Anonymous auth — fire-and-track. UID becomes the stable identity for
  // this device until the user clears storage.
  signInAnonymously(auth).catch((err) => {
    console.error('[pin-it] Anonymous sign-in failed:', err)
  })

  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUid = user.uid
      uidWaiters.splice(0).forEach((resolve) => resolve(user.uid))
    } else {
      currentUid = null
    }
  })
} else {
  console.info(
    '[pin-it] Firebase not configured — running in local-only mode. ' +
      'Set VITE_FIREBASE_* in .env.local to enable cloud sync.'
  )
}

export { app, auth, db }

/**
 * Resolves to the current anonymous UID once auth completes. If Firebase
 * isn't configured, resolves to null immediately.
 */
export function getUid() {
  if (!FIREBASE_CONFIGURED) return Promise.resolve(null)
  if (currentUid) return Promise.resolve(currentUid)
  return new Promise((resolve) => uidWaiters.push(resolve))
}
