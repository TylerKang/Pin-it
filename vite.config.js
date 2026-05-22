import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))

export default defineConfig({
  // Relative base for native wrappers (Capacitor / Electron load via file://
  // and need relative asset paths). The devsky umbrella deploy overrides this
  // on the CLI with `--base /apps/pin-it/` for the hosted web build, so both
  // pipelines coexist without conflict.
  base: './',
  // Inject package version at build time so Sentry release tagging matches
  // the shipped binary.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  server: {
    port: 3000,
    open: true
  }
})
