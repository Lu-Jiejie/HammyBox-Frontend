<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed } from "vue"
import { SwitchRoot, SwitchThumb } from "reka-ui"
import { cn } from '@/utils/shadcn'

/**
 * reka-ui 的 SwitchRoot 只提供 modelValue / update:modelValue（v-model），
 * 并不存在 checked / update:checked。而本项目多处使用 v-model:checked（旧用法），
 * 导致绑定值永远无法回写（开关视觉能切换但状态不变）。
 * 这里同时兼容两种模型：
 *   - 新版：v-model / v-model:modelValue
 *   - 旧版：v-model:checked
 */
const props = withDefaults(defineProps<{
  modelValue?: boolean | null
  checked?: boolean
  disabled?: boolean
  id?: string
  name?: string
  value?: string
  trueValue?: boolean
  falseValue?: boolean
  class?: HTMLAttributes["class"]
}>(), {
  modelValue: undefined,
  checked: undefined,
  disabled: false,
  value: undefined,
  trueValue: undefined,
  falseValue: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [boolean]
  'update:checked': [boolean]
}>()

// 是否受控：任一模型被绑定即为受控模式；两者均未绑定时保持非受控
const hasModel = computed(() => props.checked !== undefined || props.modelValue !== undefined)

// 当前选中值：优先 checked（旧用法），回退 modelValue（新用法，默认 false）
const isChecked = computed(() => props.checked ?? props.modelValue ?? false)

// reka-ui 的 SwitchRoot 只 emit update:modelValue，这里统一回写两种模型
function handleUpdate(v: boolean) {
  emit('update:modelValue', v)
  emit('update:checked', v)
}
</script>

<template>
  <SwitchRoot
    data-slot="switch"
    :model-value="hasModel ? isChecked : undefined"
    :disabled="disabled"
    :id="id"
    :name="name"
    :value="value"
    :true-value="trueValue"
    :false-value="falseValue"
    @update:model-value="handleUpdate"
    :class="cn(
      'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50',
      props.class,
    )"
  >
    <SwitchThumb
      data-slot="switch-thumb"
      :class="cn('bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0')"
    >
      <slot name="thumb" v-bind="{ checked: isChecked }" />
    </SwitchThumb>
  </SwitchRoot>
</template>
