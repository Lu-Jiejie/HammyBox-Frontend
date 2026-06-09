<script setup lang="ts">
definePage({
  meta: {
    title: '安全设置',
    auth: true,
  },
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold">
        安全设置
      </h1>
      <p class="text-sm text-muted-foreground">
        认证、审查、会话策略配置
      </p>
    </div>

    <div class="border rounded-lg p-8 text-center text-muted-foreground">
      <p>安全设置功能即将上线</p>
      <p class="text-xs mt-2">
        将支持密码修改、会话管理、IP 黑名单等功能
      </p>
    </div>
  </div>
</template>
