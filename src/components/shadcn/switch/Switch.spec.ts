// @vitest-environment jsdom
/**
 * 回归测试：reka-ui 的 SwitchRoot / CheckboxRoot 只提供 modelValue 模型，
 * 本项目旧用法（v-model:checked / :checked+@update:checked）之前无法回写值。
 * 修复后两种模型都应正常工作。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'
import Switch from './Switch.vue'
import Checkbox from '../checkbox/Checkbox.vue'

function mount(render: () => any) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const app = createApp({ render })
  app.mount(el)
  return { el, app }
}

describe('Switch 模型兼容', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('v-model:checked 旧用法：点击后回写 true', async () => {
    const checked = ref(false)
    const { el, app } = mount(() =>
      h(Switch, { checked: checked.value, 'onUpdate:checked': (v: boolean) => { checked.value = v } }),
    )
    const btn = el.querySelector('button')!
    expect(btn.getAttribute('data-state')).toBe('unchecked')
    btn.click()
    await nextTick()
    expect(checked.value).toBe(true)
    expect(btn.getAttribute('data-state')).toBe('checked')
    app.unmount()
  })

  it('v-model 新用法（modelValue）：点击后回写 true', async () => {
    const enabled = ref(false)
    const { el, app } = mount(() =>
      h(Switch, { modelValue: enabled.value, 'onUpdate:modelValue': (v: boolean) => { enabled.value = v } }),
    )
    const btn = el.querySelector('button')!
    btn.click()
    await nextTick()
    expect(enabled.value).toBe(true)
    app.unmount()
  })

  it('disabled 时不响应点击', async () => {
    const checked = ref(false)
    const { el, app } = mount(() =>
      h(Switch, { checked: checked.value, disabled: true, 'onUpdate:checked': (v: boolean) => { checked.value = v } }),
    )
    const btn = el.querySelector('button')!
    btn.click()
    await nextTick()
    expect(checked.value).toBe(false)
    app.unmount()
  })
})

describe('Checkbox 模型兼容', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it(':checked + @update:checked 旧用法：点击后回写 true', async () => {
    const checked = ref(false)
    const { el, app } = mount(() =>
      h(Checkbox, { checked: checked.value, 'onUpdate:checked': (v: boolean) => { checked.value = v } }),
    )
    const btn = el.querySelector('button')!
    btn.click()
    await nextTick()
    expect(checked.value).toBe(true)
    expect(btn.getAttribute('data-state')).toBe('checked')
    app.unmount()
  })

  it('v-model 新用法（modelValue）：点击后回写 true', async () => {
    const checked = ref(false)
    const { el, app } = mount(() =>
      h(Checkbox, { modelValue: checked.value, 'onUpdate:modelValue': (v: boolean) => { checked.value = v } }),
    )
    const btn = el.querySelector('button')!
    btn.click()
    await nextTick()
    expect(checked.value).toBe(true)
    app.unmount()
  })
})
