import nprogress from 'nprogress'
import 'nprogress/nprogress.css'

import '@/styles/nprogress.css'

export function registerModules() {
  nprogress.configure({
    showSpinner: false,
    speed: 500,
    trickleSpeed: 200,
  })
}
