// Sentry crash & error reporting for Pin-It — Sticky Note Board.
//
// Initialized lazily and only when VITE_SENTRY_DSN is set, so dev runs and
// the App Store reviewer's first launch don't accidentally fire test events.
//
// We deliberately scope the SDK to "browser only" (no profiling/replay/etc.)
// to keep bundle weight down — pin-it is a small app and we mostly want
// crash visibility, not session recordings.

import * as Sentry from '@sentry/browser'

const dsn = import.meta.env.VITE_SENTRY_DSN

export function initSentry({ release, environment } = {}) {
  if (!dsn) {
    console.info('[pin-it] Sentry not configured (VITE_SENTRY_DSN unset).')
    return
  }
  Sentry.init({
    dsn,
    release: release || 'pin-it@unknown',
    environment: environment || 'production',
    // Don't send PII by default — pin-it has no accounts, but board content
    // could be personal. Stack traces only.
    sendDefaultPii: false,
    // Sample 100% of errors but 0% of performance traces (we don't need them).
    tracesSampleRate: 0
  })
}

export function captureError(err, context = {}) {
  if (!dsn) return
  Sentry.captureException(err, { extra: context })
}
