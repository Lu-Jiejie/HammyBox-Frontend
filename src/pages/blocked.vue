<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Button } from '@/components/shadcn/button'

definePage({
  meta: {
    layout: false,
  },
})

const { t } = useI18n()
const router = useRouter()
</script>

<template>
  <div class="text-center flex flex-col min-h-screen items-center justify-center">
    <h1 class="text-9xl font-bold mb-6">
      403
    </h1>
    <h2 class="text-3xl font-semibold mb-4">
      {{ t('pages.blocked.title') }}
    </h2>
    <p class="text-lg text-muted-foreground mb-8 max-w-md">
      {{ t('pages.blocked.description') }}
    </p>
    <div class="flex gap-3">
      <Button variant="outline" @click="router.back()">
        {{ t('pages.blocked.goBack') }}
      </Button>
      <Button @click="router.push('/')">
        {{ t('pages.blocked.backToHome') }}
      </Button>
    </div>
  </div>
</template>
