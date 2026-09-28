import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './assets/index.css'
import App from './App.vue'
import router from './router'
import { useSessionStore } from './stores/session'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Session bootstrap owned by T003, settled before installing the router
// (T005): install starts the initial navigation, so a stored refresh must
// resolve first — otherwise a reload would bounce an authenticated visitor
// to login before restore finishes. Without a stored token this is immediate.
try {
  await useSessionStore().restore()
} catch {
  // Unexpected boot failure (neither expired nor offline): stay anonymous
  // instead of white-screening; views report API failures individually.
}

app.use(router)

app.mount('#app')
