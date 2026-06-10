import type { QueryClient } from '@tanstack/vue-query'
import { batchDelete, batchMove, createFolder, deleteFile, moveFile, renameFile, updateFileTags } from '@/api/files'

export function useFileOperations(queryClient: QueryClient, t: (key: string) => string, toast: any) {
  async function handleDelete(fileName: string, isFolder: boolean) {
    await deleteFile(fileName, isFolder)
    toast.success(t('files.deleteSuccess'))
    queryClient.invalidateQueries({ queryKey: ['fileList'] })
    if (isFolder) {
      queryClient.invalidateQueries({ queryKey: ['folderTree'] })
    }
  }

  async function handleBatchDelete(fileIds: string[]) {
    await batchDelete(fileIds)
    toast.success(t('files.batchDeleteSuccess'))
    queryClient.invalidateQueries({ queryKey: ['fileList'] })
  }

  async function handleCreateFolder(path: string) {
    await createFolder(path, false)
    toast.success(t('files.createFolderSuccess'))
    queryClient.invalidateQueries({ queryKey: ['fileList'] })
    queryClient.invalidateQueries({ queryKey: ['folderTree'] })
  }

  async function handleRename(oldPath: string, newPath: string, isFolder: boolean) {
    await renameFile(oldPath, newPath)
    toast.success('重命名成功')
    queryClient.invalidateQueries({ queryKey: ['fileList'] })
    if (isFolder) {
      queryClient.invalidateQueries({ queryKey: ['folderTree'] })
    }
  }

  async function handleUpdateTags(fileName: string, tags: string[]) {
    await updateFileTags(fileName, tags)
    toast.success('标签更新成功')
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
    toast.success('移动成功')
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
