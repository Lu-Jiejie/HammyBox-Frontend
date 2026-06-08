<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/shadcn/button'
import FileDropzone from './components/FileDropzone.vue'
import UploadSettingsDialog from './components/UploadSettingsDialog.vue'

definePage({
  meta: {
    title: '文件上传',
    auth: true,
  },
})

const { t } = useI18n()
const showSettingsDialog = ref(false)
</script>

<template>
  <div class="mx-auto p-6 max-w-5xl">
    <div class="mb-6">
      <div class="mb-2 flex gap-3 items-center">
        <h1 class="text-3xl font-bold">
          {{ t('upload.title') }}
        </h1>
        <Button variant="ghost" size="icon" @click="showSettingsDialog = true">
          <svg
            xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </Button>
      </div>
      <p class="text-muted-foreground">
        {{ t('upload.dragUploadText') }}
      </p>
    </div>

    <FileDropzone />

    <UploadSettingsDialog v-model:open="showSettingsDialog" />
  </div>
</template>
