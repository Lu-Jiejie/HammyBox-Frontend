import nprogress from 'nprogress'
import 'nprogress/nprogress.css'

import '@/styles/nprogress.css'

export function registerModules() {
  nprogress.configure({
    showSpinner: true,
    speed: 500,
    trickleSpeed: 200,
  })
}
