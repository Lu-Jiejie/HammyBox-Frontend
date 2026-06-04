<script setup lang="ts">
import { computed } from 'vue'
import { toggleDark } from '~/composables'
import { locale, toggleLocale } from '~/modules/i18n'

const localeIcon = computed(() => {
  switch (locale.value) {
    case 'zh-CN':
      return 'i-uil-letter-chinese-a'
    case 'en-US':
      return 'i-uil-letter-english-a'
    default:
      return 'i-uil-letter-english-a'
  }
})
</script>

<template>
  <nav text-xl mt-6 inline-flex gap-2>
    <button icon-btn @click="toggleDark()">
      <div i-carbon-sun dark:i-carbon-moon />
    </button>

    <a
      i-carbon-logo-github icon-btn
      rel="noreferrer"
      href="https://github.com/antfu-collective/vitesse-lite"
      target="_blank"
      title="GitHub"
    />

    <button icon-btn @click="toggleLocale">
      <div :class="localeIcon" />
    </button>
  </nav>
</template>
