<script setup lang="ts">
import { cn } from "@/utils/shadcn"
import { DropzoneContextKey } from "./useDropzoneUpload"
import { inject } from "vue";

const props = defineProps<{
  class?: string
}>()

const context = inject(DropzoneContextKey)

if (!context) {
  throw new Error("DropzoneDescription must be used within a Dropzone")
}
</script>

<template>
  <p
    :id="context.rootDescriptionId"
    :class="cn('pb-1 text-sm text-muted-foreground', props.class)"
  >
    <slot />
  </p>
</template>
