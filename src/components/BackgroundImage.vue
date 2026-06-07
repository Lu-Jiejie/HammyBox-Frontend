<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/shadcn/button'
import { useBackground } from '@/composables/useBackground'

withDefaults(defineProps<{
  showCopyright?: boolean
}>(), {
  showCopyright: true,
})

const { t } = useI18n()

const {
  images,
  currentImage,
  next,
} = useBackground()

const hasImages = computed(() => images.value.length > 0)

// 当前壁纸是否“亮”。true → 亮图，用浅色蒙版；false → 暗图（含 CORS 采样失败兜底），用深色蒙版。
const photoLight = ref(false)
// 展示用 <img> 加载完成标记，用于淡入。
const imgLoaded = ref(false)

// 采样壁纸中心区域的平均亮度，决定蒙版色调。
// Bing 图床通常不带 CORS 头，读取像素会因画布被污染而抛错——此时兜底为暗图，
// 保证图片照常显示，只是放弃自适应。
function analyzeWallpaper(url: string) {
  if (typeof document === 'undefined')
    return

  const probe = new Image()
  probe.crossOrigin = 'anonymous'

  probe.onload = () => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx)
        return

      // 取图片中心正方形，降采样到 1 像素求平均色。
      const side = Math.min(probe.naturalWidth, probe.naturalHeight) || 1
      const sx = (probe.naturalWidth - side) / 2
      const sy = (probe.naturalHeight - side) / 2
      ctx.drawImage(probe, sx, sy, side, side, 0, 0, 1, 1)

      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      photoLight.value = lum > 0.62
    }
    catch {
      photoLight.value = false
    }
  }

  probe.onerror = () => {
    photoLight.value = false
  }

  probe.src = url
}

// 壁纸切换时重置标记并重新采样（首帧即触发）。
watch(() => currentImage.value?.url, (url) => {
  photoLight.value = false
  imgLoaded.value = false
  if (url)
    analyzeWallpaper(url)
}, { immediate: true })
</script>

<template>
  <div class="bg-root pointer-events-none inset-0 fixed overflow-hidden -z-10">
    <!-- 加载兜底背景 -->
    <div
      class="bg-mesh inset-0 absolute"
      :class="{ 'is-empty': !hasImages }"
    />

    <!-- 当前背景 -->
    <img
      v-if="currentImage"
      :key="currentImage.url"
      :src="currentImage.url"
      alt=""
      decoding="async"
      class="h-full w-full transition-opacity duration-700 inset-0 absolute object-cover"
      :class="imgLoaded ? 'opacity-100' : 'opacity-0'"
      @load="imgLoaded = true"
    >

    <!-- 自适应蒙版：随壁纸亮度动态切换深/浅色调（纯 rgba，与主题无关） -->
    <div
      v-if="currentImage"
      class="bg-scrim inset-0 absolute"
      :class="photoLight ? 'is-light' : 'is-dark'"
    />

    <!-- 左下角版权信息 -->
    <div
      v-if="showCopyright && currentImage?.copyright"
      class="max-w-md pointer-events-auto bottom-4 left-4 absolute"
    >
      <div class="text-card-foreground p-3.5 border border-border rounded-lg bg-card/85 shadow-sm backdrop-blur-md">
        <div class="flex gap-2 items-start">
          <span class="i-lucide-image text-muted-foreground mt-0.5 shrink-0 size-3.5" />
          <span class="text-xs text-muted-foreground leading-relaxed">
            {{ currentImage.copyright }}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          class="mt-3 w-full"
          @click="next"
        >
          {{ t('background.refresh') }}
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 加载兜底：中性深色渐变，纯色值不依赖主题变量（避免 hsl()/oklch() 包裹裸变量出错） */
.bg-mesh {
  background-color: #0a0a0f;
  background-image:
    radial-gradient(60% 80% at 18% 20%, rgba(90, 100, 150, 0.32), transparent 55%),
    radial-gradient(55% 70% at 82% 14%, rgba(150, 95, 120, 0.26), transparent 52%),
    radial-gradient(70% 90% at 75% 86%, rgba(60, 115, 125, 0.3), transparent 58%);
}

/* ── 自适应蒙版（移植自 PomodoroTimer 的 scrim 思路） ──
   .is-dark：暗图，压一层黑色 vignette，顶/底更深以衬托 header 与版权；
   .is-light：亮图，覆一层白色 veil，让画面更柔、深色 UI 更易读。
   阈值与强度可按需调（见 analyzeWallpaper 的 0.62 与下面的 rgba）。 */
.bg-scrim {
  transition: opacity 0.6s ease;
}

.bg-scrim.is-dark {
  background:
    linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.45) 0%,
      rgba(0, 0, 0, 0.12) 26%,
      rgba(0, 0, 0, 0.12) 68%,
      rgba(0, 0, 0, 0.5) 100%
    ),
    rgba(0, 0, 0, 0.12);
}

.bg-scrim.is-light {
  background:
    linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.5) 0%,
      rgba(255, 255, 255, 0.16) 26%,
      rgba(255, 255, 255, 0.16) 68%,
      rgba(255, 255, 255, 0.55) 100%
    ),
    rgba(255, 255, 255, 0.1);
}
</style>
