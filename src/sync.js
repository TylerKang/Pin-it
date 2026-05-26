// Sync module for Pin-It — Sticky Note Board.
//
// Code-pair model over Firebase Anonymous Auth + Firestore, with per-note
// document storage so concurrent edits to different notes don't clobber
// each other.
//
// Storage shape:
//   /boards/{boardId}                      → { ownerUids[], createdAt, updatedAt }
//   /boards/{boardId}/notes/{noteId}       → serialized note + `order`
//   /syncCodes/{code}                      → ephemeral pairing ticket
//
// Conflict model:
//   - Whole-array writes are AVOIDED. Each save diffs against the last
//     known-published snapshot and emits only per-note writes/deletes.
//   - Two devices editing DIFFERENT notes → both succeed, no loss.
//   - Two devices editing the SAME note → last write wins on a per-field
//     basis. Server timestamp on `updatedAt` provides tiebreaking visibility.
//   - Two devices ADDING new notes → both succeed (different ids); the
//     `order` field gives stable display sort.
//
// Pairing flow:
//   Device A: generateShareCode() → /syncCodes/CODE { boardId: A's board }
//   Device B: pairWithCode(CODE)  → arrayUnion(B.uid) → /boards/{A}.ownerUids
//                                  → switches B's active board to A's
//
// When Firebase is not configured, every function becomes a no-op so the
// app keeps working in local-only mode.

import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
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
  if (boardId) localStorage.setItem(ACTIVE_BOARD_KEY, boardId)
  else localStorage.removeItem(ACTIVE_BOARD_KEY)
}

function notesCollectionRef(boardId) {
  return collection(db, 'boards', boardId, 'notes')
}

function noteDocRef(boardId, noteId) {
  return doc(db, 'boards', boardId, 'notes', String(noteId))
}

function serializeNote(n, indexFallback = 0) {
  return {
    id: String(n.id),
    title: n.title || '',
    body: n.body || '',
    color: n.color || '',
    x: typeof n.x === 'number' ? n.x : 0,
    y: typeof n.y === 'number' ? n.y : 0,
    image: n.image || null,
    rotation: typeof n.rotation === 'number' ? n.rotation : 0,
    order: typeof n.order === 'number' ? n.order : indexFallback
  }
}

// Stable string key used to detect "did this note change since last push?"
// Excludes updatedAt/updatedBy (server-stamped, not part of intent).
function noteFingerprint(n) {
  const s = serializeNote(n, 0)
  return JSON.stringify([s.id, s.title, s.body, s.color, s.x, s.y, s.image, s.rotation, s.order])
}

// ───── public API ───────────────────────────────────────────────────────

/**
 * Boot sync. Resolves once Anonymous Auth completes and the local board
 * doc (`/boards/{uid}`) is ensured to exist. Default active board = my UID.
 * Returns { uid, boardId } or null in local-only mode.
 *
 * Implementation note: we deliberately do NOT read /boards/{uid} first.
 * setDoc with merge:true + arrayUnion is idempotent — it creates the doc
 * with [uid] on first launch, or no-ops on subsequent launches (since
 * arrayUnion(self) on an array already containing self is a noop). This
 * sidesteps any read-permission edge cases on non-existent docs.
 */
export async function initSync() {
  if (!FIREBASE_CONFIGURED) return null
  const uid = await getUid()
  if (!uid) {
    console.warn('[pin-it] initSync: no UID — Anonymous Auth may be disabled.')
    return null
  }

  let active = getActiveBoardId()
  if (!active) {
    active = uid
    setActiveBoardId(active)
  }

  // Idempotent upsert. Rules:
  //   - Create branch (doc didn't exist): ownerUids resolves to [uid],
  //     matching the create rule's `ownerUids == [request.auth.uid]`.
  //   - Update branch (doc exists, we're already an owner): arrayUnion
  //     keeps other owners intact, satisfying the update rule's
  //     `request.resource.data.ownerUids.hasAll(other_owners)`.
  try {
    await setDoc(
      doc(db, 'boards', uid),
      {
        ownerUids: arrayUnion(uid),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    )
  } catch (err) {
    console.error('[pin-it] initSync: board upsert failed:', err)
    // Don't throw — let the app continue in degraded mode. The user-visible
    // sync flows will surface their own errors when invoked.
  }

  return { uid, boardId: active }
}

/**
 * Push a single note (create or update). Caller passes the note object;
 * we serialize and write it to /boards/{activeBoardId}/notes/{note.id}.
 */
export async function pushNote(note, indexFallback = 0) {
  if (!FIREBASE_CONFIGURED) return
  const uid = await getUid()
  if (!uid) return
  const boardId = getActiveBoardId() || uid
  const payload = {
    ...serializeNote(note, indexFallback),
    updatedAt: serverTimestamp(),
    updatedBy: uid
  }
  await setDoc(noteDocRef(boardId, note.id), payload, { merge: true })
}

/**
 * Delete a single note by id.
 */
export async function deleteNote(noteId) {
  if (!FIREBASE_CONFIGURED) return
  const uid = await getUid()
  if (!uid) return
  const boardId = getActiveBoardId() || uid
  await deleteDoc(noteDocRef(boardId, noteId))
}

/**
 * Subscribe to the active board's notes subcollection. `onChange(notes, meta)`
 * fires with the sorted notes array on every remote update.
 *
 * `meta.hasPendingWrites` is true when the snapshot reflects our own
 * unflushed local writes — caller should typically ignore those to avoid
 * round-trip thrash.
 */
export function subscribeNotes(onChange) {
  if (!FIREBASE_CONFIGURED) return () => {}
  let unsub = () => {}
  ;(async () => {
    const uid = await getUid()
    if (!uid) return
    const boardId = getActiveBoardId() || uid
    unsub = onSnapshot(notesCollectionRef(boardId), (snap) => {
      const notes = []
      snap.forEach((d) => notes.push(d.data()))
      notes.sort((a, b) => (a.order || 0) - (b.order || 0))
      onChange(notes, {
        boardId,
        hasPendingWrites: snap.metadata.hasPendingWrites,
        fromCache: snap.metadata.fromCache
      })
    })
  })()
  return () => unsub()
}

/**
 * One-shot read of all notes in the active board (used when first booting
 * a paired device to seed local state before the subscription warms up).
 */
export async function fetchAllNotes() {
  if (!FIREBASE_CONFIGURED) return []
  const uid = await getUid()
  if (!uid) return []
  const boardId = getActiveBoardId() || uid
  const snap = await getDocs(notesCollectionRef(boardId))
  const notes = []
  snap.forEach((d) => notes.push(d.data()))
  notes.sort((a, b) => (a.order || 0) - (b.order || 0))
  return notes
}

/**
 * Diff a current notes array against a fingerprint map of last-known
 * pushed state, and emit the right per-note writes/deletes. Returns the
 * new fingerprint map for the caller to retain.
 *
 * Caller pattern:
 *   const next = await syncDiff(notes, lastSnapshot)
 *   lastSnapshot = next
 */
export async function syncDiff(notes, lastFingerprints) {
  if (!FIREBASE_CONFIGURED) return new Map()
  const next = new Map()
  const tasks = []
  notes.forEach((n, i) => {
    const fp = noteFingerprint({ ...n, order: typeof n.order === 'number' ? n.order : i })
    next.set(String(n.id), fp)
    if (lastFingerprints.get(String(n.id)) !== fp) {
      tasks.push(pushNote(n, i))
    }
  })
  // Deletes
  lastFingerprints.forEach((_fp, id) => {
    if (!next.has(id)) tasks.push(deleteNote(id))
  })
  // Don't swallow errors here — let the caller react. Permission errors
  // in particular are signals that we should NOT then treat remote as
  // source of truth (would wipe local notes).
  await Promise.all(tasks)
  return next
}

/**
 * Build a fingerprint map from a notes array (used to seed lastSnapshot
 * after pulling remote state, so the next saveNotes() doesn't echo-push
 * everything back).
 */
export function fingerprintAll(notes) {
  const map = new Map()
  notes.forEach((n, i) => {
    map.set(String(n.id), noteFingerprint({ ...n, order: typeof n.order === 'number' ? n.order : i }))
  })
  return map
}

// ───── pairing ──────────────────────────────────────────────────────────

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
  if (!boardId || boardId === uid) return
  await updateDoc(doc(db, 'boards', boardId), {
    ownerUids: arrayRemove(uid)
  }).catch(() => {})
  setActiveBoardId(uid)
}

/**
 * Current paired state, for status display.
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
    if (snap.exists()) deviceCount = (snap.data().ownerUids || []).length
  } catch {}
  return {
    paired: deviceCount > 1 || !isOwnBoard,
    boardId,
    isOwnBoard,
    deviceCount
  }
}
