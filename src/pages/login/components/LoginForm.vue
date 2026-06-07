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
} from '@/components/shadcn/field'
import { Input } from '@/components/shadcn/input'
import { useAuth } from '@/composables/useAuth'
import { cn } from '@/utils/shadcn'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const router = useRouter()
const route = useRoute()
const { login, loading } = useAuth()

const password = ref('')

async function onSubmit() {
  if (loading.value || !password.value)
    return

  const ok = await login(password.value)
  if (ok) {
    const redirect = route.query.redirect as string | undefined
    router.replace(redirect || '/')
  }
}
</script>

<template>
  <div :class="cn('flex flex-col gap-6', props.class)">
    <Card>
      <CardHeader>
        <CardTitle class="text-2xl">
          {{ $t('auth.login.title') }}
        </CardTitle>
        <CardDescription>
          {{ $t('auth.login.subTitle') }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="onSubmit">
          <FieldGroup>
            <Field>
              <FieldLabel for="password">
                {{ $t('auth.login.password') }}
              </FieldLabel>
              <Input
                id="password"
                v-model="password"
                type="password"
                :placeholder="$t('auth.login.passwordPlaceholder')"
                autocomplete="current-password"
                required
                :disabled="loading"
              />
            </Field>
            <Field>
              <Button type="submit" :disabled="loading" class="w-full">
                <div v-if="loading" class="i-lucide-loader-circle mr-2 size-4 animate-spin" />
                {{ $t('actions.login') }}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
