<script setup lang="ts">
import type { TreeNode } from '@/components/TreeView.vue'
import { useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getFolderTree } from '@/api/files'
import { Button } from '@/components/shadcn/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shadcn/popover'
import TreeView from '@/components/TreeView.vue'

interface FolderTreeNode {
  path: string
  name: string
  timeStamp?: number
  children?: FolderTreeNode[]
}

interface Props {
  modelValue?: string
  inline?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  inline: false,
})
const emit = defineEmits<Emits>()

const { t } = useI18n()
const queryClient = useQueryClient()

const folderTree = ref<FolderTreeNode[]>([])
const isLoading = ref(false)
const error = ref(false)
const loaded = ref(false)
const popoverOpen = ref(false)

const selectedFolderId = ref<string>(props.modelValue || '')

// 将后端返回的文件夹树转换为 TreeView 所需的格式
function convertToTreeNodes(folders: FolderTreeNode[]): TreeNode[] {
  return folders.map(folder => ({
    id: folder.path || '__root__',
    label: folder.name,
    icon: folder.children && folder.children.length > 0 ? undefined : 'i-lucide-folder',
    children: folder.children ? convertToTreeNodes(folder.children) : undefined,
    data: folder,
  }))
}

const treeData = computed<TreeNode[]>(() => convertToTreeNodes(folderTree.value))

// 计算用于 TreeView 的 selected-id（需要统一格式）
const treeSelectedId = computed(() => {
  if (selectedFolderId.value === '' || selectedFolderId.value === '__root__') {
    return '__root__'
  }
  // 确保以 / 结尾，因为后端返回的 folder.path 都带尾部斜杠
  const result = selectedFolderId.value.endsWith('/') ? selectedFolderId.value : `${selectedFolderId.value}/`
  console.log('treeSelectedId:', result, 'selectedFolderId:', selectedFolderId.value)
  return result
})

// 根据当前选中的路径，自动展开父级节点
function getExpandedIdsForPath(path: string, _tree: FolderTreeNode[]): string[] {
  const expandedIds: string[] = []

  // 始终展开根节点
  expandedIds.push('__root__')

  // 如果是根目录，只展开根节点
  if (path === '' || path === '__root__') {
    return expandedIds
  }

  // 确保路径以 / 结尾
  const normalizedPath = path.endsWith('/') ? path : `${path}/`

  // 分析路径，找出所有父级路径
  const parts = normalizedPath.split('/').filter(Boolean)
  let currentPath = ''

  // 展开所有父级节点和当前节点
  for (let i = 0; i < parts.length; i++) {
    currentPath += `${parts[i]}/`
    expandedIds.push(currentPath)
  }

  return expandedIds
}

const defaultExpandedIds = computed(() => {
  return getExpandedIdsForPath(props.modelValue || '', folderTree.value)
})

// 获取当前选中文件夹的显示名称
const selectedFolderName = computed(() => {
  if (!props.modelValue) {
    return '(Root)'
  }

  const findFolder = (nodes: FolderTreeNode[], path: string): FolderTreeNode | null => {
    for (const node of nodes) {
      if (node.path === path) {
        return node
      }
      if (node.children) {
        const found = findFolder(node.children, path)
        if (found)
          return found
      }
    }
    return null
  }

  const folder = findFolder(folderTree.value, props.modelValue)
  return folder?.name || props.modelValue
})

// 检查路径是否存在于树中
function pathExistsInTree(path: string, tree: FolderTreeNode[]): boolean {
  if (!path || path === '__root__') {
    return true
  }

  for (const node of tree) {
    if (node.path === path) {
      return true
    }
    if (node.children && pathExistsInTree(path, node.children)) {
      return true
    }
  }
  return false
}

async function loadFolders() {
  if (loaded.value)
    return

  isLoading.value = true
  error.value = false
  try {
    const response = await getFolderTree('tree')
    folderTree.value = response.data.tree || []
    loaded.value = true

    // 检查当前选中的路径是否存在，不存在则重置到根目录
    if (props.modelValue && props.modelValue !== '__root__') {
      // 统一格式：确保检查时路径带尾部斜杠
      const pathToCheck = props.modelValue.endsWith('/') ? props.modelValue : `${props.modelValue}/`
      if (!pathExistsInTree(pathToCheck, folderTree.value)) {
        selectedFolderId.value = ''
        emit('update:modelValue', '')
      }
    }
  }
  catch (err) {
    console.error('Failed to load folder tree:', err)
    error.value = true
  }
  finally {
    isLoading.value = false
  }
}

// inline 模式下立即加载，否则监听 popover 打开状态
if (props.inline) {
  loadFolders()
}
else {
  // 非 inline 模式下，监听 popover 打开时加载（仅首次）
  watch(popoverOpen, (isOpen) => {
    if (isOpen && !loaded.value) {
      loadFolders()
    }
  })
}

// 监听 query invalidation 来重新加载数据
watch(() => queryClient.getQueryState(['folderTree'])?.isInvalidated, (isInvalidated) => {
  if (isInvalidated) {
    loaded.value = false
    loadFolders()
  }
})

function handleNodeClick(node: TreeNode) {
  const folderPath = node.id === '__root__' ? '' : node.id
  selectedFolderId.value = folderPath
  emit('update:modelValue', folderPath)
  // inline 模式不关闭 popover
  if (!props.inline) {
    popoverOpen.value = false
  }
}
</script>

<template>
  <div v-if="inline" class="w-full">
    <div v-if="isLoading" class="text-sm text-muted-foreground py-8 text-center">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="error" class="text-sm text-destructive py-8 text-center">
      Error loading folders
    </div>
    <TreeView
      v-else
      :data="treeData"
      :default-expanded-ids="defaultExpandedIds"
      :selected-id="treeSelectedId"
      class="max-h-[300px] overflow-y-auto"
      @node-click="handleNodeClick"
    />
  </div>
  <Popover v-else v-model:open="popoverOpen">
    <PopoverTrigger as-child>
      <Button variant="outline" class="font-normal text-left w-full justify-start">
        <div class="i-lucide-folder mr-2 h-4 w-4" />
        <span class="truncate">{{ selectedFolderName }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="p-1 w-70" align="start">
      <div v-if="isLoading" class="text-sm text-muted-foreground py-8 text-center">
        {{ t('common.loading') }}
      </div>
      <div v-else-if="error" class="text-sm text-destructive py-8 text-center">
        Error loading folders
      </div>
      <TreeView
        v-else
        :data="treeData"
        :default-expanded-ids="defaultExpandedIds"
        :selected-id="treeSelectedId"
        class="max-h-[300px] overflow-y-auto"
        @node-click="handleNodeClick"
      />
    </PopoverContent>
  </Popover>
</template>
