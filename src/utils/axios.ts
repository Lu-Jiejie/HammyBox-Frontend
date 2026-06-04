import axios from 'axios'

const instance = axios.create({
  baseURL: import.meta.env.PROD ? '/' : '/api',
  withCredentials: true,
})
export default instance
