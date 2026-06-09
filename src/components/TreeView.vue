<script setup lang="ts">
import { computed, ref } from 'vue'
import { cn } from '@/utils/shadcn'

export interface TreeNode {
  id: string
  label: string
  icon?: string
  children?: TreeNode[]
  data?: any
}

interface Props {
  data: TreeNode[]
  class?: string
  onNodeClick?: (node: TreeNode) => void
  onNodeExpand?: (nodeId: string, expanded: boolean) => void
  defaultExpandedIds?: string[]
  showLines?: boolean
  showIcons?: boolean
  selectable?: boolean
  selectedId?: string
  indent?: number
}

interface Emits {
  (e: 'nodeClick', node: TreeNode): void
  (e: 'nodeExpand', nodeId: string, expanded: boolean): void
  (e: 'update:selectedId', id: string): void
}

const props = withDefaults(defineProps<Props>(), {
  defaultExpandedIds: () => [],
  showLines: false,
  showIcons: true,
  selectable: true,
  indent: 20,
})

const emit = defineEmits<Emits>()

const expandedIds = ref<Set<string>>(new Set(props.defaultExpandedIds))

function toggleExpanded(nodeId: string, hasChildren: boolean) {
  if (!hasChildren)
    return

  const isExpanded = expandedIds.value.has(nodeId)
  if (isExpanded) {
    expandedIds.value.delete(nodeId)
  }
  else {
    expandedIds.value.add(nodeId)
  }
  emit('nodeExpand', nodeId, !isExpanded)
}

function handleNodeClick(node: TreeNode, hasChildren: boolean) {
  toggleExpanded(node.id, hasChildren)
  if (props.selectable) {
    emit('update:selectedId', node.id)
  }
  emit('nodeClick', node)
}

function getDefaultIcon(hasChildren: boolean, isExpanded: boolean): string {
  if (hasChildren) {
    return isExpanded ? 'i-lucide-folder-open' : 'i-lucide-folder'
  }
  return 'i-lucide-file'
}

interface RenderNodeContext {
  node: TreeNode
  level: number
  isLast: boolean
  parentPath: boolean[]
}

function buildNodeList(nodes: TreeNode[], level = 0, parentPath: boolean[] = []): RenderNodeContext[] {
  const result: RenderNodeContext[] = []

  nodes.forEach((node, index) => {
    const isLast = index === nodes.length - 1
    const currentPath = [...parentPath, isLast]

    result.push({ node, level, isLast, parentPath: currentPath })

    const hasChildren = (node.children?.length ?? 0) > 0
    const isExpanded = expandedIds.value.has(node.id)

    if (hasChildren && isExpanded && node.children) {
      result.push(...buildNodeList(node.children, level + 1, currentPath))
    }
  })

  return result
}

const flattenedNodes = computed(() => buildNodeList(props.data))
</script>

<template>
  <div :class="cn('w-full', props.class)">
    <div
      v-for="item in flattenedNodes"
      :key="item.node.id"
      class="select-none"
    >
      <div
        :class="cn(
          'flex items-center py-2 px-3 cursor-pointer transition-all duration-200 relative group rounded-md',
          'hover:bg-muted',
          selectedId === item.node.id && 'bg-muted/80',
        )"
        :style="{ paddingLeft: `${item.level * indent + 8}px` }"
        @click="handleNodeClick(item.node, (item.node.children?.length ?? 0) > 0)"
      >
        <!-- Tree Lines -->
        <div v-if="showLines && item.level > 0" class="pointer-events-none bottom-0 left-0 top-0 absolute">
          <div
            v-for="(isLastInPath, pathIndex) in item.parentPath"
            :key="pathIndex"
            class="border-l border-border/40 bottom-0 top-0 absolute"
            :style="{
              left: `${pathIndex * indent + 12}px`,
              display: pathIndex === item.parentPath.length - 1 && isLastInPath ? 'none' : 'block',
            }"
          />
          <div
            class="border-t border-border/40 top-1/2 absolute"
            :style="{
              left: `${(item.level - 1) * indent + 12}px`,
              width: `${indent - 4}px`,
              transform: 'translateY(-1px)',
            }"
          />
          <div
            v-if="item.isLast"
            class="border-l border-border/40 top-0 absolute"
            :style="{
              left: `${(item.level - 1) * indent + 12}px`,
              height: '50%',
            }"
          />
        </div>

        <!-- Expand Icon -->
        <div
          class="mr-1 flex h-4 w-4 transition-transform duration-200 items-center justify-center"
          :style="{
            transform: (item.node.children?.length ?? 0) > 0 && expandedIds.has(item.node.id) ? 'rotate(90deg)' : 'rotate(0deg)',
          }"
        >
          <div
            v-if="(item.node.children?.length ?? 0) > 0"
            class="i-lucide-chevron-right text-muted-foreground h-3 w-3"
          />
        </div>

        <!-- Node Icon -->
        <div
          v-if="showIcons"
          class="text-muted-foreground mr-2 flex h-4 w-4 items-center justify-center"
        >
          <div
            :class="item.node.icon || getDefaultIcon((item.node.children?.length ?? 0) > 0, expandedIds.has(item.node.id))"
            class="h-4 w-4"
          />
        </div>

        <!-- Label -->
        <span class="font text-sm flex-1 truncate">
          {{ item.node.label }}
        </span>
      </div>
    </div>
  </div>
</template>
