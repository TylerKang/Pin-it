// Sync module for Pin-It — Sticky Note Board.
//
// Code-pair model over Firebase Anonymous Auth + Firestore.
//
// Each anonymous user owns one board document at /boards/{uid}, and the
// app reads/writes to whichever board is currently active (defaults to
// the user's own; switches to a paired board after pairing).
//
// Pairing flow:
//   Device A: generateShareCode() → writes a /syncCodes/{CODE} doc that
//             points at A's board, valid for 10 minutes, single-use.
//   Device B: pairWithCode(CODE)  → reads /syncCodes/{CODE}, atomically
//             adds B's UID to /boards/{boardId}.ownerUids, marks the code
//             used, and switches B's active board to A's.
//
// When Firebase is not configured, every function becomes a no-op that
// returns sensible local-only results so the rest of the app keeps working.

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Timestamp,
  runTransaction
} from 'firebase/firestore'
import { FIREBASE_CONFIGURED, db, getUid } from './firebase.js'

const ACTIVE_BOARD_KEY = 'pin-it-active-board'
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/I/1
const CODE_LEN = 6
const CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes

// ───── local helpers ────────────────────────────────────────────────────

function randomCode() {
  let out = ''
  for (let i = 0; i < CODE_LEN; i++) {
    out += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length))
  }
  return out
}

function getActiveBoardId() {
  return localStorage.getItem(ACTIVE_BOARD_KEY) || null
}

function setActiveBoardId(boardId) {
  if (boardId) {
    localStorage.setItem(ACTIVE_BOARD_KEY, boardId)
  } else {
    localStorage.removeItem(ACTIVE_BOARD_KEY)
  }
}

// ───── public API ───────────────────────────────────────────────────────

/**
 * Boot sync. Resolves once Anonymous Auth completes and the local board
 * doc (`/boards/{uid}`) is ensured to exist. Defaults active board to
 * the user's own UID.
 *
 * Returns { uid, boardId } or null if Firebase isn't configured.
 */
export async function initSync() {
  if (!FIREBASE_CONFIGURED) return null

  const uid = await getUid()
  if (!uid) return null

  // Default active board = my own board (first launch)
  let active = getActiveBoardId()
  if (!active) {
    active = uid
    setActiveBoardId(active)
  }

  // Ensure my own board document exists. (We always own /boards/{uid};
  // even if currently joined to someone else's, our own stays.)
  const myBoardRef = doc(db, 'boards', uid)
  const snap = await getDoc(myBoardRef)
  if (!snap.exists()) {
    await setDoc(myBoardRef, {
      ownerUids: [uid],
      notes: [],
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    })
  }

  return { uid, boardId: active }
}

/**
 * Push the current notes array up to the active board.
 * No-op in local-only mode.
 */
export async function pushBoard(notes) {
  if (!FIREBASE_CONFIGURED) return
  const uid = await getUid()
  if (!uid) return
  const boardId = getActiveBoardId() || uid
  const ref = doc(db, 'boards', boardId)
  await updateDoc(ref, {
    notes: notes.map(serializeNote),
    updatedAt: serverTimestamp()
  }).catch((err) => {
    // If the doc doesn't exist yet (race on first launch), create it.
    if (err.code === 'not-found') {
      return setDoc(ref, {
        ownerUids: [uid],
        notes: notes.map(serializeNote),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      })
    }
    throw err
  })
}

/**
 * Subscribe to remote changes to the active board. `onChange(notes, meta)`
 * fires every time the board doc updates remotely (or locally — Firestore
 * dispatches both with metadata.hasPendingWrites).
 *
 * Returns an unsubscribe function, or a no-op if Firebase isn't configured.
 */
export function subscribeBoard(onChange) {
  if (!FIREBASE_CONFIGURED) return () => {}
  let unsub = () => {}
  ;(async () => {
    const uid = await getUid()
    if (!uid) return
    const boardId = getActiveBoardId() || uid
    const ref = doc(db, 'boards', boardId)
    unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return
      const data = snap.data()
      onChange(data.notes || [], {
        ownerUids: data.ownerUids || [],
        boardId,
        fromCache: snap.metadata.fromCache,
        hasPendingWrites: snap.metadata.hasPendingWrites
      })
    })
  })()
  return () => unsub()
}

/**
 * Generate a fresh single-use pairing code that points at this device's
 * active board. Returns { code, expiresAt }.
 */
export async function generateShareCode() {
  if (!FIREBASE_CONFIGURED) {
    throw new Error('Sync unavailable — Firebase not configured.')
  }
  const uid = await getUid()
  if (!uid) throw new Error('Not signed in yet.')
  const boardId = getActiveBoardId() || uid
  const code = randomCode()
  const expiresAtMs = Date.now() + CODE_TTL_MS
  await setDoc(doc(db, 'syncCodes', code), {
    boardId,
    createdBy: uid,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(expiresAtMs),
    used: false
  })
  return { code, expiresAt: new Date(expiresAtMs) }
}

/**
 * Redeem a pairing code. Joins this device's UID to the board the code
 * points at, marks the code used, and switches the active board locally.
 *
 * Returns { boardId, deviceCount }.
 * Throws if code is missing, expired, already used, or write fails.
 */
export async function pairWithCode(rawCode) {
  if (!FIREBASE_CONFIGURED) {
    throw new Error('Sync unavailable — Firebase not configured.')
  }
  const code = (rawCode || '').trim().toUpperCase()
  if (code.length !== CODE_LEN) {
    throw new Error(`Code must be ${CODE_LEN} characters.`)
  }
  const uid = await getUid()
  if (!uid) throw new Error('Not signed in yet.')

  const codeRef = doc(db, 'syncCodes', code)
  const boardId = await runTransaction(db, async (tx) => {
    const codeSnap = await tx.get(codeRef)
    if (!codeSnap.exists()) throw new Error('Code not found.')
    const c = codeSnap.data()
    if (c.used) throw new Error('Code already used.')
    if (c.expiresAt && c.expiresAt.toMillis() < Date.now()) {
      throw new Error('Code expired.')
    }
    const boardRef = doc(db, 'boards', c.boardId)
    const boardSnap = await tx.get(boardRef)
    if (!boardSnap.exists()) throw new Error('Board not found.')

    tx.update(boardRef, { ownerUids: arrayUnion(uid) })
    tx.update(codeRef, { used: true, usedBy: uid, usedAt: serverTimestamp() })
    return c.boardId
  })

  setActiveBoardId(boardId)
  // Caller should reload notes via subscribeBoard after this resolves.
  const boardSnap = await getDoc(doc(db, 'boards', boardId))
  const data = boardSnap.data() || {}
  return { boardId, deviceCount: (data.ownerUids || []).length }
}

/**
 * Leave the currently-paired board and return to this device's own board.
 * If already on own board, no-op.
 */
export async function unpair() {
  if (!FIREBASE_CONFIGURED) return
  const uid = await getUid()
  if (!uid) return
  const boardId = getActiveBoardId()
  if (!boardId || boardId === uid) return // already on own board

  // Remove my UID from the joined board's owners.
  await updateDoc(doc(db, 'boards', boardId), {
    ownerUids: arrayRemove(uid)
  }).catch(() => {})

  setActiveBoardId(uid)
}

/**
 * Current paired state, for status display.
 * { paired: boolean, boardId, isOwnBoard, deviceCount? }
 */
export async function getPairedState() {
  if (!FIREBASE_CONFIGURED) {
    return { paired: false, boardId: null, isOwnBoard: true }
  }
  const uid = await getUid()
  if (!uid) return { paired: false, boardId: null, isOwnBoard: true }
  const boardId = getActiveBoardId() || uid
  const isOwnBoard = boardId === uid
  let deviceCount = 1
  try {
    const snap = await getDoc(doc(db, 'boards', boardId))
    if (snap.exists()) {
      deviceCount = (snap.data().ownerUids || []).length
    }
  } catch {}
  return {
    paired: deviceCount > 1 || !isOwnBoard,
    boardId,
    isOwnBoard,
    deviceCount
  }
}

// ───── note (de)serialization ───────────────────────────────────────────

function serializeNote(n) {
  return {
    id: n.id,
    title: n.title || '',
    body: n.body || '',
    color: n.color || '',
    x: n.x || 0,
    y: n.y || 0,
    image: n.image || null,
    rotation: n.rotation || 0
  }
}
