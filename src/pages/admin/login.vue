<script setup lang="ts">
import AdminLoginForm from './components/AdminLoginForm.vue'

definePage({
  meta: {
    title: '管理员登录',
  },
})
</script>

<template>
  <div class="p-6 place-center w-full inset-0 top-14 fixed">
    <div max-w-100 w-full>
      <AdminLoginForm />
    </div>
  </div>
</template>
