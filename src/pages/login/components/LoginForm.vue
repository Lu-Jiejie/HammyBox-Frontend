<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
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
import { cn } from '@/utils/shadcn'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div :class="cn('flex flex-col gap-6', props.class)">
    <Card>
      <CardHeader>
        <CardTitle class="text-2xl">
          {{ $t('auth.uploadLogin.title', { name: 'File Hub' }) }}
        </CardTitle>
        <CardDescription>
          {{ $t('auth.uploadLogin.subTitle') }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <FieldGroup>
            <Field>
              <FieldLabel for="email">
                {{ $t('fileds.authCode') }}
              </FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="******"
                required
              />
            </Field>
            <Field>
              <Button type="submit">
                {{ $t('actions.login') }}
              </Button>
            </Field>
            <FieldSeparator />
            <Field>
              <Button variant="outline" type="button">
                {{ $t('actions.toAdminPage') }}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
