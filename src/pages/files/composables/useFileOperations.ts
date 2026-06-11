import type { QueryClient } from '@tanstack/vue-query'
import { batchDelete, batchMove, createFolder, deleteFile, moveFile, renameFile, updateFileTags } from '@/api/files'

export function useFileOperations(queryClient: QueryClient, t: (key: string) => string, toast: any) {
  async function handleDelete(fileName: string, isFolder: boolean) {
    await deleteFile(fileName, isFolder)
    toast.success(t('pages.files.actions.deleteSuccess'))
    queryClient.invalidateQueries({ queryKey: ['fileList'] })
    if (isFolder) {
      queryClient.invalidateQueries({ queryKey: ['folderTree'] })
    }
  }

  async function handleBatchDelete(fileIds: string[]) {
    await batchDelete(fileIds)
    toast.success(t('pages.files.actions.batchDeleteSuccess'))
    queryClient.invalidateQueries({ queryKey: ['fileList'] })
  }

  async function handleCreateFolder(path: string) {
    await createFolder(path, false)
    toast.success(t('pages.files.actions.createFolderSuccess'))
    queryClient.invalidateQueries({ queryKey: ['fileList'] })
    queryClient.invalidateQueries({ queryKey: ['folderTree'] })
  }

  async function handleRename(oldPath: string, newPath: string, isFolder: boolean) {
    await renameFile(oldPath, newPath)
    toast.success(t('pages.files.actions.renameSuccess'))
    queryClient.invalidateQueries({ queryKey: ['fileList'] })
    if (isFolder) {
      queryClient.invalidateQueries({ queryKey: ['folderTree'] })
    }
  }

  async function handleUpdateTags(fileName: string, tags: string[]) {
    await updateFileTags(fileName, tags)
    toast.success(t('pages.files.actions.updateTagsSuccess'))
    queryClient.invalidateQueries({ queryKey: ['fileList'] })
  }

  async function handleMove(targets: Array<{ name: string, isFolder: boolean }>, destination: string) {
    const hasFolder = targets.some(t => t.isFolder)
    if (targets.length === 1) {
      const target = targets[0]
      await moveFile(target.name, destination, target.isFolder)
    }
    else {
      await batchMove(targets.map(t => t.name), destination)
    }
    toast.success(t('pages.files.actions.moveSuccess'))
    queryClient.invalidateQueries({ queryKey: ['fileList'] })
    if (hasFolder) {
      queryClient.invalidateQueries({ queryKey: ['folderTree'] })
    }
  }

  return {
    handleDelete,
    handleBatchDelete,
    handleCreateFolder,
    handleRename,
    handleUpdateTags,
    handleMove,
  }
}
