import { createApp } from 'vue'
import App from './App.vue'
import { registerModules } from './modules'
import './utils/preventLayoutShift'

import 'uno.css'
import './styles/main.css'
import 'vue-sonner/style.css'

const app = createApp(App)
registerModules(app)
app.mount('#app')
