import { ref } from 'vue'

export function useFileDialogs() {
  const showCreateFolderDialog = ref(false)
  const newFolderName = ref('')

  const showRenameDialog = ref(false)
  const renameTarget = ref({ name: '', isFolder: false })
  const newName = ref('')

  const showEditTagsDialog = ref(false)
  const editTagsTarget = ref('')
  const editingTags = ref<string[]>([])
  const newTagInput = ref('')

  const showMoveDialog = ref(false)
  const moveTargets = ref<Array<{ name: string, isFolder: boolean }>>([])
  const moveDestination = ref('')

  return {
    showCreateFolderDialog,
    newFolderName,
    showRenameDialog,
    renameTarget,
    newName,
    showEditTagsDialog,
    editTagsTarget,
    editingTags,
    newTagInput,
    showMoveDialog,
    moveTargets,
    moveDestination,
  }
}
