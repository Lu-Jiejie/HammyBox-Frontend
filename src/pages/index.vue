<script setup lang="ts" generic="T extends any, O extends any">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'

defineOptions({
  name: 'IndexPage',
})

const name = ref('')

const router = useRouter()
const { t } = useI18n()
function go() {
  if (name.value)
    router.push(`/hi/${encodeURIComponent(name.value)}`)
}
</script>

<template>
  <div>
    <div i-carbon-campsite text-4xl inline-block />
    <p>
      <a rel="noreferrer" href="https://github.com/Lu-Jiejie/vitesse-personal" target="_blank">
        Vitesse Personal
      </a>
    </p>
    <p>
      <em text-sm op75>Opinionated Vite Starter Template</em>
    </p>

    <div py-4 />

    <div p-10>
      <Input
        v-model="name"
        placeholder="What's your name?"
        autocomplete="false"
        @keydown.enter="go"
      />
    </div>
    <Button @click="go">
      {{ t('button.go') }}
    </Button>
  </div>
</template>
