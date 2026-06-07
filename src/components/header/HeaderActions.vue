<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ThemeSwitch from '@/components/header/ThemeSwitch.vue' // 引入刚刚做好的主题切换
import { Button } from '@/components/shadcn/button'
import Hint from '../Hint.vue'
import LocaleSwitch from './LocaleSwitch.vue'

const { t } = useI18n()
</script>

<template>
  <div class="flex shrink-0 flex-row gap-1 items-center">
    <Hint content="GitHub">
      <Button variant="ghost" size="icon" as-child class="size-8">
        <a href="https://github.com/你的用户名/你的项目" target="_blank" rel="noreferrer" class="flex items-center justify-center">
          <div class="i-carbon-logo-github text-muted-foreground size-5 block transition-colors hover:text-foreground" />
          <span class="sr-only">GitHub</span>
        </a>
      </Button>
    </Hint>

    <div class="header-sperator" />
    <Hint :content="t('actions.toggleLanguage')">
      <LocaleSwitch />
    </Hint>
    <Hint :content="t('actions.toggleTheme')">
      <ThemeSwitch />
    </Hint>
  </div>
</template>
