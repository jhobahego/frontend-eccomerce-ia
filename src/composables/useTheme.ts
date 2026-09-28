import { computed, ref } from 'vue'

export const THEME_STORAGE_KEY = 'tienda-ia-theme'

export type Theme = 'light' | 'dark'

// Shared module state: every consumer (header toggle, views, tests) observes
// the same value without needing a Pinia store for a purely presentational
// preference.
const theme = ref<Theme>('light')
let initialized = false

const isDark = computed(() => theme.value === 'dark')

function readStored(): Theme | null {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    return raw === 'light' || raw === 'dark' ? raw : null
  } catch {
    return null
  }
}

function readSystem(): Theme {
  try {
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark'
    }
  } catch {
    // jsdom and privacy-hardened browsers may lack matchMedia: stay light.
  }
  return 'light'
}

function apply(value: Theme): void {
  theme.value = value
  document.documentElement.classList.toggle('dark', value === 'dark')
  document.documentElement.style.colorScheme = value
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, value)
  } catch {
    // Private mode: the class still applies for this session.
  }
}

function setTheme(value: Theme): void {
  initialized = true
  apply(value)
}

function toggleTheme(): void {
  initialized = true
  apply(theme.value === 'dark' ? 'light' : 'dark')
}

/** Test-only escape hatch: resets module state between specs. */
export function resetThemeForTests(): void {
  initialized = false
  theme.value = 'light'
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = ''
  try {
    window.localStorage.removeItem(THEME_STORAGE_KEY)
  } catch {
    // Nothing to clean.
  }
}

export function useTheme(): {
  theme: typeof theme
  isDark: typeof isDark
  setTheme: (value: Theme) => void
  toggleTheme: () => void
} {
  if (!initialized) {
    initialized = true
    apply(readStored() ?? readSystem())
  }
  return { theme, isDark, setTheme, toggleTheme }
}
