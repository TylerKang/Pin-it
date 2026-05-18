// Pin-It: A digital pegboard with sticky notes
import { generateSyncCode, getSyncCode, setSyncCode, exportBoardData, importBoardData } from './sync.js'

const COLORS = [
  '#FFF9C4', // yellow
  '#FFCDD2', // pink
  '#C8E6C9', // green
  '#BBDEFB', // blue
  '#E1BEE7', // lavender
  '#FFE0B2'  // peach
]

const GRID_SIZE = 250
const STORAGE_KEY = 'pin-it-notes'
const SYNC_CODE_KEY = 'pin-it-sync-code'

let notes = []
let currentColorIndex = 0
let selectedColor = COLORS[0]
let isDragging = false
let dragNoteId = null
let hasMoved = false
let isMobile = window.innerWidth < 768

// Infinite canvas pan state (desktop only)
let panX = 0
let panY = 0
let isPanning = false

// DOM Elements
const board = document.getElementById('board')
const addBtn = document.getElementById('add-btn')
const createModal = document.getElementById('create-modal')
const expandModal = document.getElementById('expand-modal')
const noteForm = document.getElementById('note-form')
const cancelBtn = document.getElementById('cancel-btn')
const closeExpandBtn = document.getElementById('close-expand')

// Settings Panel Elements
const settingsBtn = document.getElementById('settings-btn')
const settingsPanel = document.getElementById('settings-panel')
const settingsBackdrop = document.getElementById('settings-backdrop')
const closeSettingsBtn = document.getElementById('close-settings')
const syncCodeDisplay = document.getElementById('sync-code-display')
const copyCodeBtn = document.getElementById('copy-code-btn')
const importCodeInput = document.getElementById('import-code')
const importBtn = document.getElementById('import-btn')
const syncBtn = document.getElementById('sync-btn')
const syncStatus = document.getElementById('sync-status')

// Add note count span to header if not exists
function ensureNoteCountHeader() {
  let header = document.getElementById('note-count')
  if (!header) {
    header = document.createElement('span')
    header.id = 'note-count'
    // Insert after the pegboard title if exists, or prepend to body
    const title = document.querySelector('h1') || document.body.firstChild
    title?.after(header)
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  ensureNoteCountHeader()
  loadNotes()
  if (!isMobile) clampAllNotes()
  renderNotes()
  setupEventListeners()
  window.addEventListener('resize', handleResize)
})

function handleResize() {
  const wasMobile = isMobile
  isMobile = window.innerWidth < 768
  if (isMobile) {
    board.classList.add('mobile')
  } else {
    board.classList.remove('mobile')
    // De-overlap when returning to desktop
    if (wasMobile) clampAllNotes()
  }
  renderNotes()
}

function clampAllNotes() {
  let changed = false
  notes.forEach(note => {
    const free = findFreePosition(note.x, note.y, note.id)
    if (free.x !== note.x || free.y !== note.y) {
      note.x = free.x
      note.y = free.y
      changed = true
    }
  })
  if (changed) saveNotes()
}

function setupEventListeners() {
  addBtn.addEventListener('click', () => openModal(createModal))
  cancelBtn.addEventListener('click', () => closeModal(createModal))
  closeExpandBtn.addEventListener('click', () => closeModal(expandModal))
  
  noteForm.addEventListener('submit', handleFormSubmit)
  
  // Close modals on backdrop click
  ;[createModal, expandModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal)
    })
  })
  
  // Color picker
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelector('.color-dot.active').classList.remove('active')
      dot.classList.add('active')
      selectedColor = dot.dataset.color
    })
  })
  
  // Create modal dropzone
  const createDropzone = document.getElementById('create-dropzone')
  const createImageInput = document.getElementById('image')
  const createPreview = document.getElementById('create-image-preview')

  createDropzone.addEventListener('click', () => createImageInput.click())
  createDropzone.addEventListener('dragover', (e) => {
    e.preventDefault()
    createDropzone.classList.add('dragover')
  })
  createDropzone.addEventListener('dragleave', () => {
    createDropzone.classList.remove('dragover')
  })
  createDropzone.addEventListener('drop', (e) => {
    e.preventDefault()
    createDropzone.classList.remove('dragover')
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      createImageInput.files = e.dataTransfer.files
      showCreatePreview(e.dataTransfer.files[0])
    }
  })
  createImageInput.addEventListener('change', () => {
    if (createImageInput.files && createImageInput.files[0]) {
      showCreatePreview(createImageInput.files[0])
    }
  })

  // Board pan (desktop only) — click+drag on empty board area
  board.addEventListener('mousedown', (e) => {
    if (isMobile) return
    // Only pan if clicking the board/canvas background, not a note
    if (e.target !== board && !e.target.classList.contains('board-canvas')) return
    e.preventDefault()
    isPanning = true
    board.style.cursor = 'grabbing'
    const startX = e.clientX
    const startY = e.clientY
    const startPanX = panX
    const startPanY = panY

    function onMove(e) {
      panX = startPanX + (e.clientX - startX)
      panY = startPanY + (e.clientY - startY)
      applyPan()
    }

    function onUp() {
      isPanning = false
      board.style.cursor = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  })

  // Desktop canvas controls
  document.getElementById('center-view-btn').addEventListener('click', centerView)
  document.getElementById('center-cards-btn').addEventListener('click', centerAllCards)
  document.getElementById('see-all-btn').addEventListener('click', openSeeAllModal)
  document.getElementById('close-see-all').addEventListener('click', () => closeModal(document.getElementById('see-all-modal')))
  document.getElementById('see-all-modal').addEventListener('click', (e) => {
    if (e.target.id === 'see-all-modal') closeModal(e.target)
  })

  // Settings panel
  settingsBtn.addEventListener('click', openSettingsPanel)
  closeSettingsBtn.addEventListener('click', closeSettingsPanel)
  settingsBackdrop.addEventListener('click', closeSettingsPanel)
  copyCodeBtn.addEventListener('click', copySyncCode)
  importBtn.addEventListener('click', handleImport)
  syncBtn.addEventListener('click', handleSync)
}

function openModal(modal) {
  modal.classList.add('open')
  if (modal === createModal) {
    selectedColor = COLORS[currentColorIndex]
    document.querySelector('.color-dot.active').classList.remove('active')
    document.querySelector(`[data-color="${selectedColor}"]`).classList.add('active')
  }
}

function closeModal(modal) {
  modal.classList.remove('open')
}

function handleFormSubmit(e) {
  e.preventDefault()
  
  const title = document.getElementById('title').value.trim()
  const body = document.getElementById('body').value.trim()
  const imageInput = document.getElementById('image')
  
  if (!title) return
  
  const note = {
    id: Date.now().toString(),
    title,
    body,
    color: selectedColor,
    x: 0,
    y: 0,
    image: null,
    rotation: Math.floor(Math.random() * 7) - 3
  }
  
  // Handle image upload
  if (imageInput.files && imageInput.files[0]) {
    const reader = new FileReader()
    reader.onload = (event) => {
      note.image = event.target.result
      addNote(note)
      closeModal(createModal)
      resetForm()
    }
    reader.readAsDataURL(imageInput.files[0])
  } else {
    addNote(note)
    closeModal(createModal)
    resetForm()
  }
}

/**
 * Find the nearest free grid cell starting from (x, y).
 * Spirals outward checking right, down, left, up until an empty cell is found.
 * excludeId: skip this note when checking occupancy (the note being placed).
 */
function findFreePosition(x, y, excludeId) {
  const isOccupied = (cx, cy) => {
    return notes.some(n => n.id !== excludeId && n.x === cx && n.y === cy)
  }

  // Snap starting point to grid — no boundaries, infinite canvas
  x = Math.round(x / GRID_SIZE) * GRID_SIZE
  y = Math.round(y / GRID_SIZE) * GRID_SIZE

  if (!isOccupied(x, y)) return { x, y }

  // Spiral outward — board is infinite
  for (let radius = 1; radius < 50; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue
        const cx = x + dx * GRID_SIZE
        const cy = y + dy * GRID_SIZE
        // No boundary limits — infinite canvas
        if (!isOccupied(cx, cy)) return { x: cx, y: cy }
      }
    }
  }
  return { x, y }
}

function addNote(note) {
  // Position in center of current viewport (world coords = screen center - pan)
  const centerX = (window.innerWidth / 2) - panX - (GRID_SIZE / 2)
  const centerY = (window.innerHeight / 2) - panY - (GRID_SIZE / 2)
  const free = findFreePosition(centerX, centerY, note.id)
  note.x = free.x
  note.y = free.y

  notes.push(note)
  saveNotes()
  renderNotes()
  currentColorIndex = (currentColorIndex + 1) % COLORS.length
}

function resetForm() {
  noteForm.reset()
  document.getElementById('image').value = ''
  const preview = document.getElementById('create-image-preview')
  if (preview) preview.innerHTML = ''
  const dropzone = document.getElementById('create-dropzone')
  if (dropzone) dropzone.style.display = ''
}

function showCreatePreview(file) {
  const preview = document.getElementById('create-image-preview')
  const dropzone = document.getElementById('create-dropzone')
  if (!preview) return

  const reader = new FileReader()
  reader.onload = (ev) => {
    preview.innerHTML = `
      <div class="create-preview-wrapper">
        <img src="${ev.target.result}" alt="preview" />
        <button type="button" class="remove-image-btn" aria-label="Remove">&times;</button>
      </div>
    `
    dropzone.style.display = 'none'
    preview.querySelector('.remove-image-btn').addEventListener('click', () => {
      document.getElementById('image').value = ''
      preview.innerHTML = ''
      dropzone.style.display = ''
    })
  }
  reader.readAsDataURL(file)
}

function renderNotes() {
  board.innerHTML = ''
  
  // Update note count header
  const header = document.getElementById('note-count')
  if (header) {
    header.textContent = `${notes.length} note${notes.length !== 1 ? 's' : ''}`
  }
  
  // Show empty state if no notes
  if (notes.length === 0) {
    renderEmptyState()
    return
  }
  
  if (isMobile) {
    renderMobileNotes()
  } else {
    renderBoardNotes()
  }
}

function renderEmptyState() {
  const ghostNotes = document.createElement('div')
  ghostNotes.className = 'ghost-notes'
  ghostNotes.innerHTML = `
    <div class="ghost-note" style="--rotation: -4deg;"></div>
    <div class="ghost-note" style="--rotation: 3deg;"></div>
    <div class="ghost-note" style="--rotation: 2deg;"></div>
    <div class="ghost-note" style="--rotation: -2deg;"></div>
    <div class="ghost-note hint">
      <p>Click the + button to add your first note</p>
    </div>
  `
  board.appendChild(ghostNotes)
}

function applyPan() {
  const canvas = board.querySelector('.board-canvas')
  if (canvas) canvas.style.transform = `translate(${panX}px, ${panY}px)`
  // Pan all background grid layers together
  const pos = `${panX}px ${panY}px`
  board.style.backgroundPosition = `${pos}, ${pos}, ${pos}`
}

function renderBoardNotes() {
  const canvas = document.createElement('div')
  canvas.className = 'board-canvas'
  canvas.style.transform = `translate(${panX}px, ${panY}px)`

  notes.forEach((note, index) => {
    const noteEl = createNoteElement(note)
    noteEl.style.animationDelay = (index * 0.1) + 's'
    canvas.appendChild(noteEl)
  })
  board.appendChild(canvas)
}

function createNoteElement(note) {
  const div = document.createElement('div')
  // Handle rotation class names: -3,-2,-1,1,2,3 -> -3,-2,-1,1,2,3
  const rotationClass = note.rotation >= 0 ? `note-rotate-${note.rotation}` : `note-rotate--${Math.abs(note.rotation)}`
  div.className = `note ${rotationClass}`
  div.style.backgroundColor = note.color
  div.style.left = note.x + 'px'
  div.style.top = note.y + 'px'
  div.dataset.id = note.id
  
  div.innerHTML = `
    <div class="note-title">${escapeHtml(note.title)}</div>
    ${note.body ? `<div class="note-body">${escapeHtml(note.body)}</div>` : ''}
    ${note.image ? `<img class="note-image" src="${note.image}" alt="note image" />` : ''}
  `
  
  // Click to expand (not drag) - check hasMoved to distinguish click from drag
  div.addEventListener('click', (e) => {
    if (hasMoved) return
    openExpandModal(note)
  })
  
  // Drag events - mouse
  div.addEventListener('mousedown', (e) => {
    if (isMobile) return
    e.preventDefault()
    e.stopPropagation()
    startDrag(note.id, e)
  })
  
  // Touch events for tablets
  div.addEventListener('touchstart', (e) => {
    if (isMobile) return
    e.preventDefault()
    e.stopPropagation()
    startTouchDrag(note.id, e)
  })
  
  return div
}

function startDrag(id, e) {
  isDragging = true
  dragNoteId = id
  hasMoved = false
  
  const note = notes.find(n => n.id === id)
  if (!note) return
  
  const noteEl = document.querySelector(`[data-id="${id}"]`)
  noteEl.classList.add('dragging')
  
  // Calculate offset from cursor to note world position (account for pan)
  const offsetX = e.clientX - (note.x + panX)
  const offsetY = e.clientY - (note.y + panY)

  function moveDrag(e) {
    hasMoved = true
    // Convert screen coords to world coords
    note.x = e.clientX - offsetX - panX
    note.y = e.clientY - offsetY - panY
    noteEl.style.left = note.x + 'px'
    noteEl.style.top = note.y + 'px'
  }
  
  function stopDrag() {
    isDragging = false
    dragNoteId = null
    
    const note = notes.find(n => n.id === id)
    if (!note) return
    
    
    // Snap to grid only if actually moved
    if (hasMoved) {
      const free = findFreePosition(note.x, note.y, id)
      note.x = free.x
      note.y = free.y

      const noteEl = document.querySelector(`[data-id="${id}"]`)
      noteEl.classList.remove('dragging')
      noteEl.style.transition = 'left 0.2s ease, top 0.2s ease'
      noteEl.style.left = note.x + 'px'
      noteEl.style.top = note.y + 'px'

      // Remove transition after animation
      setTimeout(() => {
        noteEl.style.transition = ''
      }, 200)

      saveNotes()
    }
    
    document.removeEventListener('mousemove', moveDrag)
    document.removeEventListener('mouseup', stopDrag)

    // Reset hasMoved after the click event fires (click comes after mouseup)
    requestAnimationFrame(() => { hasMoved = false })
  }

  document.addEventListener('mousemove', moveDrag)
  document.addEventListener('mouseup', stopDrag)
}

// Touch drag support
function startTouchDrag(id, e) {
  isDragging = true
  dragNoteId = id
  hasMoved = false

  const note = notes.find(n => n.id === id)
  if (!note) return

  const noteEl = document.querySelector(`[data-id="${id}"]`)
  noteEl.classList.add('dragging')

  // Calculate offset from touch to note world position (account for pan)
  const touch = e.touches[0]
  const offsetX = touch.clientX - (note.x + panX)
  const offsetY = touch.clientY - (note.y + panY)

  function moveTouchDrag(e) {
    hasMoved = true
    const touch = e.touches[0]
    note.x = touch.clientX - offsetX - panX
    note.y = touch.clientY - offsetY - panY
    noteEl.style.left = note.x + 'px'
    noteEl.style.top = note.y + 'px'
  }
  
  function stopTouchDrag() {
    isDragging = false
    dragNoteId = null
    
    const note = notes.find(n => n.id === id)
    if (!note) return
    
    // Snap to nearest free grid cell
    const free = findFreePosition(note.x, note.y, id)
    note.x = free.x
    note.y = free.y

    const noteEl = document.querySelector(`[data-id="${id}"]`)
    noteEl.classList.remove('dragging')
    noteEl.style.transition = 'left 0.2s ease, top 0.2s ease'
    noteEl.style.left = note.x + 'px'
    noteEl.style.top = note.y + 'px'
    
    setTimeout(() => {
      noteEl.style.transition = ''
    }, 200)
    
    if (hasMoved) saveNotes()
    document.removeEventListener('touchmove', moveTouchDrag)
    document.removeEventListener('touchend', stopTouchDrag)
    requestAnimationFrame(() => { hasMoved = false })
  }

  document.addEventListener('touchmove', moveTouchDrag, { passive: false })
  document.addEventListener('touchend', stopTouchDrag)
}

function openExpandModal(note) {
  const modal = document.getElementById('expand-modal')
  const content = document.getElementById('expand-note')

  const renderExpandContent = () => {
    const noteData = notes.find(n => n.id === note.id)
    if (!noteData) return
    content.innerHTML = `
      <div class="expand-note-content">
        <div class="expand-section">
          <label class="expand-label">Title</label>
          <input class="expand-note-title" value="${escapeHtml(noteData.title)}" />
        </div>
        <div class="expand-section">
          <label class="expand-label">Notes</label>
          <textarea class="expand-note-body">${escapeHtml(noteData.body)}</textarea>
        </div>
        <div class="expand-section">
          <label class="expand-label">Attachment</label>
          ${noteData.image
            ? `<div class="expand-image-wrapper">
                <img class="expand-note-image" src="${noteData.image}" alt="note attachment" />
                <button class="remove-image-btn" aria-label="Remove attachment">&times;</button>
              </div>`
            : ''}
          <div class="dropzone" tabindex="0">
            <input type="file" class="expand-image-input" accept="image/*" />
            <div class="dropzone-icon">📎</div>
            <div class="dropzone-text">${noteData.image ? 'Replace attachment' : 'Drag and drop an image here'}</div>
            <div class="dropzone-hint">or click to browse files</div>
          </div>
        </div>
        <div class="expand-footer">
          <button class="expand-footer-btn delete">Delete note</button>
          <button class="expand-footer-btn save">Save</button>
        </div>
      </div>
    `

    // Wire remove image button
    const removeBtn = content.querySelector('.remove-image-btn')
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        noteData.image = null
        saveNotes()
        renderExpandContent()
      })
    }

    // Wire file input
    const imageInput = content.querySelector('.expand-image-input')
    const handleFile = (file) => {
      if (!file || !file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        noteData.image = ev.target.result
        saveNotes()
        renderExpandContent()
      }
      reader.readAsDataURL(file)
    }

    if (imageInput) {
      imageInput.addEventListener('change', () => {
        if (imageInput.files && imageInput.files[0]) handleFile(imageInput.files[0])
      })
    }

    // Wire drag and drop
    const dropzone = content.querySelector('.dropzone')
    if (dropzone) {
      dropzone.addEventListener('click', () => imageInput.click())

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault()
        dropzone.classList.add('dragover')
      })
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover')
      })
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault()
        dropzone.classList.remove('dragover')
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0])
        }
      })
    }

    // Wire footer buttons
    const saveBtn = content.querySelector('.expand-footer-btn.save')
    const deleteBtn = content.querySelector('.expand-footer-btn.delete')
    saveBtn.addEventListener('click', saveAndClose)
    deleteBtn.addEventListener('click', () => deleteNote(note.id))
  }

  // Save: read inputs, persist, close
  const saveAndClose = () => {
    const titleInput = content.querySelector('.expand-note-title')
    const bodyTextarea = content.querySelector('.expand-note-body')
    const noteData = notes.find(n => n.id === note.id)
    if (noteData && titleInput && bodyTextarea) {
      noteData.title = titleInput.value
      noteData.body = bodyTextarea.value
      saveNotes()
      renderNotes()
    }
    closeModal(modal)
  }

  renderExpandContent()

  closeExpandBtn.onclick = saveAndClose
  modal.onclick = (e) => {
    if (e.target === modal) saveAndClose()
  }

  openModal(modal)
}

function deleteNote(id) {
  notes = notes.filter(n => n.id !== id)
  saveNotes()
  closeModal(expandModal)
  renderNotes()
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

function loadNotes() {
  const data = localStorage.getItem(STORAGE_KEY)
  if (data) {
    notes = JSON.parse(data)
  }
}

// Mobile layout — simple vertical list
function renderMobileNotes() {
  const grid = document.createElement('div')
  grid.className = 'mobile-grid'

  notes.forEach((note, index) => {
    const item = document.createElement('div')
    item.className = 'mobile-note'
    item.style.backgroundColor = note.color
    item.dataset.index = index
    item.innerHTML = `
      <div class="note-title">${escapeHtml(note.title)}</div>
      ${note.body ? `<div class="note-body">${escapeHtml(note.body)}</div>` : ''}
      ${note.image ? `<img class="note-image" src="${note.image}" alt="note image" />` : ''}
    `
    item.addEventListener('click', () => openExpandModal(note))

    // Long-press to drag-reorder
    let holdTimer = null
    let isDragReorder = false

    item.addEventListener('touchstart', (e) => {
      isDragReorder = false
      holdTimer = setTimeout(() => {
        isDragReorder = true
        item.classList.add('mobile-dragging')
        startMobileReorder(index, item, grid, e)
      }, 400)
    }, { passive: true })

    item.addEventListener('touchmove', () => {
      if (!isDragReorder && holdTimer) {
        clearTimeout(holdTimer)
        holdTimer = null
      }
    }, { passive: true })

    item.addEventListener('touchend', () => {
      if (holdTimer) {
        clearTimeout(holdTimer)
        holdTimer = null
      }
    })

    grid.appendChild(item)
  })
  board.appendChild(grid)
}

function startMobileReorder(fromIndex, dragEl, grid, startEvent) {
  const cards = Array.from(grid.querySelectorAll('.mobile-note'))
  const rects = cards.map(c => c.getBoundingClientRect())

  function onMove(e) {
    e.preventDefault()
    const touch = e.touches[0]

    // Find which card we're over
    for (let i = 0; i < rects.length; i++) {
      if (i === fromIndex) continue
      const r = rects[i]
      if (touch.clientX >= r.left && touch.clientX <= r.right &&
          touch.clientY >= r.top && touch.clientY <= r.bottom) {
        // Swap in array
        const temp = notes[fromIndex]
        notes.splice(fromIndex, 1)
        notes.splice(i, 0, temp)
        saveNotes()
        renderNotes()
        return
      }
    }
  }

  function onEnd() {
    dragEl.classList.remove('mobile-dragging')
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('touchend', onEnd)
  }

  document.addEventListener('touchmove', onMove, { passive: false })
  document.addEventListener('touchend', onEnd)
}

// Canvas controls (desktop)
function centerView() {
  panX = 0
  panY = 0
  applyPan()
}

function centerAllCards() {
  if (notes.length === 0) return

  // Reset pan
  panX = 0
  panY = 0

  // Re-layout all notes in a compact grid centered in the viewport
  const cols = Math.ceil(Math.sqrt(notes.length))
  const totalW = cols * GRID_SIZE
  const rows = Math.ceil(notes.length / cols)
  const totalH = rows * GRID_SIZE

  // Starting position so the grid is centered
  const startX = Math.round((window.innerWidth - totalW) / 2 / GRID_SIZE) * GRID_SIZE
  const startY = Math.round((window.innerHeight - totalH) / 2 / GRID_SIZE) * GRID_SIZE

  notes.forEach((note, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    note.x = startX + col * GRID_SIZE
    note.y = startY + row * GRID_SIZE
  })

  saveNotes()
  renderNotes()
  applyPan()
}

function openSeeAllModal() {
  const modal = document.getElementById('see-all-modal')
  const grid = document.getElementById('see-all-grid')

  grid.innerHTML = ''
  notes.forEach(note => {
    const card = document.createElement('div')
    card.className = 'see-all-card'
    card.style.backgroundColor = note.color
    card.innerHTML = `
      <div class="note-title">${escapeHtml(note.title)}</div>
      ${note.body ? `<div class="note-body">${escapeHtml(note.body)}</div>` : ''}
      ${note.image ? `<img class="note-image" src="${note.image}" alt="" />` : ''}
    `
    card.addEventListener('click', () => {
      // Pan to this note and close modal
      panX = (window.innerWidth / 2) - note.x - (GRID_SIZE / 2)
      panY = (window.innerHeight / 2) - note.y - (GRID_SIZE / 2)
      closeModal(modal)
      renderNotes()
    })
    grid.appendChild(card)
  })

  openModal(modal)
}

// Settings Panel
function openSettingsPanel() {
  settingsPanel.classList.add('open')
  settingsBackdrop.classList.add('visible')

  // Generate sync code if we don't have one
  let code = getSyncCode()
  if (!code) {
    code = generateSyncCode()
    setSyncCode(code)
  }
  syncCodeDisplay.textContent = code
}

function closeSettingsPanel() {
  settingsPanel.classList.remove('open')
  settingsBackdrop.classList.remove('visible')
}

function copySyncCode() {
  const code = syncCodeDisplay.textContent
  if (!code || code === '------') return

  navigator.clipboard.writeText(code).then(() => {
    copyCodeBtn.textContent = 'Copied!'
    setTimeout(() => { copyCodeBtn.textContent = 'Copy Code' }, 1500)
  }).catch(() => {
    // Fallback for browsers without clipboard API
    copyCodeBtn.textContent = 'Copy failed'
    setTimeout(() => { copyCodeBtn.textContent = 'Copy Code' }, 1500)
  })
}

function handleImport() {
  const code = importCodeInput.value.trim().toUpperCase()
  if (!code || code.length !== 8) {
    showSyncStatus('Invalid code — must be 8 characters', 'error')
    return
  }

  // For now, store the import code locally. Real sync uses Firebase later.
  showSyncStatus('Import code saved. Sync not yet connected to backend.', 'local')
  importCodeInput.value = ''
}

function handleSync() {
  const code = getSyncCode()
  if (!code) {
    showSyncStatus('No sync code. Open settings to generate one.', 'error')
    return
  }

  // Export current board data (ready for Firebase push later)
  const data = exportBoardData(notes)
  localStorage.setItem('pin-it-board-data', JSON.stringify(data))
  showSyncStatus('Board data saved locally. Backend sync coming soon.', 'local')
}

function showSyncStatus(message, type) {
  syncStatus.className = `status-indicator ${type}`
  syncStatus.innerHTML = `<span class="status-dot"></span><span>${message}</span>`
  // Reset after a few seconds
  if (type !== 'local') {
    setTimeout(() => {
      syncStatus.className = 'status-indicator local'
      syncStatus.innerHTML = '<span class="status-dot"></span><span>Local only</span>'
    }, 3000)
  }
}

function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}