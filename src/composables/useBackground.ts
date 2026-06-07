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
const MAX_IMAGES = 8

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
  const loading = ref(false)

  const cache = useLocalStorage<BackgroundCache>(
    STORAGE_KEY,
    {
      date: '',
      images: [],
    },
  )

  const currentIndex = ref(0)

  const images = computed(() => cache.value.images)

  const currentImage = computed(() => {
    return images.value[currentIndex.value]
  })

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

  tryOnMounted(() => {
    void initialize()
  })

  return {
    loading,

    images,
    currentImage,
    currentIndex,

    next,
    prev,

    refresh,
  }
}
