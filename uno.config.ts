import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetWebFonts,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'
import presetAnimations from 'unocss-preset-animations'
import { presetShadcn } from 'unocss-preset-shadcn'

export default defineConfig({
  shortcuts: [
    ['header-sperator', 'mx-1 bg-border shrink-0 h-4 w-[1px]'],
  ],
  presets: [
    presetWind4(),
    presetAnimations(),
    presetShadcn(
      {
        color: 'neutral',
      },
      {
        componentLibrary: 'reka',
      },
    ),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
    presetWebFonts({
      fonts: {
        sans: ['Inter', 'Noto Sans SC'],
        serif: ['DM Serif Display', 'Noto Serif SC'],
        mono: ['Fira Code', 'Noto Sans SC'],
      },
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
  content: {
    pipeline: {
      include: [
        /\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/,
        '(components|src)/**/*.{js,ts}',
      ],
    },
  },
  // theme: {
  //   colors: {
  //     border: 'oklch(var(--border))',
  //     input: 'oklch(var(--input))',
  //     ring: 'oklch(var(--ring))',
  //     background: 'oklch(var(--background))',
  //     foreground: 'oklch(var(--foreground))',
  //     primary: {
  //       DEFAULT: 'oklch(var(--primary))',
  //       foreground: 'oklch(var(--primary-foreground))',
  //     },
  //     secondary: {
  //       DEFAULT: 'oklch(var(--secondary))',
  //       foreground: 'oklch(var(--secondary-foreground))',
  //     },
  //     destructive: {
  //       DEFAULT: 'oklch(var(--destructive))',
  //       foreground: 'oklch(var(--destructive-foreground))',
  //     },
  //     muted: {
  //       DEFAULT: 'oklch(var(--muted))',
  //       foreground: 'oklch(var(--muted-foreground))',
  //     },
  //     accent: {
  //       DEFAULT: 'oklch(var(--accent))',
  //       foreground: 'oklch(var(--accent-foreground))',
  //     },
  //     popover: {
  //       DEFAULT: 'oklch(var(--popover))',
  //       foreground: 'oklch(var(--popover-foreground))',
  //     },
  //     card: {
  //       DEFAULT: 'oklch(var(--card))',
  //       foreground: 'oklch(var(--card-foreground))',
  //     },
  //     chart1: 'oklch(var(--chart1))',
  //     chart2: 'oklch(var(--chart2))',
  //     chart3: 'oklch(var(--chart3))',
  //     chart4: 'oklch(var(--chart4))',
  //     chart5: 'oklch(var(--chart5))',
  //     sidebar: {
  //       DEFAULT: 'oklch(var(--sidebar-background))',
  //       background: 'oklch(var(--sidebar-background))',
  //       foreground: 'oklch(var(--sidebar-foreground))',
  //       primary: {
  //         DEFAULT: 'oklch(var(--sidebar-primary))',
  //         foreground: 'oklch(var(--sidebar-primary-foreground))',
  //       },
  //       accent: {
  //         DEFAULT: 'oklch(var(--sidebar-accent))',
  //         foreground: 'oklch(var(--sidebar-accent-foreground))',
  //       },
  //       border: 'oklch(var(--sidebar-border))',
  //       ring: 'oklch(var(--sidebar-ring))',
  //     },
  //   },
  // },
})
