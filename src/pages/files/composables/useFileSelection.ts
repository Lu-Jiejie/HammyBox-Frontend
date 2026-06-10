import type { Ref } from 'vue'
import { computed, ref, watch } from 'vue'

export function useFileSelection(allItems: Ref<Array<{ name: string, isFolder: boolean }>>) {
  const selectedFiles = ref<string[]>([])
  const isSelectAllPage = ref(false)

  const selectedCount = computed(() => selectedFiles.value.length)

  function toggleSelectAll() {
    if (isSelectAllPage.value) {
      selectedFiles.value = []
      isSelectAllPage.value = false
    }
    else {
      const newSelection = allItems.value
        .filter(item => !item.isFolder)
        .map(item => item.name)
      selectedFiles.value = [...newSelection]
      isSelectAllPage.value = true
    }
  }

  function toggleFileSelection(fileName: string) {
    const index = selectedFiles.value.indexOf(fileName)
    if (index > -1) {
      selectedFiles.value.splice(index, 1)
    }
    else {
      selectedFiles.value.push(fileName)
    }
    updateSelectAllState()
  }

  function updateSelectAllState() {
    const selectableFiles = allItems.value.filter(item => !item.isFolder)
    const selectedOnPage = selectableFiles.filter(item => selectedFiles.value.includes(item.name))
    isSelectAllPage.value = selectableFiles.length > 0 && selectedOnPage.length === selectableFiles.length
  }

  watch(allItems, () => {
    updateSelectAllState()
  })

  return {
    selectedFiles,
    isSelectAllPage,
    selectedCount,
    toggleSelectAll,
    toggleFileSelection,
  }
}
