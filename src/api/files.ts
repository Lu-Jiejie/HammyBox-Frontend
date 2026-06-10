import type { AxiosProgressEvent } from 'axios'
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

export interface FolderListResponse {
  success: boolean
  currentFolder: string
  folders: FolderItem[]
  files: FileItem[]
  totalFolders: number
  totalFiles: number
}

export interface QuotaStats {
  quotaStats: Record<string, { sizeMB: number, count: number }>
  totalSizeMB: number
  totalCount: number
  lastUpdated?: string
}

// 获取文件列表（旧接口，管理后台使用）
export function getFileList(params: FileListParams = {}) {
  return axios.get<FileListResponse>('/manage/list', { params })
}

// 列出文件夹内容（新接口，文件管理器使用）
export function listFolderContents(folder = '', start = 0, count = 50) {
  return axios.get<FolderListResponse>('/manage/folders/list', {
    params: { folder, start, count },
  })
}

// 获取容量统计
export function getQuotaStats() {
  return axios.get<QuotaStats>('/manage/quota')
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

// 批量删除
export async function batchDelete(fileIds: string[]) {
  const results = await Promise.allSettled(
    fileIds.map(id => deleteFile(id)),
  )
  return results
}

// 移动文件
export function moveFile(fileId: string, targetDir: string, isFolder = false) {
  const path = fileId.replace(/\//g, ',')
  return axios.post(`/manage/move/${path}`, null, {
    params: { dist: targetDir, folder: isFolder },
  })
}

// 批量移动
export async function batchMove(fileIds: string[], targetDir: string) {
  const results = await Promise.allSettled(
    fileIds.map(id => moveFile(id, targetDir)),
  )
  return results
}

// 重命名文件
export function renameFile(fileId: string, newFileId: string) {
  const path = fileId.replace(/\//g, ',')
  return axios.post(`/manage/rename/${path}`, { newFileId })
}

// 修改文件元数据
export function updateFileMetadata(fileId: string, metadata: { FileName?: string, FileType?: string }) {
  const path = fileId.replace(/\//g, ',')
  return axios.patch(`/manage/metadata/${path}`, metadata)
}

// 获取文件标签
export function getFileTags(fileId: string) {
  const path = fileId.replace(/\//g, ',')
  return axios.get<{ tags: string[] }>(`/manage/tags/${path}`)
}

// 更新文件标签
export function updateFileTags(fileId: string, tags: string[]) {
  const path = fileId.replace(/\//g, ',')
  return axios.post(`/manage/tags/${path}`, { tags })
}

// 批量标签操作
export function batchTagOperation(fileIds: string[], action: 'set' | 'add' | 'remove', tags: string[]) {
  return axios.post('/manage/tags/batch', {
    fileIds,
    action,
    tags,
  })
}

// 标签自动补全
export function getTagSuggestions(prefix: string, limit = 20) {
  return axios.get<{ tags: string[] }>('/manage/tags/autocomplete', {
    params: { prefix, limit },
  })
}

// 下载文件
export function downloadFile(fileId: string, onProgress?: (progress: AxiosProgressEvent) => void) {
  const cleanFileId = fileId.startsWith('/file/') ? fileId.replace('/file/', '') : fileId
  return axios.get(`/file/${cleanFileId}`, {
    responseType: 'blob',
    onDownloadProgress: onProgress,
  })
}

// 创建文件夹
export function createFolder(path: string, createParents = false) {
  return axios.post('/manage/folders', { path, createParents })
}

// 删除文件夹
export function deleteFolder(path: string, recursive = false) {
  return axios.delete('/manage/folders', { data: { path, recursive } })
}

// 获取文件夹树
export function getFolderTree(format: 'tree' | 'flat' = 'tree') {
  return axios.get('/manage/folders/tree', { params: { format } })
}

// 列出文件夹内容
export function listFolder(folder = '', start = 0, count = 50) {
  return axios.get('/manage/folders/list', { params: { folder, start, count } })
}
