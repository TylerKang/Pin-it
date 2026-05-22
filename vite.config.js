import { defineConfig } from 'vite'

export default defineConfig({
  // Relative base for native wrappers (Capacitor / Electron load via file://
  // and need relative asset paths). The devsky umbrella deploy overrides this
  // on the CLI with `--base /apps/pin-it/` for the hosted web build, so both
  // pipelines coexist without conflict.
  base: './',
  server: {
    port: 3000,
    open: true
  }
})
