// Electron main process for Pin-It — Sticky Note Board (macOS wrapper).
//
// Loads dist/index.html (the Vite build output) inside a BrowserWindow.
// Same approach as BasicClock, with both-knobs productName fix:
//   - package.json top-level productName       → drives app.name → menu label
//   - package.json build.productName            → drives Info.plist → Finder/Dock
//
// The renderer process runs the existing vanilla JS app unchanged.
const { app, BrowserWindow, Menu, shell } = require('electron')
const path = require('path')

let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // sandbox: true would block Firebase IndexedDB persistence; keep default
    }
  })

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  // External links open in the system browser, not inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // Build the macOS application menu. The first item's label comes from
  // app.name, which Electron reads from the bundled package.json top-level
  // productName. This is what shows up as "About <name>" / "Quit <name>".
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  // Standard macOS behavior — keep the app alive until ⌘Q.
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
