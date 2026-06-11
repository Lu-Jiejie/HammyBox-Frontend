<script setup lang="ts">
import type { SystemStatus } from '@/api/settings'
import { Donut } from '@unovis/ts'
import { VisAxis, VisDonut, VisLine, VisSingleContainer, VisXYContainer } from '@unovis/vue'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { getSystemStatus, rebuildIndex } from '@/api/settings'
import { Button } from '@/components/shadcn/button'
import { Card } from '@/components/shadcn/card'
import { ChartContainer, ChartCrosshair, ChartLegendContent, ChartTooltip, ChartTooltipContent, componentToString } from '@/components/shadcn/chart'
import { RadioGroup, RadioGroupItem } from '@/components/shadcn/radio-group'

const { t } = useI18n()

definePage({
  meta: {
    title: '系统状态',
    auth: true,
  },
})

const loading = ref(true)
const rebuilding = ref(false)
const status = ref<SystemStatus>({
  totalFiles: 0,
  lastUpdated: 0,
  channelStats: {},
  accessStats: {},
  uploadTrend: { labels: [], total: [], groupBy: { channel: { series: [] }, channelName: { series: [] } } },
})

const channelColors: Record<string, string> = {
  Telegram: '#3b82f6',
  CloudflareR2: '#f97316',
  S3: '#22c55e',
  Discord: '#8b5cf6',
  HuggingFace: '#eab308',
  WebDAV: '#06b6d4',
}

const channelChartConfig = computed(() => {
  const config: any = {}
  Object.keys(status.value.channelStats).forEach((key) => {
    config[key] = { label: key, color: channelColors[key] || '#94a3b8' }
  })
  return config
})

const accessChartConfig = computed(() => {
  const config: any = {
    normal: { label: t('settings.status.fileStates.normal'), color: '#22c55e' },
    blocked: { label: t('settings.status.fileStates.blocked'), color: '#f87171' },
  }
  return config
})

const trendChartConfig = computed(() => {
  const config: any = {}
  const series = status.value.uploadTrend?.groupBy?.channel?.series || []
  series.forEach((s) => {
    config[s.name] = { label: s.name, color: channelColors[s.name] || '#94a3b8' }
  })
  return config
})

const channelDonutData = computed(() => {
  const total = Object.values(status.value.channelStats).reduce((sum, val) => sum + val, 0)
  return Object.entries(status.value.channelStats).map(([name, value]) => ({
    name,
    value,
    fill: `var(--color-${name})`,
    percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0',
  }))
})

const accessDonutData = computed(() => {
  const total = Object.values(status.value.accessStats).reduce((sum, val) => sum + val, 0)
  return Object.entries(status.value.accessStats).map(([name, value]) => {
    const displayName = name === 'blocked' ? t('settings.status.fileStates.blocked') : t('settings.status.fileStates.normal')
    return {
      name: displayName,
      value,
      fill: `var(--color-${name})`,
      percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0',
    }
  })
})

const trendLineData = computed(() => {
  const labels = status.value.uploadTrend?.labels || []
  const series = status.value.uploadTrend?.groupBy?.channel?.series || []
  return labels.map((label, i) => {
    const point: any = { label }
    series.forEach((s) => {
      point[s.name] = s.data[i] || 0
    })
    return point
  })
})

const trendYAccessors = computed(() => {
  const series = status.value.uploadTrend?.groupBy?.channel?.series || []
  return series.map(s => ({
    accessor: (d: any) => d[s.name] || 0,
    color: channelColors[s.name] || '#94a3b8',
  }))
})

async function loadStatus() {
  loading.value = true
  try {
    const res = await getSystemStatus()
    status.value = res.data
  }
  catch {
    toast.error(t('settings.status.messages.loadFailed'))
  }
  finally {
    loading.value = false
  }
}

async function handleRebuild() {
  rebuilding.value = true
  try {
    await rebuildIndex()
    toast.success(t('settings.status.messages.rebuildSuccess'))
    await loadStatus()
  }
  catch {
    toast.error(t('settings.status.messages.rebuildFailed'))
  }
  finally {
    rebuilding.value = false
  }
}

function formatTime(timestamp: number) {
  if (!timestamp)
    return t('common.states.empty')
  return new Date(timestamp).toLocaleString('zh-CN')
}

function getTimeAgo(timestamp: number) {
  if (!timestamp)
    return ''
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (days > 0)
    return t('settings.status.timeAgo.daysAgo', { n: days })
  if (hours > 0)
    return t('settings.status.timeAgo.hoursAgo', { n: hours })
  if (minutes > 0)
    return t('settings.status.timeAgo.minutesAgo', { n: minutes })
  return t('settings.status.timeAgo.justNow')
}

onMounted(() => {
  loadStatus()
})
</script>

<template>
  <div class="mx-auto p-6 max-w-6xl space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">
        {{ t('settings.status.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ t('settings.status.description') }}
      </p>
    </div>

    <div v-if="loading" class="flex min-h-[400px] items-center justify-center">
      <div class="i-lucide-loader-circle text-4xl text-muted-foreground animate-spin" />
    </div>

    <div v-else class="space-y-6">
      <!-- 概览卡片 -->
      <div class="gap-4 grid grid-cols-1 md:grid-cols-2">
        <Card class="p-6 border-blue-500/20 from-blue-500/10 to-transparent bg-gradient-to-br">
          <div class="flex gap-4 items-center">
            <div class="p-3 rounded-xl bg-blue-500/10">
              <div class="i-lucide-database text-3xl text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div class="text-sm text-muted-foreground font-medium">
                {{ t('settings.status.overview.totalFiles') }}
              </div>
              <div class="text-3xl font-bold mt-1">
                {{ status.totalFiles.toLocaleString() }}
              </div>
            </div>
          </div>
        </Card>

        <Card class="p-6 border-emerald-500/20 from-emerald-500/10 to-transparent bg-gradient-to-br">
          <div class="flex gap-4 items-center">
            <div class="p-3 rounded-xl bg-emerald-500/10">
              <div class="i-lucide-clock text-3xl text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div class="text-sm text-muted-foreground font-medium">
                {{ t('settings.status.overview.lastUpdated') }}
              </div>
              <div class="text-lg font-semibold mt-1">
                {{ formatTime(status.lastUpdated) }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{ getTimeAgo(status.lastUpdated) }}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <!-- 图表区域 -->
      <div class="gap-6 grid grid-cols-1 lg:grid-cols-2">
        <!-- 渠道分布饼图 -->
        <Card class="p-6">
          <h3 class="text-lg font-semibold mb-4 flex gap-2 items-center">
            <div class="i-lucide-share-2 text-purple-600 dark:text-purple-400" />
            {{ t('settings.status.charts.channelDistribution') }}
          </h3>
          <div v-if="channelDonutData.length === 0" class="text-muted-foreground py-12 text-center">
            {{ t('settings.status.messages.noData') }}
          </div>
          <ChartContainer v-else :config="channelChartConfig" class="h-auto">
            <VisSingleContainer :data="channelDonutData" class="h-[240px]">
              <VisDonut
                :value="(d: any) => d.value"
                :color="(d: any) => d.fill"
                :arc-width="0"
              />
            </VisSingleContainer>
            <div class="mx-auto mt-4 px-2 max-w-full w-fit space-y-2">
              <div v-for="item in channelDonutData" :key="item.name" class="flex gap-4 items-center">
                <div class="flex gap-2 min-w-0 w-32 items-center">
                  <div class="rounded-sm flex-shrink-0 h-3 w-3" :style="{ backgroundColor: channelChartConfig[item.name]?.color }" />
                  <span class="text-sm whitespace-nowrap truncate">{{ item.name }}</span>
                </div>
                <div class="flex flex-shrink-0 gap-1 w-24 items-center justify-end">
                  <span class="text-sm font-semibold">{{ item.value }}</span>
                  <span class="text-xs text-muted-foreground">{{ item.percentage }}%</span>
                </div>
              </div>
            </div>
          </ChartContainer>
        </Card>

        <!-- 文件状态饼图 -->
        <Card class="p-6">
          <h3 class="text-lg font-semibold mb-4 flex gap-2 items-center">
            <div class="i-lucide-file-text text-orange-600 dark:text-orange-400" />
            {{ t('settings.status.charts.fileStatus') }}
          </h3>
          <div v-if="accessDonutData.length === 0" class="text-muted-foreground py-12 text-center">
            {{ t('settings.status.messages.noData') }}
          </div>
          <ChartContainer v-else :config="accessChartConfig" class="h-auto">
            <VisSingleContainer :data="accessDonutData" class="h-[240px]">
              <VisDonut
                :value="(d: any) => d.value"
                :color="(d: any) => d.fill"
                :arc-width="0"
              />
            </VisSingleContainer>
            <div class="mx-auto mt-4 px-2 max-w-full w-fit space-y-2">
              <div v-for="item in accessDonutData" :key="item.name" class="flex gap-4 items-center">
                <div class="flex gap-2 min-w-0 w-20 items-center">
                  <div class="rounded-sm flex-shrink-0 h-3 w-3" :style="{ backgroundColor: accessChartConfig[item.name === t('settings.status.fileStates.blocked') ? 'blocked' : 'normal']?.color }" />
                  <span class="text-sm whitespace-nowrap truncate">{{ item.name }}</span>
                </div>
                <div class="flex flex-shrink-0 gap-1 w-24 items-center justify-end">
                  <span class="text-sm font-semibold">{{ item.value }}</span>
                  <span class="text-xs text-muted-foreground">{{ item.percentage }}%</span>
                </div>
              </div>
            </div>
          </ChartContainer>
        </Card>
      </div>

      <!-- 上传趋势折线图 -->
      <Card class="p-6">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold flex gap-2 items-center">
            <div class="i-lucide-trending-up text-blue-600 dark:text-blue-400" />
            {{ t('settings.status.charts.uploadTrend') }}
          </h3>
        </div>
        <div v-if="trendLineData.length === 0" class="text-muted-foreground py-12 text-center">
          {{ t('settings.status.messages.noData') }}
        </div>
        <ChartContainer v-else :config="trendChartConfig" class="h-[400px]">
          <VisXYContainer :data="trendLineData">
            <VisLine
              :x="(_: any, i: number) => i"
              :y="trendYAccessors.map(a => a.accessor)"
              :color="trendYAccessors.map(a => a.color)"
              curve-type="basis"
            />
            <VisAxis type="x" :tick-format="(i: number) => trendLineData[i]?.label || ''" />
            <VisAxis type="y" />
          </VisXYContainer>
          <div class="mt-4 flex flex-wrap gap-x-6 gap-y-2 justify-center">
            <div v-for="(item, key) in trendChartConfig" :key="key" class="flex gap-2 items-center">
              <div class="rounded-sm flex-shrink-0 h-3 w-3" :style="{ backgroundColor: item.color }" />
              <span class="text-sm">{{ item.label }}</span>
            </div>
          </div>
        </ChartContainer>
      </Card>

      <!-- 系统维护 -->
      <Card class="p-6 border-amber-500/20 from-amber-500/5 to-transparent bg-gradient-to-br">
        <h3 class="text-lg font-semibold mb-4 flex gap-2 items-center">
          <div class="i-lucide-wrench text-amber-600 dark:text-amber-400" />
          {{ t('settings.status.maintenance.title') }}
        </h3>
        <Button :loading="rebuilding" size="lg" @click="handleRebuild">
          <div class="i-lucide-refresh-cw mr-2" />
          {{ rebuilding ? t('settings.status.maintenance.rebuilding') : t('settings.status.maintenance.rebuild') }}
        </Button>
      </Card>
    </div>
  </div>
</template>
