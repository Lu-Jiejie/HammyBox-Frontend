<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed } from "vue"
import { Check } from "@lucide/vue"
import { CheckboxIndicator, CheckboxRoot } from "reka-ui"
import { cn } from '@/utils/shadcn'

/**
 * reka-ui 的 CheckboxRoot 只提供 modelValue / update:modelValue（v-model），
 * 并不存在 checked / update:checked。而 FileCardView 使用了 :checked + @update:checked，
 * 导致勾选事件永远无法回写。这里同时兼容两种模型：
 *   - 新版：v-model / v-model:modelValue / :model-value
 *   - 旧版：:checked + @update:checked
 */
const props = withDefaults(defineProps<{
  modelValue?: boolean | 'indeterminate' | null
  checked?: boolean
  disabled?: boolean
  id?: string
  name?: string
  value?: string | number | boolean
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
  'update:modelValue': [boolean | 'indeterminate']
  'update:checked': [boolean]
}>()

// 是否受控：任一模型被绑定即为受控模式；两者均未绑定时保持非受控
const hasModel = computed(() => props.checked !== undefined || props.modelValue !== undefined)

// 当前选中值：优先 checked（旧用法），回退 modelValue（新用法，默认 false）
const isChecked = computed(() => props.checked ?? props.modelValue ?? false)

// reka-ui 的 CheckboxRoot 只 emit update:modelValue，这里统一回写两种模型
function handleUpdate(v: boolean | 'indeterminate') {
  emit('update:modelValue', v)
  emit('update:checked', v === true)
}
</script>

<template>
  <CheckboxRoot
    data-slot="checkbox"
    :model-value="hasModel ? isChecked : undefined"
    :disabled="disabled"
    :id="id"
    :name="name"
    :value="value"
    :true-value="trueValue"
    :false-value="falseValue"
    @update:model-value="handleUpdate"
    :class="
      cn('peer border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50',
         props.class)"
  >
    <CheckboxIndicator
      data-slot="checkbox-indicator"
      class="grid place-content-center text-current transition-none"
    >
      <slot v-bind="{ checked: isChecked }">
        <Check class="size-3.5" />
      </slot>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>