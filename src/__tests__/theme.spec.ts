import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import App from '../App.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import { THEME_STORAGE_KEY, resetThemeForTests, useTheme } from '../composables/useTheme'

function stubSystemTheme(dark: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn<(query: string) => MediaQueryList>(
      (query: string) =>
        ({
          matches: query === '(prefers-color-scheme: dark)' ? dark : false,
          media: query,
          onchange: null,
          addListener: vi.fn<() => void>(),
          removeListener: vi.fn<() => void>(),
          addEventListener: vi.fn<() => void>(),
          removeEventListener: vi.fn<() => void>(),
          dispatchEvent: vi.fn<(event: Event) => boolean>(),
        }) as MediaQueryList,
    ),
  )
}

function mountShell(): ReturnType<typeof mount> {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', name: 'home', component: { template: '<div />' } }],
  })
  return mount(App, {
    global: {
      plugins: [pinia, router],
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        RouterView: { template: '<div />' },
      },
    },
  })
}

describe('useTheme', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    vi.unstubAllGlobals()
    resetThemeForTests()
  })

  it('starts in light mode without a stored preference', () => {
    const { theme, isDark } = useTheme()
    expect(theme.value).toBe('light')
    expect(isDark.value).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggles to dark and back, syncing the <html> class and storage', () => {
    const { toggleTheme, isDark } = useTheme()

    toggleTheme()
    expect(isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    toggleTheme()
    expect(isDark.value).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('restores the stored preference on init', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    const { theme, isDark } = useTheme()
    expect(theme.value).toBe('dark')
    expect(isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('falls back to the OS preference when nothing is stored', () => {
    stubSystemTheme(true)
    const { isDark } = useTheme()
    expect(isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})

describe('ThemeToggle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    vi.unstubAllGlobals()
    resetThemeForTests()
  })

  it('announces the opposite mode and toggles on click', async () => {
    const wrapper = mount(ThemeToggle)
    const button = wrapper.find('button')

    expect(button.attributes('aria-label')).toBe('Cambiar a modo oscuro')
    await button.trigger('click')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(button.attributes('aria-label')).toBe('Cambiar a modo claro')

    await button.trigger('click')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(button.attributes('aria-label')).toBe('Cambiar a modo oscuro')
  })

  it('appears in the app shell header', () => {
    const wrapper = mountShell()
    const toggle = wrapper.find('button[aria-label^="Cambiar a modo"]')
    expect(toggle.exists()).toBe(true)
  })
})
