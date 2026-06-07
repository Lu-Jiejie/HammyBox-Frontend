<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/shadcn/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/shadcn/field'
import { Input } from '@/components/shadcn/input'
import { useAuth } from '@/composables/useAuth'
import { cn } from '@/utils/shadcn'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const router = useRouter()
const route = useRoute()
const { loginAdmin, adminLoading } = useAuth()

const username = ref('')
const password = ref('')

async function onSubmit() {
  if (adminLoading.value || !username.value || !password.value)
    return

  const ok = await loginAdmin(username.value, password.value)
  if (ok) {
    const redirect = route.query.redirect as string | undefined
    router.replace(redirect || '/admin')
  }
}
</script>

<template>
  <div :class="cn('flex flex-col gap-6', props.class)">
    <Card>
      <CardHeader>
        <CardTitle class="text-2xl">
          {{ $t('auth.adminLogin.title') }}
        </CardTitle>
        <CardDescription>
          {{ $t('auth.adminLogin.subTitle') }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="onSubmit">
          <FieldGroup>
            <Field>
              <FieldLabel for="adminUsername">
                {{ $t('auth.adminLogin.username') }}
              </FieldLabel>
              <Input
                id="adminUsername"
                v-model="username"
                type="text"
                :placeholder="$t('auth.adminLogin.usernamePlaceholder')"
                autocomplete="username"
                required
                :disabled="adminLoading"
              />
            </Field>
            <Field>
              <FieldLabel for="adminPassword">
                {{ $t('auth.adminLogin.password') }}
              </FieldLabel>
              <Input
                id="adminPassword"
                v-model="password"
                type="password"
                :placeholder="$t('auth.adminLogin.passwordPlaceholder')"
                autocomplete="current-password"
                required
                :disabled="adminLoading"
              />
            </Field>
            <Field>
              <Button type="submit" :disabled="adminLoading">
                <div v-if="adminLoading" class="i-lucide-loader-circle mr-2 size-4 animate-spin" />
                {{ $t('actions.login') }}
              </Button>
            </Field>
            <FieldSeparator />
            <Field>
              <Button
                variant="outline"
                type="button"
                @click="router.push('/login')"
              >
                {{ $t('actions.toUploadPage') }}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
