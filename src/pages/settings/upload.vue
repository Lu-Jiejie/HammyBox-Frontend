<script setup lang="ts">
definePage({
  meta: {
    title: '上传渠道配置',
    auth: true,
  },
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold">
        上传渠道配置
      </h1>
      <p class="text-sm text-muted-foreground">
        配置 Telegram、S3、R2、Discord 等上传渠道
      </p>
    </div>

    <div class="border rounded-lg p-8 text-center text-muted-foreground">
      <p>上传渠道配置功能即将上线</p>
      <p class="text-xs mt-2">
        将支持多渠道配置、负载均衡、容量统计等功能
      </p>
    </div>
  </div>
</template>
