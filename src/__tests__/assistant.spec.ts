import { describe, it, expect, beforeEach } from 'vitest'

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import App from '../App.vue'
import AssistantPanel from '../components/AssistantPanel.vue'

function mountPanel(): ReturnType<typeof mount> {
  return mount(AssistantPanel, {
    global: {
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  })
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

describe('AssistantPanel (T011)', () => {
  it('declares unavailability honestly without promising answers', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('aún no está disponible')
    expect(wrapper.text()).not.toMatch(/responder|inteligencia artificial/i)
    expect(wrapper.find('input, textarea').exists()).toBe(false)
  })

  it('offers manual paths instead of inventing help', () => {
    const wrapper = mountPanel()
    const text = wrapper.text()
    expect(text).toContain('Buscar en el catálogo')
    expect(text).toContain('Ver tu cesta')
    expect(text).toContain('Entrar en tu cuenta')
  })

  it('closes from the button (Escape is pinned in e2e with a real browser)', async () => {
    const wrapper = mountPanel()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

describe('assistant shell entry (T011)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
  })

  it('shows a permanent launcher that opens the honest panel', async () => {
    const wrapper = mountShell()
    const launcher = wrapper.findAll('button').find((button) => button.text() === 'Asistente')
    expect(launcher?.exists()).toBe(true)
    await launcher?.trigger('click')
    expect(wrapper.text()).toContain('aún no está disponible')
  })
})
