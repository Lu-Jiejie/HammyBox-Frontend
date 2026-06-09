<script setup lang="ts">
definePage({
  meta: {
    title: 'API Tokens',
    auth: true,
  },
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold">
        API Tokens
      </h1>
      <p class="text-sm text-muted-foreground">
        管理 API 访问令牌
      </p>
    </div>

    <div class="border rounded-lg p-8 text-center text-muted-foreground">
      <p>API Token 管理功能即将上线</p>
      <p class="text-xs mt-2">
        将支持创建、编辑、删除 Token，以及权限管理
      </p>
    </div>
  </div>
</template>
