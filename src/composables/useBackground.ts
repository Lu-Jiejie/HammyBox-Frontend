// composables/useBackground.ts

import { tryOnMounted, useLocalStorage } from '@vueuse/core'
import { computed, ref } from 'vue'
import instance from '@/utils/axios'

export interface BackgroundItem {
  url: string
  copyright: string
}

interface BingResponse {
  url: string
  copyright: string
}

interface BackgroundCache {
  date: string
  images: BackgroundItem[]
}

const STORAGE_KEY = 'background-cache-v1'
const ENABLED_KEY = 'background-enabled-v1'
const MAX_IMAGES = 8

// ── 模块级单例状态 ──
// useBackground 会被多个组件调用（BackgroundImage 负责渲染、ToggleBackground 负责开关与版权展示）。
// 若把状态放在函数内部，各组件会各持一份 currentIndex/loading，导致显示的壁纸与版权对不上。
// 因此把共享状态提升到模块作用域，保证全局唯一。
const loading = ref(false)
const currentIndex = ref(0)

const enabled = useLocalStorage<boolean>(ENABLED_KEY, true)

const cache = useLocalStorage<BackgroundCache>(
  STORAGE_KEY,
  {
    date: '',
    images: [],
  },
)

const images = computed(() => cache.value.images)

const currentImage = computed(() => images.value[currentIndex.value])

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

async function fetchImage(index: number): Promise<BackgroundItem> {
  const { data } = await instance.get<BingResponse>(
    'https://bing.biturl.top/',
    {
      // 外部公共 API 返回通配符 ACAO，带凭证的跨域请求会被浏览器拦截，
      // 因此对这个第三方接口单独关闭 withCredentials（覆盖实例默认值）
      withCredentials: false,
      timeout: 10000,
      params: {
        format: 'json',
        resolution: 'UHD',
        mkt: 'en-US',
        index,
      },
    },
  )

  return {
    url: data.url,
    copyright: data.copyright,
  }
}

export function useBackground() {
  async function initialize() {
    if (loading.value)
      return

    loading.value = true

    try {
      // 首次初始化
      if (cache.value.images.length === 0) {
        const images = await Promise.all(
          Array.from(
            { length: MAX_IMAGES },
            (_, index) => fetchImage(index),
          ),
        )

        cache.value = {
          date: getToday(),
          images,
        }

        return
      }

      // 已同步到今天
      if (cache.value.date === getToday())
        return

      // 新的一天，仅请求最新壁纸
      const latest = await fetchImage(0)

      cache.value = {
        date: getToday(),
        images: [
          latest,
          ...cache.value.images,
        ].slice(0, MAX_IMAGES),
      }
    }
    finally {
      loading.value = false
    }
  }

  async function refresh() {
    await initialize()
  }

  function next() {
    if (!images.value.length)
      return

    currentIndex.value
      = (currentIndex.value + 1)
        % images.value.length
  }

  function prev() {
    if (!images.value.length)
      return

    currentIndex.value
      = (currentIndex.value - 1 + images.value.length)
        % images.value.length
  }

  function toggle() {
    enabled.value = !enabled.value
  }

  tryOnMounted(() => {
    void initialize()
  })

  return {
    loading,
    enabled,

    images,
    currentImage,
    currentIndex,

    next,
    prev,
    toggle,

    refresh,
  }
}
