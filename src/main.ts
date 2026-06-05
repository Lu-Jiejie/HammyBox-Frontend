import { createApp } from 'vue'
import App from './App.vue'
import { registerModules } from './modules'

import 'uno.css'
import './styles/main.css'

const app = createApp(App)
registerModules(app)
app.mount('#app')
