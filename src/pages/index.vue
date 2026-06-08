<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

definePage({
  meta: {
    title: '首页',
    auth: true,
  },
})

const router = useRouter()

onMounted(() => {
  router.push('/upload')
})
</script>

<template>
  <div />
</template>
