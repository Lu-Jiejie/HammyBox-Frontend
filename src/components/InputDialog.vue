<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { Input } from '@/components/shadcn/input'

interface Props {
  open: boolean
  title: string
  description?: string
  label?: string
  placeholder?: string
  modelValue: string
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'update:modelValue', value: string): void
  (e: 'confirm'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">
          {{ description }}
        </DialogDescription>
      </DialogHeader>
      <div class="py-4 space-y-4">
        <div class="space-y-2">
          <label v-if="label" class="text-sm font-medium">{{ label }}</label>
          <Input
            :model-value="modelValue"
            :placeholder="placeholder"
            @update:model-value="(val) => emit('update:modelValue', String(val))"
            @keyup.enter="emit('confirm')"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">
          {{ t('common.actions.cancel') }}
        </Button>
        <Button @click="emit('confirm')">
          {{ t('common.actions.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
