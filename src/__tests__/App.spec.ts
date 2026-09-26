import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import App from '../App.vue'

describe('App', () => {
  it('renders the shell with navigation and a router outlet', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          RouterView: { template: '<div />' },
        },
      },
    })
    expect(wrapper.text()).toContain('Inicio')
    expect(wrapper.text()).toContain('Entrar')
    expect(wrapper.find('nav').exists()).toBe(true)
  })
})
