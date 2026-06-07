<script lang="ts">
import { defineTool } from './index'

export const toolMeta = defineTool({
  id: 'pomodoro-timer',
  name: 'Pomodoro Timer',
  nameZh: '番茄钟',
  description: 'A focus timer built on the Pomodoro Technique, with work and break cycles set against the Bing daily wallpaper and a grand fullscreen display.',
  descriptionZh: '基于番茄工作法的专注计时器，循环切换专注与休息，以必应每日壁纸为背景，并支持大气优雅的全屏显示。',
  category: 'utility',
  keywords: ['pomodoro', 'timer', 'focus', 'productivity', 'tomato', 'break', 'bing', 'wallpaper', '番茄钟', '专注', '计时器', '番茄工作法', '必应壁纸'],
})
</script>

<!-- eslint-disable import/first -->
<script setup lang="ts">
import { useEventListener, useFullscreen, useStorage } from '@vueuse/core'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Markdown from '~/components/container/Markdown.vue'
import Panel from '~/components/container/Panel.vue'
import BaseButton from '~/components/input/BaseButton.vue'
import StepperInput from '~/components/input/StepperInput.vue'
import RollingDigit from '~/components/ui/RollingDigit.vue'
import { useI18n } from '~/composables/useI18n'
import { useLocale } from '~/composables/useLocale'
import MD_EN from '~/contents/PomodoroTimer.en.md?raw'
import MD_ZH from '~/contents/PomodoroTimer.zh.md?raw'

const { t } = useI18n({
  phase_focus: ['Focus', '专注'],
  phase_short: ['Short Break', '短休息'],
  phase_long: ['Long Break', '长休息'],

  ready: ['Ready', '就绪'],
  running: ['Running', '进行中'],
  paused: ['Paused', '已暂停'],

  start: ['Start', '开始'],
  resume: ['Resume', '继续'],
  pause: ['Pause', '暂停'],
  reset: ['Reset', '重置'],
  skip: ['Skip', '跳过'],

  settings: ['Settings', '设置'],
  focus_len: ['Focus length', '专注时长'],
  short_len: ['Short break', '短休息'],
  long_len: ['Long break', '长休息'],
  long_every: ['Long break every', '长休息间隔'],
  minutes: ['min', '分钟'],
  rounds_unit: ['rounds', '轮'],
  auto_start: ['Auto-start next phase', '自动开始下一阶段'],
  on: ['On', '开'],
  off: ['Off', '关'],

  dots_hint: [(n: string) => `A long break follows every ${n} focus rounds.`, (n: string) => `每完成 ${n} 轮专注后会自动进入一次长休息。`],

  stats: ['Today', '今日'],
  stat_rounds: ['Focus rounds', '专注轮数'],
  stat_time: ['Focus time', '专注时长'],

  enter_fullscreen: ['Enter fullscreen', '进入全屏'],
  exit_fullscreen: ['Exit fullscreen', '退出全屏'],
  notify_on: ['Notifications on', '系统通知 开'],
  notify_off: ['Notifications off', '系统通知 关'],

  shuffle: ['Shuffle wallpaper', '换一张壁纸'],
  wallpaper_by: ['Bing', '必应每日壁纸'],

  notify_focus_title: ['Focus complete', '专注完成'],
  notify_focus_body: ['Nice work. Time for a break.', '做得好，休息一下吧。'],
  notify_break_title: ['Break over', '休息结束'],
  notify_break_body: ['Back to focus.', '回到专注。'],
})

const { locale } = useLocale()

type Phase = 'focus' | 'short' | 'long'

interface Settings {
  focus: number
  short: number
  long: number
  longEvery: number
  autoStart: boolean
}

interface Wallpaper {
  url: string
  title: string
  copyright: string
  date: string
}

interface TodayStat {
  date: string
  rounds: number
  ms: number
}

const settings = useStorage<Settings>('tools:pomodoro:settings', {
  focus: 25,
  short: 5,
  long: 15,
  longEvery: 4,
  autoStart: false,
})

const notifyOn = useStorage('tools:pomodoro:notify', true)
const today = useStorage<TodayStat>('tools:pomodoro:today', { date: '', rounds: 0, ms: 0 })
const wallpaper = useStorage<Wallpaper | null>('tools:pomodoro:wallpaper', null)

const phase = ref<Phase>('focus')
const remaining = ref(0)
const running = ref(false)
// Focus rounds completed in the current cycle; resets after a long break.
const focusCount = ref(0)
const controlsVisible = ref(true)
const imgLoaded = ref(false)
const wallpaperLoading = ref(false)
// Direction the odometer digits spin: 'down' as a phase ticks away, 'up' when
// the time jumps to a larger value (reset, or landing on a new phase).
const rollDir = ref<'up' | 'down'>('down')

const stageRef = ref<HTMLElement | null>(null)
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(stageRef)

let cdTarget = 0
let rafId = 0
let hideTimer: ReturnType<typeof setTimeout> | undefined

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const phaseDurations = computed(() => ({
  focus: Math.max(1, settings.value.focus) * 60000,
  short: Math.max(1, settings.value.short) * 60000,
  long: Math.max(1, settings.value.long) * 60000,
}))

const currentDuration = computed(() => phaseDurations.value[phase.value])
remaining.value = currentDuration.value

const isBreak = computed(() => phase.value !== 'focus')

// Progress from 0 (just started) to 1 (finished); drives the dial ring.
const progress = computed(() => {
  const d = currentDuration.value
  return d > 0 ? Math.min(1, Math.max(0, 1 - remaining.value / d)) : 0
})

// Ring accent: the project's teal signal for focus, a warm amber for breaks.
const ringColor = computed(() => (isBreak.value ? '#f59e0b' : 'var(--c-accent)'))

const RING_R = 46
const RING_C = 2 * Math.PI * RING_R
const dashOffset = computed(() => RING_C * (1 - progress.value))

// Filled round dots for the current long-break cycle. While a long break runs
// (focusCount == longEvery) all dots stay lit to show the cycle was earned; a
// fresh cycle (focusCount 0) shows none.
const activeDots = computed(() => {
  const e = settings.value.longEvery
  if (focusCount.value === 0)
    return 0
  const mod = focusCount.value % e
  return mod === 0 ? e : mod
})

const onPhoto = computed(() => !!(wallpaper.value?.url && imgLoaded.value))

// Best-effort luminance of the wallpaper behind the clock. true → the photo is
// light there, so the clock switches to dark ink; false → light ink. Defaults
// to light ink (with a dark scrim) when sampling is blocked by CORS.
const photoLight = ref(false)

// Adaptive colour schemes. Off-photo keeps the project tokens; on a photo the
// ink flips with the sampled luminance and an opposite-tone scrim/shadow keeps
// it legible either way.
const clockClass = computed(() =>
  !onPhoto.value ? 'text-c-text' : photoLight.value ? 'text-zinc-900' : 'text-white')
const sepClass = computed(() =>
  !onPhoto.value ? 'text-c-text-faint' : photoLight.value ? 'text-zinc-900/45' : 'text-white/70')
const statusClass = computed(() =>
  !onPhoto.value ? 'text-c-text-faint' : photoLight.value ? 'text-zinc-900/80' : 'text-white/85')
const phaseClass = computed(() => {
  if (isBreak.value)
    return photoLight.value && onPhoto.value ? 'text-amber-600' : 'text-amber-400'
  if (!onPhoto.value)
    return 'text-c-accent'
  return photoLight.value ? 'text-zinc-900' : 'text-white'
})
const creditClass = computed(() => (photoLight.value ? 'text-zinc-900' : 'text-white'))

// A soft opposite-tone halo keeps the ink crisp over busy photo regions.
const inkShadow = computed(() =>
  !onPhoto.value ? '' : photoLight.value ? 'ink-shadow-light' : 'ink-shadow-dark')

// Dial track: faint dark on a light photo, faint light on a dark one.
const ringTrack = computed(() =>
  !onPhoto.value ? 'var(--c-border)' : photoLight.value ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.22)')

const statusLabel = computed(() => {
  if (running.value)
    return t('running')
  return remaining.value < currentDuration.value ? t('paused') : t('ready')
})

const phaseLabel = computed(() => t(`phase_${phase.value}`))

const primaryLabel = computed(() => {
  if (running.value)
    return t('pause')
  return remaining.value < currentDuration.value ? t('resume') : t('start')
})

const primaryIcon = computed(() => (running.value ? 'i-carbon-pause-filled' : 'i-carbon-play-filled-alt'))

const canReset = computed(() => running.value || remaining.value < currentDuration.value)

// Clock reels: MM : SS. The seconds tens place caps at 5 (sexagesimal); the
// minutes places loop 0-9 since a long focus can exceed an hour's worth only
// rarely and minutes stay two digits in practice.
function digitMaxes(text: string, sexagesimal: boolean) {
  return text.split('').map((_, i) => (sexagesimal && i === text.length - 2 ? 5 : 9))
}

interface ClockToken {
  type: 'num' | 'sep'
  text: string
  maxes?: number[]
}

const clockTokens = computed<ClockToken[]>(() => {
  const totalSec = Math.ceil(Math.max(0, remaining.value) / 1000)
  const m = pad(Math.floor(totalSec / 60))
  const s = pad(totalSec % 60)
  return [
    { type: 'num', text: m, maxes: digitMaxes(m, false) },
    { type: 'sep', text: ':' },
    { type: 'num', text: s, maxes: digitMaxes(s, true) },
  ]
})

const statTime = computed(() => {
  const totalMin = Math.round((today.value.ms || 0) / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${pad(m)}m` : `${m}m`
})

// ── Timer engine ───────────────────────────────────────────────────────────

function tick() {
  const rem = cdTarget - performance.now()
  if (rem <= 0) {
    remaining.value = 0
    onPhaseFinish()
    return
  }
  remaining.value = rem
  rafId = requestAnimationFrame(tick)
}

function start() {
  if (running.value)
    return
  if (remaining.value <= 0)
    remaining.value = currentDuration.value
  rollDir.value = 'down'
  cdTarget = performance.now() + remaining.value
  running.value = true
  ensureNotifyPermission()
  pokeControls()
  rafId = requestAnimationFrame(tick)
}

function pause() {
  if (!running.value)
    return
  running.value = false
  cancelAnimationFrame(rafId)
  pokeControls()
}

function primaryAction() {
  if (running.value)
    pause()
  else
    start()
}

function reset() {
  running.value = false
  cancelAnimationFrame(rafId)
  rollDir.value = 'up'
  remaining.value = currentDuration.value
  pokeControls()
}

// Land on a phase in its idle, full-duration state.
function goTo(p: Phase) {
  rollDir.value = 'up'
  phase.value = p
  remaining.value = phaseDurations.value[p]
}

// Move to the next phase. `counted` records a completed focus round toward the
// long-break cycle and today's stats; a manual skip passes false.
function advance(counted: boolean) {
  if (phase.value === 'focus') {
    if (counted) {
      focusCount.value++
      bumpToday(currentDuration.value)
    }
    const nextLong = focusCount.value > 0 && focusCount.value % settings.value.longEvery === 0
    goTo(nextLong ? 'long' : 'short')
  }
  else {
    if (phase.value === 'long')
      focusCount.value = 0
    goTo('focus')
  }
}

function onPhaseFinish() {
  running.value = false
  cancelAnimationFrame(rafId)
  const finished = phase.value
  notify(finished)
  advance(true)
  if (settings.value.autoStart)
    start()
  else
    pokeControls()
}

function skip() {
  running.value = false
  cancelAnimationFrame(rafId)
  advance(false)
  pokeControls()
}

function bumpToday(ms: number) {
  if (today.value.date !== todayStr())
    today.value = { date: todayStr(), rounds: 0, ms: 0 }
  today.value = {
    date: todayStr(),
    rounds: today.value.rounds + 1,
    ms: today.value.ms + ms,
  }
}

// ── Notifications (silent system notification, mirrors StopwatchCountdown) ──

function notify(finished: Phase) {
  if (!notifyOn.value || typeof Notification === 'undefined')
    return
  if (Notification.permission !== 'granted')
    return
  const focus = finished === 'focus'
  try {
    // eslint-disable-next-line no-new
    new Notification(focus ? t('notify_focus_title') : t('notify_break_title'), {
      body: focus ? t('notify_focus_body') : t('notify_break_body'),
      silent: true,
    })
  }
  catch {
    // Notification unavailable; fail silently.
  }
}

function ensureNotifyPermission() {
  if (!notifyOn.value || typeof Notification === 'undefined')
    return
  if (Notification.permission === 'default')
    Notification.requestPermission()
}

async function toggleNotify() {
  if (notifyOn.value) {
    notifyOn.value = false
    return
  }
  if (typeof Notification === 'undefined') {
    notifyOn.value = true
    return
  }
  if (Notification.permission === 'default')
    await Notification.requestPermission()
  notifyOn.value = Notification.permission === 'granted'
}

// ── Settings steppers ───────────────────────────────────────────────────────

interface SettingRow {
  key: keyof Pick<Settings, 'focus' | 'short' | 'long' | 'longEvery'>
  label: string
  min: number
  max: number
  unit: string
}

const settingRows = computed<SettingRow[]>(() => [
  { key: 'focus', label: t('focus_len'), min: 1, max: 90, unit: t('minutes') },
  { key: 'short', label: t('short_len'), min: 1, max: 30, unit: t('minutes') },
  { key: 'long', label: t('long_len'), min: 1, max: 60, unit: t('minutes') },
  { key: 'longEvery', label: t('long_every'), min: 2, max: 8, unit: t('rounds_unit') },
])

// On/off choices for the auto-start stepper (enum mode loops endlessly).
const AUTO_OPTIONS = computed(() => [
  { label: t('off'), value: false },
  { label: t('on'), value: true },
])

// Hover hint that answers "when does the long break start?".
const dotsHint = computed(() => t('dots_hint', String(settings.value.longEvery)))

// Keep the idle display in sync when the active phase's duration is edited.
watch(currentDuration, (ms) => {
  if (!running.value)
    remaining.value = ms
})

// ── Fullscreen control auto-hide ────────────────────────────────────────────

function pokeControls() {
  controlsVisible.value = true
  clearTimeout(hideTimer)
  if (isFullscreen.value && running.value)
    hideTimer = setTimeout(() => (controlsVisible.value = false), 2600)
}

watch(isFullscreen, () => pokeControls())

// ── Bing daily wallpaper ─────────────────────────────────────────────────────

// Parse Bing's "Title (© Author/Source)" copyright string into its two parts.
function splitCopyright(raw: string) {
  // eslint-disable-next-line regexp/no-super-linear-backtracking
  const m = String(raw || '').match(/^(.*?)\s*\((.*)\)\s*$/)
  return m ? { title: m[1].trim(), copyright: m[2].trim() } : { title: String(raw || '').trim(), copyright: '' }
}

async function loadWallpaper(force = false) {
  if (!force && wallpaper.value?.url && wallpaper.value.date === todayStr()) {
    imgLoaded.value = false
    return
  }
  if (wallpaperLoading.value)
    return
  wallpaperLoading.value = true
  const mkt = locale.value === 'zh' ? 'zh-CN' : 'en-US'
  const index = force ? Math.floor(Math.random() * 8) : 0
  try {
    const res = await fetch(`https://bing.biturl.top/?resolution=1920&format=json&index=${index}&mkt=${mkt}`)
    if (!res.ok)
      throw new Error(`status ${res.status}`)
    const data = await res.json() as { url?: string, copyright?: string }
    if (!data.url)
      throw new Error('no url')
    const { title, copyright } = splitCopyright(data.copyright ?? '')
    imgLoaded.value = false
    wallpaper.value = { url: data.url, title, copyright, date: todayStr() }
  }
  catch {
    // Keep any cached image; otherwise fall back to a direct-image endpoint
    // that needs no CORS (it is only ever used as an <img> source).
    if (!wallpaper.value?.url) {
      imgLoaded.value = false
      wallpaper.value = { url: 'https://bing.img.run/1920x1080.php', title: '', copyright: '', date: todayStr() }
    }
  }
  finally {
    wallpaperLoading.value = false
  }
}

// Sample the wallpaper's centre luminance so the clock can flip between dark
// and light ink. Bing's image host usually omits CORS headers, which taints the
// canvas and throws on read — caught here to fall back to light ink + scrim, so
// the photo always shows even when adaptive sampling is unavailable.
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
      // Average the centre square (where the clock sits) down to one pixel.
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
  probe.onerror = () => (photoLight.value = false)
  probe.src = url
}

// Re-sample whenever the active wallpaper changes (initial cache included).
watch(() => wallpaper.value?.url, (url) => {
  photoLight.value = false
  if (url)
    analyzeWallpaper(url)
}, { immediate: true })

// ── Keyboard shortcuts ───────────────────────────────────────────────────────

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null
  if (el && /^(?:input|textarea|select)$/i.test(el.tagName))
    return
  if (e.code === 'Space') {
    e.preventDefault()
    primaryAction()
  }
  else if (e.key === 'r' || e.key === 'R') {
    reset()
  }
  else if (e.key === 's' || e.key === 'S') {
    skip()
  }
  else if (e.key === 'f' || e.key === 'F') {
    toggleFullscreen()
  }
})

onMounted(() => {
  loadWallpaper()
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  clearTimeout(hideTimer)
})
</script>

<template>
  <div flex="~ col gap-4">
    <!-- Main stage: the hero clock over the Bing wallpaper. Fullscreen target.
         On a photo the panel chrome (border + inset shadow) is dropped so the
         wallpaper reads as a seamless full-bleed image, not a framed box. -->
    <div
      ref="stageRef"
      class="stage"
      flex="~ col items-center justify-center"
      select-none relative overflow-hidden
      :class="[
        onPhoto ? 'bg-black' : 'bg-c-surface',
        isFullscreen ? 'h-screen w-screen gap-10' : 'px-2 sm:px-6 py-12 sm:py-14 gap-8 min-h-80 rounded-2xl',
        (!isFullscreen && !onPhoto) ? 'border border-c-border' : '',
      ]"
      @mousemove="pokeControls"
      @touchstart="pokeControls"
    >
      <!-- Wallpaper layer + adaptive legibility scrim -->
      <img
        v-if="wallpaper?.url"
        :key="wallpaper.url"
        :src="wallpaper.url"
        alt=""
        size-full inset-0 absolute object-cover
        transition="opacity duration-700"
        :class="imgLoaded ? 'op-100' : 'op-0'"
        @load="imgLoaded = true"
      >
      <div v-if="onPhoto" pointer-events-none inset-0 absolute :class="photoLight ? 'scrim-light' : 'scrim-dark'" />

      <!-- Top-right controls: notifications + fullscreen -->
      <div
        flex="~ items-center gap-2"
        transition="opacity duration-300"
        right-4 top-4 absolute z-10
        :class="(!isFullscreen || controlsVisible) ? 'op-100' : 'op-0 pointer-events-none'"
      >
        <BaseButton
          icon-only bg-c-surface! hover:border-c-input! hover:bg-c-input!
          :icon="notifyOn ? 'i-carbon-notification op-70' : 'i-carbon-notification-off op-70'"
          :title="notifyOn ? t('notify_on') : t('notify_off')"
          @click="toggleNotify"
        />
        <BaseButton
          icon-only bg-c-surface! hover:border-c-input! hover:bg-c-input!
          :icon="isFullscreen ? 'i-carbon-minimize op-70' : 'i-carbon-maximize op-70'"
          :title="isFullscreen ? t('exit_fullscreen') : t('enter_fullscreen')"
          @click="toggleFullscreen"
        />
      </div>

      <!-- Status line: phase · state -->
      <div
        flex="~ items-center justify-center gap-x-3"
        text="[clamp(0.75rem,2.4cqw,1.05rem)]" tracking-widest font-mono uppercase z-10
        :class="[statusClass, inkShadow]"
      >
        <span :class="phaseClass">{{ phaseLabel }}</span>
        <span op-40>·</span>
        <span>{{ statusLabel }}</span>
      </div>

      <!-- The dial: ring progress wrapping the rolling MM:SS clock. -->
      <div class="dial" relative z-10 flex="~ items-center justify-center">
        <svg viewBox="0 0 100 100" size-full inset-0 absolute aria-hidden="true">
          <circle
            class="ring-track"
            cx="50" cy="50" :r="RING_R" fill="none"
            :stroke="ringTrack"
            stroke-width="2.4"
          />
          <circle
            class="ring-prog"
            cx="50" cy="50" :r="RING_R" fill="none"
            :stroke="ringColor"
            stroke-width="2.4" stroke-linecap="round"
            :stroke-dasharray="RING_C"
            :stroke-dashoffset="dashOffset"
            transform="rotate(-90 50 50)"
          />
        </svg>

        <div
          class="clock"
          font="serif normal" leading-none tabular-nums
          flex="~ items-center justify-center gap-x-1"
          :class="[clockClass, inkShadow]"
        >
          <template v-for="(tok, i) in clockTokens" :key="i">
            <span v-if="tok.type === 'sep'" class="clk-sep" :class="sepClass">{{ tok.text }}</span>
            <span v-else flex="~">
              <RollingDigit
                v-for="(ch, ci) in tok.text"
                :key="ci"
                :digit="ch" :max="tok.maxes?.[ci] ?? 9" :dir="rollDir"
              />
            </span>
          </template>
        </div>
      </div>

      <!-- Round dots: focus rounds completed toward the next long break. -->
      <div flex="~ items-center justify-center gap-2" h-3 z-10 :title="dotsHint">
        <span
          v-for="n in settings.longEvery"
          :key="n"
          rounded-full size-2 transition="colors duration-300"
          :class="activeDots >= n
            ? (onPhoto ? (photoLight ? 'bg-zinc-900' : 'bg-white') : 'bg-c-accent')
            : (onPhoto ? (photoLight ? 'bg-zinc-900/25' : 'bg-white/25') : 'bg-c-border-strong op-50')"
        />
      </div>

      <!-- Controls -->
      <div
        flex="~ items-center justify-center gap-3 wrap"
        transition="opacity duration-300"
        z-10
        :class="(!isFullscreen || controlsVisible) ? 'op-100' : 'op-0 pointer-events-none'"
      >
        <BaseButton :icon="`${primaryIcon} text-c-accent`" @click="primaryAction">
          {{ primaryLabel }}
        </BaseButton>
        <BaseButton icon="i-carbon-skip-forward-filled text-sky-500" @click="skip">
          {{ t('skip') }}
        </BaseButton>
        <BaseButton icon="i-carbon-reset text-rose-500" :disabled="!canReset" @click="reset">
          {{ t('reset') }}
        </BaseButton>
      </div>

      <!-- Wallpaper credit (bottom-left) -->
      <div
        v-if="onPhoto"
        flex="~ items-center gap-2"
        bottom-3 left-4 right-14 absolute z-10
        transition="opacity duration-300"
        :class="[creditClass, (!isFullscreen || controlsVisible) ? 'op-100' : 'op-0 pointer-events-none']"
      >
        <span text="[0.625rem]" tracking-widest font-mono op-50 shrink-0 uppercase>{{ t('wallpaper_by') }}</span>
        <span text-xs font-sans op-85 truncate>
          {{ wallpaper?.title }}<span v-if="wallpaper?.copyright" op-60> · {{ wallpaper?.copyright }}</span>
        </span>
        <button
          type="button"
          :title="t('shuffle')"
          flex="~ items-center justify-center"
          rounded-md shrink-0 size-7
          transition="opacity duration-200"
          :class="wallpaperLoading ? 'op-50 pointer-events-none' : 'op-65 hover:op-100'"
          @click="loadWallpaper(true)"
        >
          <div :class="wallpaperLoading ? 'i-carbon-circle-dash animate-spin' : 'i-carbon-renew'" text-sm />
        </button>
      </div>
    </div>

    <!-- Settings (hidden in fullscreen) -->
    <Panel v-if="!isFullscreen" :title="t('settings')">
      <div p-5 flex="~ col gap-1">
        <div
          v-for="row in settingRows"
          :key="row.key"
          flex="~ items-center justify-between gap-4"
          border="b c-border" py-3 last:border-b-0
        >
          <span text="sm c-text" font-medium>{{ row.label }}</span>
          <StepperInput
            :model-value="settings[row.key]"
            :min="row.min" :max="row.max" :unit="row.unit"
            @update:model-value="settings[row.key] = $event as number"
          />
        </div>

        <!-- Auto-start: a looping on/off stepper switched by left/right arrows. -->
        <div flex="~ items-center justify-between gap-4" pt-3>
          <span text="sm c-text" font-medium>{{ t('auto_start') }}</span>
          <StepperInput
            :model-value="settings.autoStart"
            :options="AUTO_OPTIONS"
            @update:model-value="settings.autoStart = $event as boolean"
          />
        </div>
      </div>
    </Panel>

    <!-- Today's stats (hidden in fullscreen) -->
    <Panel v-if="!isFullscreen && today.date === todayStr() && today.rounds" :title="t('stats')">
      <div p-5 grid="~ cols-2 gap-4">
        <div flex="~ col gap-1">
          <span text="xs c-text-faint" tracking-widest font-mono uppercase>{{ t('stat_rounds') }}</span>
          <span text="3xl c-text" font="serif normal" tabular-nums>{{ today.rounds }}</span>
        </div>
        <div flex="~ col gap-1">
          <span text="xs c-text-faint" tracking-widest font-mono uppercase>{{ t('stat_time') }}</span>
          <span text="3xl c-text" font="serif normal" tabular-nums>{{ statTime }}</span>
        </div>
      </div>
    </Panel>

    <!-- How it works (hidden in fullscreen), rendered from Markdown -->
    <Panel :title="t('title.how_it_works')">
      <Markdown
        v-if="!isFullscreen"
        :content="[MD_EN, MD_ZH]"
      />
    </Panel>
  </div>
</template>

<style scoped>
/* The dial and clock scale to this container's width (cqw units below) so the
   layout grows in fullscreen yet never overflows a narrowed content column. */
.stage {
  container-type: inline-size;
}

/* A square dial holds the ring; the clock floats centred on top. */
.dial {
  width: clamp(15rem, 60cqw, 28rem);
  aspect-ratio: 1;
}

.ring-prog {
  transition: stroke-dashoffset 120ms linear;
}

.clock {
  font-size: clamp(2.6rem, 15cqw, 7rem);
}

/* DM Serif Display is not monospaced; the rolling digits carry their own fixed
   cells, so only the separator needs an em-locked box to keep the time steady. */
.clk-sep {
  display: inline-block;
  width: 0.32em;
  text-align: center;
}

/* Legibility scrim over the photo, toned to the chosen ink. This deviates from
   the "no gradients" homepage rule by design — it is functional contrast for the
   explicitly requested wallpaper, scoped to this stage only.
   .scrim-dark backs light ink on a dark photo; .scrim-light backs dark ink on a
   light photo. Both keep a soft top/bottom vignette for the status and credit. */
.scrim-dark {
  background:
    linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.42) 0%,
      rgba(0, 0, 0, 0.1) 28%,
      rgba(0, 0, 0, 0.1) 70%,
      rgba(0, 0, 0, 0.52) 100%
    ),
    rgba(0, 0, 0, 0.14);
}

.scrim-light {
  background:
    linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.5) 0%,
      rgba(255, 255, 255, 0.16) 28%,
      rgba(255, 255, 255, 0.16) 70%,
      rgba(255, 255, 255, 0.58) 100%
    ),
    rgba(255, 255, 255, 0.12);
}

/* Opposite-tone halo so the ink stays crisp over busy regions of the photo. */
.ink-shadow-dark {
  text-shadow:
    0 2px 16px rgba(0, 0, 0, 0.45),
    0 1px 3px rgba(0, 0, 0, 0.4);
}

.ink-shadow-light {
  text-shadow:
    0 2px 16px rgba(255, 255, 255, 0.6),
    0 1px 3px rgba(255, 255, 255, 0.55);
}
</style>
