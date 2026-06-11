import type { FileItem } from '@/api/files'
import { ref } from 'vue'

export function useFileDialogs() {
  const showCreateFolderDialog = ref(false)
  const newFolderName = ref('')

  const showRenameDialog = ref(false)
  const renameTarget = ref({ name: '', isFolder: false })
  const newName = ref('')

  const showEditTagsDialog = ref(false)
  const editTagsTarget = ref('')
  const editTagsFile = ref<FileItem | null>(null)

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
    editTagsFile,
    showMoveDialog,
    moveTargets,
    moveDestination,
  }
}
