<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/shadcn/button'
import TagBadge from '@/components/TagBadge.vue'
import { useAppStore } from '@/stores'

export type FileTypeFilter = 'all' | 'image' | 'video' | 'audio' | 'other'
export type AccessStatusFilter = 'all' | 'normal' | 'blocked'

interface Props {
  fileType: FileTypeFilter
  accessStatus: AccessStatusFilter
  channels: string[]
  channelOptions: string[]
  tags: string[]
  tagOptions: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:fileType', v: FileTypeFilter): void
  (e: 'update:accessStatus', v: AccessStatusFilter): void
  (e: 'update:channels', v: string[]): void
  (e: 'update:tags', v: string[]): void
  (e: 'clear'): void
}>()

const { t } = useI18n()
const store = useAppStore()

const fileTypes: Array<{ value: FileTypeFilter, label: string, icon: string }> = [
  { value: 'all', label: t('pages.files.filter.fileType.all'), icon: 'i-lucide-files' },
  { value: 'image', label: t('pages.files.filter.fileType.image'), icon: 'i-lucide-image' },
  { value: 'video', label: t('pages.files.filter.fileType.video'), icon: 'i-lucide-video' },
  { value: 'audio', label: t('pages.files.filter.fileType.audio'), icon: 'i-lucide-music' },
  { value: 'other', label: t('pages.files.filter.fileType.other'), icon: 'i-lucide-file' },
]

const accessStatuses: Array<{ value: AccessStatusFilter, label: string, icon: string }> = [
  { value: 'all', label: t('pages.files.filter.access.all'), icon: 'i-lucide-circle-dot' },
  { value: 'normal', label: t('pages.files.filter.access.normal'), icon: 'i-lucide-circle-check' },
  { value: 'blocked', label: t('pages.files.filter.access.blocked'), icon: 'i-lucide-shield-off' },
]

function toggleChannel(ch: string) {
  const next = props.channels.includes(ch)
    ? props.channels.filter(c => c !== ch)
    : [...props.channels, ch]
  emit('update:channels', next)
}

function toggleTag(tag: string) {
  const next = props.tags.includes(tag)
    ? props.tags.filter(t => t !== tag)
    : [...props.tags, tag]
  emit('update:tags', next)
}
</script>

<template>
  <div class="p-2 flex flex-col gap-4">
    <!-- 清空 -->
    <div class="flex items-center justify-between">
      <div class="text-xs text-muted-foreground font-medium">
        {{ t('pages.files.filter.options') }}
      </div>
      <Button variant="ghost" size="sm" class="text-xs text-muted-foreground px-2 h-6" @click="emit('clear')">
        <div class="i-lucide-rotate-ccw mr-1" style="width: 12px; height: 12px;" />
        {{ t('pages.files.filter.clear') }}
      </Button>
    </div>

    <!-- 文件类型 -->
    <div class="flex flex-col gap-1.5">
      <div class="text-[11px] text-muted-foreground/70 tracking-wide uppercase">
        {{ t('pages.files.filter.fileType.title') }}
      </div>
      <div class="flex flex-wrap gap-1.5">
        <Button
          v-for="ft in fileTypes"
          :key="ft.value"
          variant="outline"
          size="sm"
          class="text-xs px-2 h-7"
          :class="fileType === ft.value ? 'border-primary bg-primary/15 text-foreground ring-1 ring-primary/60' : 'text-muted-foreground hover:text-foreground'"
          @click="emit('update:fileType', ft.value)"
        >
          <div :class="ft.icon" style="width: 13px; height: 13px;" />
          {{ ft.label }}
        </Button>
      </div>
    </div>

    <!-- 访问状态 -->
    <div class="flex flex-col gap-1.5">
      <div class="text-[11px] text-muted-foreground/70 tracking-wide uppercase">
        {{ t('pages.files.filter.access.title') }}
      </div>
      <div class="flex flex-wrap gap-1.5">
        <Button
          v-for="as in accessStatuses"
          :key="as.value"
          variant="outline"
          size="sm"
          class="text-xs px-2 h-7"
          :class="accessStatus === as.value ? 'border-primary bg-primary/15 text-foreground ring-1 ring-primary/60' : 'text-muted-foreground hover:text-foreground'"
          @click="emit('update:accessStatus', as.value)"
        >
          <div :class="as.icon" style="width: 13px; height: 13px;" />
          {{ as.label }}
        </Button>
      </div>
    </div>

    <!-- 渠道（当前页多选） -->
    <div class="flex flex-col gap-1.5">
      <div class="text-[11px] text-muted-foreground/70 tracking-wide uppercase">
        {{ t('pages.files.filter.channel.title') }}
      </div>
      <div v-if="channelOptions.length > 0" class="flex flex-wrap gap-1.5">
        <Button
          v-for="ch in channelOptions"
          :key="ch"
          variant="outline"
          size="sm"
          class="text-xs px-2 h-6"
          :class="channels.includes(ch) ? 'border-primary bg-primary/15 text-foreground ring-1 ring-primary/60' : 'text-muted-foreground hover:text-foreground'"
          @click="toggleChannel(ch)"
        >
          <div class="i-lucide-tower-control" style="width: 12px; height: 12px;" />
          {{ ch }}
        </Button>
      </div>
      <div v-else class="text-xs text-muted-foreground/60">
        {{ t('pages.files.filter.channel.empty') }}
      </div>
    </div>

    <!-- 标签（当前页多选，AND） -->
    <div class="flex flex-col gap-1.5">
      <div class="text-[11px] text-muted-foreground/70 tracking-wide uppercase">
        {{ t('pages.files.filter.tags.title') }}
      </div>
      <div v-if="tagOptions.length > 0" class="flex flex-wrap gap-1.5">
        <TagBadge
          v-for="tag in tagOptions"
          :key="tag"
          :tag="tag"
          :color="store.getTagColor(tag)"
          clickable
          :class="tags.includes(tag) ? 'ring-2 ring-primary/60 ring-offset-1 ring-offset-background' : 'opacity-55'"
          @click="toggleTag(tag)"
        />
      </div>
      <div v-else class="text-xs text-muted-foreground/60">
        {{ t('pages.files.filter.tags.empty') }}
      </div>
    </div>
  </div>
</template>
