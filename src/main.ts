import { createApp } from 'vue'
import App from './App.vue'
import { registerModules } from './modules'

import './styles/main.css'
import 'uno.css'

const app = createApp(App)
registerModules(app)
app.mount('#app')
