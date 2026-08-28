import axios from '@/utils/axios'

export interface FileItem {
  name: string
  metadata?: {
    FileName?: string
    FileType?: string
    FileSize?: number
    UploadTime?: string
    LastModified?: string
    MimeType?: string
    Channel?: string
    ChannelName?: string
    TimeStamp?: number
    Tags?: string[]
    FileSizeBytes?: number
  }
}

export type FolderItem = string

export interface FileListParams {
  start?: number
  count?: number
  folder?: string
  search?: string
  recursive?: boolean
  channel?: string
  channelName?: string
  listType?: string
  accessStatus?: string
  label?: string
  fileType?: string
  includeTags?: string
  excludeTags?: string
}

export interface FileListResponse {
  files: FileItem[]
  folders: FolderItem[]
  totalCount: number
  directFileCount: number
  directFolderCount: number
  returnedCount: number
}

// 获取文件列表（管理后台/文件管理器使用）
export function getFileList(params: FileListParams = {}) {
  return axios.get<FileListResponse>('/manage/list', { params })
}

// 删除文件或文件夹
export function deleteFile(fileId: string, isFolder = false) {
  if (isFolder) {
    return axios.delete('/manage/folders', { data: { path: fileId, recursive: true } })
  }
  const path = fileId.replace(/\//g, ',')
  return axios.post(`/manage/delete/${path}`, null, {
    params: { folder: false },
  })
}

// 批量删除（单请求；失败文件自动回退为逐文件删除）
export async function batchDelete(fileIds: string[]) {
  try {
    const { data } = await axios.post<{ success: boolean, deleted: string[], failed: Array<{ path: string, error: string }> }>(
      '/manage/batch/delete',
      { paths: fileIds },
    )
    // 部分失败时，对失败项回退为逐文件删除
    const failedResults: PromiseSettledResult<unknown>[] = []
    for (const item of data.failed || []) {
      failedResults.push(await deleteFile(item.path).then(
        value => ({ status: 'fulfilled' as const, value }),
        reason => ({ status: 'rejected' as const, reason }),
      ))
    }
    return failedResults
  }
  catch {
    // 批量接口不可用（如旧版本后端），回退为逐文件并发删除
    const results = await Promise.allSettled(
      fileIds.map(id => deleteFile(id)),
    )
    return results
  }
}

// 移动文件
export function moveFile(fileId: string, targetDir: string, isFolder = false) {
  const path = fileId.replace(/\//g, ',')
  return axios.post(`/manage/move/${path}`, null, {
    params: { dist: targetDir, folder: isFolder },
  })
}

// 批量移动（单请求；失败文件自动回退为逐文件移动）
export async function batchMove(fileIds: string[], targetDir: string) {
  try {
    const { data } = await axios.post<{ success: boolean, processed: Array<{ fileId: string, newFileId: string }>, failed: Array<{ path: string, error: string }> }>(
      '/manage/batch/move',
      { paths: fileIds, dist: targetDir },
    )
    // 部分失败时，对失败项回退为逐文件移动
    const failedResults: PromiseSettledResult<unknown>[] = []
    for (const item of data.failed || []) {
      failedResults.push(await moveFile(item.path, targetDir).then(
        value => ({ status: 'fulfilled' as const, value }),
        reason => ({ status: 'rejected' as const, reason }),
      ))
    }
    return failedResults
  }
  catch {
    // 批量接口不可用（如旧版本后端），回退为逐文件并发移动
    const results = await Promise.allSettled(
      fileIds.map(id => moveFile(id, targetDir)),
    )
    return results
  }
}

// 重命名文件
export function renameFile(fileId: string, newFileId: string) {
  const path = fileId.replace(/\//g, ',')
  return axios.post(`/manage/rename/${path}`, { newFileId })
}

// 重命名文件夹
export function renameFolder(oldPath: string, newPath: string) {
  return axios.patch('/manage/folders', { oldPath, newPath })
}

// 更新文件标签
export function updateFileTags(fileId: string, tags: string[]) {
  const path = fileId.replace(/\//g, ',')
  return axios.post(`/manage/tags/${path}`, { tags })
}

// 创建文件夹
export function createFolder(path: string, createParents = false) {
  return axios.post('/manage/folders', { path, createParents })
}

// 获取文件夹树
export function getFolderTree(format: 'tree' | 'flat' = 'tree') {
  return axios.get('/manage/folders/tree', { params: { format } })
}
