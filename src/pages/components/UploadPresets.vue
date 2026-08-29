<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import InputDialog from '@/components/InputDialog.vue'
import { Button } from '@/components/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import { useAppStore } from '@/stores'

const store = useAppStore()
const { uploadPresets } = storeToRefs(store)

const showSaveDialog = ref(false)
const newPresetName = ref('')
const cloudSyncing = ref(false)

// 自动匹配当前配置对应的预设
const matchedPreset = computed(() => {
  const presets = uploadPresets.value
  for (const preset of presets) {
    const c = preset.config
    if (
      c.uploadChannel === store.uploadChannel
      && c.uploadChannelName === store.uploadChannelName
      && c.uploadFolder === store.uploadFolder
      && c.uploadNameType === store.uploadNameType
      && c.uploadTags.length === store.uploadTags.length
      && c.uploadTags.every((t, i) => t === store.uploadTags[i])
      && c.compressConfig.customerCompress === store.compressConfig.customerCompress
      && c.compressConfig.compressQuality === store.compressConfig.compressQuality
      && c.compressConfig.compressBar === store.compressConfig.compressBar
      && c.compressConfig.serverCompress === store.compressConfig.serverCompress
      && c.compressConfig.convertToWebp === store.compressConfig.convertToWebp
    ) {
      return preset
    }
  }
  return null
})

function handleApply(preset: { id: string }) {
  store.applyPreset(preset.id)
}

function handleDelete(preset: { id: string }) {
  store.deletePreset(preset.id)
}

function handleSavePreset() {
  const name = newPresetName.value.trim()
  if (!name)
    return
  store.savePreset(name)
  newPresetName.value = ''
  showSaveDialog.value = false
  // 保存后立即同步到云端（fire-and-forget，失败不阻塞）
  syncingPresetToCloud()
}

async function syncingPresetToCloud() {
  cloudSyncing.value = true
  try {
    await store.syncPresetsToCloud()
    toast.success('预设已同步到云端')
  }
  catch {
    toast.error('预设已保存到本地，但同步到云端失败')
  }
  finally {
    cloudSyncing.value = false
  }
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        class="font-normal gap-1.5 h-8 w-40 justify-between"
      >
        <span class="truncate">{{ matchedPreset?.name || '选择预设' }}</span>
        <div class="i-lucide-chevron-down text-muted-foreground/30 shrink-0" style="width: 13px; height: 13px;" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent class="w-56" align="start">
      <DropdownMenuLabel class="flex items-center justify-between">
        <span class="text-xs font-medium">预设组</span>
        <span v-if="uploadPresets.length > 0" class="text-[11px] text-muted-foreground/35 tabular-nums">{{ uploadPresets.length }}</span>
      </DropdownMenuLabel>

      <DropdownMenuSeparator />

      <div v-if="uploadPresets.length === 0" class="text-xs text-muted-foreground/35 px-2 py-5 text-center">
        暂无预设
      </div>

      <DropdownMenuItem
        v-for="preset in uploadPresets"
        :key="preset.id"
        class="py-1.5 pe-1 flex gap-2 items-center"
        @click="handleApply(preset)"
      >
        <span
          class="rounded-full shrink-0 h-1.5 w-1.5 inline-block"
          :class="preset.id === matchedPreset?.id
            ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]'
            : 'bg-muted-foreground/15'"
        />
        <span class="flex-1 truncate">{{ preset.name }}</span>
        <button
          class="text-muted-foreground/20 rounded flex shrink-0 h-6 w-6 transition-all items-center justify-center hover:text-destructive hover:bg-destructive/10"
          @click.stop="handleDelete(preset)"
        >
          <div class="i-lucide-trash-2" style="width: 13px; height: 13px;" />
        </button>
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <!-- 保存当前配置为预设 -->
      <DropdownMenuItem
        class="text-muted-foreground/60 gap-2"
        @click="showSaveDialog = true"
      >
        <div class="i-lucide-plus opacity-50 shrink-0" style="width: 14px; height: 14px;" />
        <span>保存当前配置为预设</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  <InputDialog
    v-model:open="showSaveDialog"
    v-model="newPresetName"
    title="保存预设"
    description="将当前上传配置保存为预设"
    label="预设名称"
    placeholder="例如：图片上传..."
    @confirm="handleSavePreset"
  />
</template>
