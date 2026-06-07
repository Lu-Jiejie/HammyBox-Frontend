<script setup lang="ts">
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shadcn/tooltip'

interface Props {
  content: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  /**
   * 是否把 tooltip 触发合并到插槽根元素上（as-child）。
   * - true（默认）：要求插槽根是单个可转发 props/ref 的 DOM 元素（如 Button），无多余 DOM、焦点也能触发。
   * - false：插槽根是 provider 组件（如 DropdownMenu/DialogRoot 等无法转发 as-child 的根）时使用，
   *   由 Hint 渲染一个 `as` 包裹元素作为触发器。
   */
  asChild?: boolean
  /** asChild=false 时包裹触发元素的标签，默认 span（行内，避免按钮等交互元素非法嵌套）。 */
  as?: string
}

withDefaults(defineProps<Props>(), {
  side: 'top',
  align: 'center',
  asChild: true,
  as: 'span',
})
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger v-if="asChild" as-child>
        <slot />
      </TooltipTrigger>
      <TooltipTrigger v-else :as="as" class="inline-flex w-fit">
        <slot />
      </TooltipTrigger>

      <TooltipContent :side="side" :align="align">
        <p>{{ content }}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
