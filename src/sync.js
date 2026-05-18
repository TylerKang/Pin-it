// Sync module for Pin-It

const SYNC_CODE_KEY = 'pin-it-sync-code'
const BOARD_DATA_KEY = 'pin-it-board-data'

/**
 * Generate a random 8-character alphanumeric sync code
 */
export function generateSyncCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Avoid confusing chars
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Get the sync code from localStorage
 */
export function getSyncCode() {
  return localStorage.getItem(SYNC_CODE_KEY) || null
}

/**
 * Save sync code to localStorage
 */
export function setSyncCode(code) {
  localStorage.setItem(SYNC_CODE_KEY, code)
  return code
}

/**
 * Export board data for sync
 */
export function exportBoardData(notes) {
  return {
    notes: notes.map(n => ({
      id: n.id,
      title: n.title,
      body: n.body,
      color: n.color,
      x: n.x,
      y: n.y,
      image: n.image,
      rotation: n.rotation
    })),
    syncCode: getSyncCode(),
    updatedAt: Date.now()
  }
}

/**
 * Import and validate board data from sync
 */
export function importBoardData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid sync data')
  }
  
  if (!Array.isArray(data.notes)) {
    throw new Error('Invalid notes data')
  }
  
  // Validate each note
  const validNotes = data.notes.filter(note => {
    return note && typeof note === 'object' && note.id && note.title
  })
  
  return {
    notes: validNotes,
    syncCode: data.syncCode || null,
    updatedAt: data.updatedAt || Date.now()
  }
}