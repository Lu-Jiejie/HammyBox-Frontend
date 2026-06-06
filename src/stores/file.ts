import { defineStore } from 'pinia'
import { ref } from 'vue'
import { LocalStorageKey } from '@/types'
import axiosInstance from '@/utils/axios'

export interface FileItem {
  name: string
  metadata?: {
    channel?: string
    timeStamp?: string
    fileMime?: string
    fileSize?: string
    [key: string]: any
  }
  [key: string]: any
}

export interface FileListState {
  files: FileItem[]
  folders: string[]
  totalCount: number
  returnedCount: number
  indexLastUpdated: string
  isIndexedResponse: boolean
}

/**
 * 数据传输对象转化器 (DTO Transformer)
 * 隔离后端原始响应结构，统一转换为符合前端规范的 FileListState 格式
 */
function transformFileList(backendData: any): FileListState {
  const res = backendData?.data || backendData

  const cleanFiles: FileItem[] = (res?.files || []).map((file: any) => ({
    name: file.name,
    metadata: file.metadata
      ? {
          channel: file.metadata.Channel || '',
          timeStamp: file.metadata.TimeStamp || '',
          fileMime: file.metadata['File-Mime'] || '',
          fileSize: file.metadata['File-Size'] || '',
        }
      : undefined,
    ...file,
  }))

  return {
    files: cleanFiles,
    folders: res?.directories || res?.folders || [],
    totalCount: Number(res?.totalCount ?? 0),
    returnedCount: Number(res?.returnedCount ?? 0),
    indexLastUpdated: String(res?.indexLastUpdated || ''),
    isIndexedResponse: Boolean(res?.isIndexedResponse ?? true),
  }
}

/**
 * 将筛选对象转化为 URL 查询参数
 */
function toQueryString(filters: Record<string, any[]>): string {
  const allowedKeys = ['accessStatus', 'listType', 'label', 'fileType', 'channel', 'channelName']
  return Object.entries(filters)
    .filter(([key, val]) => allowedKeys.includes(key) && Array.isArray(val) && val.length > 0)
    .map(([key, val]) => `&${key}=${encodeURIComponent(val.join(','))}`)
    .join('')
}

export const useFileStore = defineStore('file', () => {
  // 核心状态声明
  const fileList = ref<FileListState>({
    files: [],
    folders: [],
    totalCount: 0,
    returnedCount: 0,
    indexLastUpdated: '',
    isIndexedResponse: true,
  })

  /* ==========================================
   * 1. 本地同步数据维护 (Actions)
   * ========================================== */

  function addFile(newFile: FileItem) {
    fileList.value.files.push(newFile)
    fileList.value.totalCount++
    fileList.value.returnedCount++
  }

  function addFolder(folderName: string): boolean {
    const cleanFolder = folderName.trim().replace(/\/$/, '')
    if (cleanFolder && !fileList.value.folders.includes(cleanFolder)) {
      fileList.value.folders.push(cleanFolder)
      return true
    }
    return false
  }

  function removeFile(fileName: string) {
    const originalLength = fileList.value.files.length
    fileList.value.files = fileList.value.files.filter(file => file.name !== fileName)

    const removedCount = originalLength - fileList.value.files.length
    fileList.value.totalCount = Math.max(0, fileList.value.totalCount - removedCount)
    fileList.value.returnedCount = Math.max(0, fileList.value.returnedCount - removedCount)
  }

  function removeFolder(folderPath: string) {
    const originalLength = fileList.value.files.length

    // 递归剔除归属于该目录下的所有文件与子文件夹
    fileList.value.files = fileList.value.files.filter(file => !file.name.startsWith(`${folderPath}/`))
    fileList.value.folders = fileList.value.folders.filter(
      folder => folder !== folderPath && !folder.startsWith(`${folderPath}/`),
    )

    const removedCount = originalLength - fileList.value.files.length
    fileList.value.totalCount = Math.max(0, fileList.value.totalCount - removedCount)
    fileList.value.returnedCount = Math.max(0, fileList.value.returnedCount - removedCount)
  }

  function moveFile(oldPath: string, newPath: string, isFolder = false, currentFolderPath = '') {
    if (isFolder) {
      const oldFolderIndex = fileList.value.folders.indexOf(oldPath)
      if (oldFolderIndex !== -1)
        fileList.value.folders.splice(oldFolderIndex, 1)

      // 同步更新子文件的路径前缀
      fileList.value.files.forEach((file) => {
        if (file.name.startsWith(`${oldPath}/`)) {
          file.name = file.name.replace(`${oldPath}/`, `${newPath}/`)
        }
      })
    }
    else {
      const fileIndex = fileList.value.files.findIndex(file => file.name === oldPath)
      if (fileIndex !== -1)
        fileList.value.files.splice(fileIndex, 1)
    }

    // 推导并补充直接子目录至当前视图
    if (newPath.startsWith(currentFolderPath)) {
      const pathArr = newPath.substring(currentFolderPath.length).split('/')
      if (pathArr.length > 1) {
        const newFolder = currentFolderPath + pathArr[0]
        if (!fileList.value.folders.includes(newFolder)) {
          fileList.value.folders.push(newFolder)
        }
      }
    }
  }

  function getFilesInFolder(folderPath: string) {
    const files = fileList.value.files.filter(file => file.name.startsWith(`${folderPath}/`))
    const subFolders = fileList.value.folders.filter(folder => folder.startsWith(`${folderPath}/`))
    return { files, folders: subFolders }
  }

  /* ==========================================
   * 2. 异步网络流请求 (Actions)
   * ========================================== */

  async function refreshFileList(targetDir: string, search = '', includeTags = '', excludeTags = '', filters = {}) {
    const cleanSearch = search.trim()
    try {
      let url = `/manage/list?count=60&dir=${targetDir}&search=${encodeURIComponent(cleanSearch)}`
      if (includeTags)
        url += `&includeTags=${encodeURIComponent(includeTags)}`
      if (excludeTags)
        url += `&excludeTags=${encodeURIComponent(excludeTags)}`
      url += toQueryString(filters)

      const response = await axiosInstance.get(url, { silentAuth: true })

      if (!response.data.isIndexedResponse) {
        // ElMessage.warning(i18n.global.t('dashboard.indexingWarning'))
      }

      // 全量数据通过 DTO 转化器覆写状态
      fileList.value = transformFileList(response.data)
      return true
    }
    catch (error) {
      console.error('Error refreshing file list:', error)
      return false
    }
  }

  async function loadMoreFiles(targetDir: string, search = '', includeTags = '', excludeTags = '', count = 60, filters = {}) {
    const cleanSearch = search.trim()
    try {
      const start = fileList.value.files.length
      let url = `/manage/list?dir=${targetDir}&start=${start}&count=${count}&search=${encodeURIComponent(cleanSearch)}`
      if (includeTags)
        url += `&includeTags=${encodeURIComponent(includeTags)}`
      if (excludeTags)
        url += `&excludeTags=${encodeURIComponent(excludeTags)}`
      url += toQueryString(filters)

      const response = await axiosInstance.get(url)
      const incomingState = transformFileList(response.data)

      // 增量合并文件
      if (incomingState.files.length > 0) {
        fileList.value.files.push(...incomingState.files)
      }

      // 增量合并目录并去重
      incomingState.folders.forEach((dir) => {
        if (!fileList.value.folders.includes(dir)) {
          fileList.value.folders.push(dir)
        }
      })

      // 覆盖更新元数据计数器
      fileList.value.totalCount = incomingState.totalCount
      fileList.value.returnedCount = incomingState.returnedCount
      fileList.value.indexLastUpdated = incomingState.indexLastUpdated

      return true
    }
    catch (error) {
      console.error('Error loading more files:', error)
      return false
    }
  }

  return {
    fileList,
    addFile,
    addFolder,
    removeFile,
    removeFolder,
    moveFile,
    getFilesInFolder,
    refreshFileList,
    loadMoreFiles,
  }
}, {
  persist: {
    key: LocalStorageKey.FILE_STORE,
    pick: ['fileList'],
  },
})
