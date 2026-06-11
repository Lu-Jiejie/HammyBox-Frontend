<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="mx-auto p-6 max-w-5xl space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">
        {{ t('settings.page.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ t('settings.page.description') }}
      </p>
    </div>

    <div class="text-muted-foreground p-8 text-center border rounded-lg">
      <p>{{ t('settings.page.comingSoon') }}</p>
      <p class="text-xs mt-2">
        {{ t('settings.page.hint') }}
      </p>
    </div>
  </div>
</template>
