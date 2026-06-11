<script setup lang="ts">
import type { FileItem } from '@/api/files'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { Input } from '@/components/shadcn/input'
import TagBadge from '@/components/TagBadge.vue'
import { useAppStore } from '@/stores'

interface Props {
  open: boolean
  file: FileItem | null
}

interface Emits {
  (e: 'update:open', value: boolean): void
  (e: 'confirm', tags: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()
const store = useAppStore()

const builtInTags = ['whitelist', 'blocked', 'nsfw', 'shared']
const editingTags = ref<string[]>([])
const newTagInput = ref('')

watch(() => props.open, (isOpen) => {
  if (isOpen && props.file) {
    editingTags.value = props.file.metadata?.Tags ? [...props.file.metadata.Tags] : []
    newTagInput.value = ''
  }
})

const availableTags = computed(() => {
  const fileTags = props.file?.metadata?.Tags || []
  const allTags = new Set([...builtInTags, ...store.userTags, ...fileTags])
  return Array.from(allTags).sort((a, b) => {
    const aIndex = builtInTags.indexOf(a)
    const bIndex = builtInTags.indexOf(b)
    if (aIndex !== -1 && bIndex !== -1)
      return aIndex - bIndex
    if (aIndex !== -1)
      return -1
    if (bIndex !== -1)
      return 1
    return a.localeCompare(b)
  })
})

function toggleTag(tag: string) {
  const index = editingTags.value.indexOf(tag)
  if (index > -1) {
    editingTags.value.splice(index, 1)
  }
  else {
    if (tag === 'blocked' && editingTags.value.includes('whitelist')) {
      editingTags.value.splice(editingTags.value.indexOf('whitelist'), 1)
    }
    else if (tag === 'whitelist' && editingTags.value.includes('blocked')) {
      editingTags.value.splice(editingTags.value.indexOf('blocked'), 1)
    }
    editingTags.value.push(tag)
  }
}

function removeTag(tag: string) {
  const index = editingTags.value.indexOf(tag)
  if (index > -1) {
    editingTags.value.splice(index, 1)
  }
}

function addNewTag() {
  const tag = newTagInput.value.trim().toLowerCase()
  if (!tag || editingTags.value.includes(tag))
    return

  if (!builtInTags.includes(tag) && !store.userTags.includes(tag)) {
    store.userTags.push(tag)
  }

  editingTags.value.push(tag)
  newTagInput.value = ''
}

function removeUserTag(tag: string) {
  const index = store.userTags.indexOf(tag)
  if (index > -1) {
    store.userTags.splice(index, 1)
  }
  const selectedIndex = editingTags.value.indexOf(tag)
  if (selectedIndex > -1) {
    editingTags.value.splice(selectedIndex, 1)
  }
}

function handleConfirm() {
  emit('confirm', editingTags.value)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>编辑标签</DialogTitle>
      </DialogHeader>
      <div class="py-4 space-y-4">
        <div v-if="editingTags.length > 0" class="p-3 border rounded-lg bg-muted/30">
          <div class="flex flex-wrap gap-2">
            <TagBadge
              v-for="tag in editingTags"
              :key="tag"
              :tag="tag"
              :color="store.getTagColor(tag)"
              show-delete
              @delete="removeTag(tag)"
            />
          </div>
        </div>
        <div v-else class="p-3 text-center border rounded-lg bg-muted/30">
          <span class="text-sm text-muted-foreground">未选择标签</span>
        </div>

        <div class="flex gap-2">
          <Input
            v-model="newTagInput"
            placeholder="添加新标签"
            @keyup.enter="addNewTag"
          />
          <Button variant="outline" size="icon" @click="addNewTag">
            <div class="i-lucide-plus" />
          </Button>
        </div>

        <div class="space-y-2">
          <label class="text-xs text-muted-foreground">备选标签</label>
          <div class="p-3 border rounded-lg bg-background min-h-[80px]">
            <div class="flex flex-wrap gap-2">
              <TagBadge
                v-for="tag in availableTags.filter(t => !editingTags.includes(t))"
                :key="tag"
                :tag="tag"
                :color="store.getTagColor(tag)"
                :show-delete="!builtInTags.includes(tag)"
                delete-icon="trash"
                clickable
                @click="toggleTag(tag)"
                @delete="removeUserTag(tag)"
              />
            </div>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">
          {{ t('common.actions.cancel') }}
        </Button>
        <Button @click="handleConfirm">
          {{ t('common.actions.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
