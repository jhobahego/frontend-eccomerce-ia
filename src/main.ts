import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useSessionStore } from './stores/session'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Session bootstrap owned by T003: a stored refresh token resumes silently;
// without one this resolves quietly and the visitor stays anonymous.
void useSessionStore().restore()

app.mount('#app')
