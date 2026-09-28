import { describe, it, expect } from 'vitest'

import axe from 'axe-core'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

const AccessibleSample = defineComponent({
  name: 'AccessibleSample',
  render() {
    return h('main', [
      h('h1', 'Muestra accesible'),
      h('img', { src: '/x.png', alt: 'Descripción de la imagen' }),
      h('label', { for: 'q' }, 'Buscar'),
      h('input', { id: 'q', type: 'search' }),
      h('button', { type: 'button' }, 'Añadir a la cesta'),
    ])
  },
})

const InaccessibleSample = defineComponent({
  name: 'InaccessibleSample',
  render() {
    return h('main', [h('img', { src: '/x.png' }), h('button', { type: 'button' })])
  },
})

describe('a11y sample gate (T001)', () => {
  it('reports zero violations on accessible markup', async () => {
    const wrapper = mount(AccessibleSample, { attachTo: document.body })
    const results = await axe.run(wrapper.element, {
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(results.violations).toEqual([])
    wrapper.unmount()
  })

  it('detects violations on inaccessible markup (control: the audit is not vacuous)', async () => {
    const wrapper = mount(InaccessibleSample, { attachTo: document.body })
    const results = await axe.run(wrapper.element, {
      rules: { 'color-contrast': { enabled: false } },
    })
    const ruleIds = results.violations.map((violation) => violation.id)
    expect(ruleIds).toContain('image-alt')
    wrapper.unmount()
  })
})
