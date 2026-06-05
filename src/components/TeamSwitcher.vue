<script setup lang="ts">
import type { Component } from 'vue'

import { ChevronsUpDown, Plus } from '@lucide/vue'
import { ref } from 'vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/shadcn/sidebar'

const props = defineProps<{
  teams: {
    name: string
    logo: Component
    plan: string
  }[]
}>()

const { isMobile } = useSidebar()
const activeTeam = ref(props.teams[0]!)
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent"
          >
            <div class="text-sidebar-primary-foreground rounded-lg bg-sidebar-primary flex size-8 aspect-square items-center justify-center">
              <component :is="activeTeam.logo" class="size-4" />
            </div>
            <div class="text-sm leading-tight text-left flex-1 grid">
              <span class="font-medium truncate">
                {{ activeTeam.name }}
              </span>
              <span class="text-xs truncate">{{ activeTeam.plan }}</span>
            </div>
            <ChevronsUpDown class="ml-auto" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="rounded-lg min-w-56 w-(--reka-dropdown-menu-trigger-width)"
          align="start"
          :side="isMobile ? 'bottom' : 'right'"
          :side-offset="4"
        >
          <DropdownMenuLabel class="text-xs text-muted-foreground">
            Teams
          </DropdownMenuLabel>
          <DropdownMenuItem
            v-for="(team, index) in teams"
            :key="team.name"
            class="p-2 gap-2"
            @click="activeTeam = team"
          >
            <div class="border rounded-sm flex size-6 items-center justify-center">
              <component :is="team.logo" class="shrink-0 size-3.5" />
            </div>
            {{ team.name }}
            <DropdownMenuShortcut>⌘{{ index + 1 }}</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="p-2 gap-2">
            <div class="border rounded-md bg-transparent flex size-6 items-center justify-center">
              <Plus class="size-4" />
            </div>
            <div class="text-muted-foreground font-medium">
              Add team
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
