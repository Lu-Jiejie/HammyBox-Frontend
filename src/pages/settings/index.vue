<script setup lang="ts">
definePage({
  meta: {
    title: 'settings.title',
  },
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold">
        系统设置
      </h1>
      <p class="text-sm text-muted-foreground">
        配置系统各项参数
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
      <router-link
        to="/settings/security"
        class="p-6 border rounded-lg hover:shadow-md transition-shadow"
      >
        <div class="flex items-center gap-3 mb-2">
          <div class="i-lucide-shield text-primary" style="width: 24px; height: 24px;" />
          <h3 class="text-lg font-medium">
            安全设置
          </h3>
        </div>
        <p class="text-sm text-muted-foreground">
          管理密码、API Token、会话策略等
        </p>
      </router-link>

      <router-link
        to="/settings/upload"
        class="p-6 border rounded-lg hover:shadow-md transition-shadow"
      >
        <div class="flex items-center gap-3 mb-2">
          <div class="i-lucide-cloud-upload text-primary" style="width: 24px; height: 24px;" />
          <h3 class="text-lg font-medium">
            上传渠道
          </h3>
        </div>
        <p class="text-sm text-muted-foreground">
          配置 Telegram、R2、S3 等上传渠道
        </p>
      </router-link>

      <router-link
        to="/settings/page"
        class="p-6 border rounded-lg hover:shadow-md transition-shadow"
      >
        <div class="flex items-center gap-3 mb-2">
          <div class="i-lucide-layout text-primary" style="width: 24px; height: 24px;" />
          <h3 class="text-lg font-medium">
            页面配置
          </h3>
        </div>
        <p class="text-sm text-muted-foreground">
          自定义站点标题、主题等显示设置
        </p>
      </router-link>

      <router-link
        to="/settings/others"
        class="p-6 border rounded-lg hover:shadow-md transition-shadow"
      >
        <div class="flex items-center gap-3 mb-2">
          <div class="i-lucide-settings text-primary" style="width: 24px; height: 24px;" />
          <h3 class="text-lg font-medium">
            其他设置
          </h3>
        </div>
        <p class="text-sm text-muted-foreground">
          遥测、随机图 API、WebDAV 等杂项配置
        </p>
      </router-link>
    </div>
  </div>
</template>
