import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: ['./src/components/shadcn/**', './old/**'],
    unocss: true,
    formatters: true,
    pnpm: true,
  },
)
