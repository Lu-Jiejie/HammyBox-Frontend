import { defineStore } from 'pinia'
import { ref } from 'vue'
import { LocalStorageKey } from '@/types'
import axios from '@/utils/axios'

interface FileItem {
  name: string
  [key: string]: any
}

interface FileList {
  files: FileItem[]
  folders: string[]
  isIndexedResponse?: boolean
}

function toQueryString(filters: Record<string, any[]>): string {
  let params = ''
  const keys = ['accessStatus', 'listType', 'label', 'fileType', 'channel', 'channelName']

  keys.forEach((key) => {
    if (filters[key] && filters[key].length > 0) {
      params += `&${key}=${encodeURIComponent(filters[key].join(','))}`
    }
  })
  return params
}

export const useFileStore = defineStore('file', () => {
  // state
  const fileList = ref<FileList>({
    files: [],
    folders: [],
  })

  // actions: 增删改查
  function addFile(newFile: FileItem) {
    fileList.value.files.push(newFile)
  }

  function addFolder(newFolder: string): boolean {
    if (!fileList.value.folders.includes(newFolder)) {
      fileList.value.folders.push(newFolder)
      return true
    }
    return false
  }

  function removeFile(fileName: string) {
    fileList.value.files = fileList.value.files.filter(file => file.name !== fileName)
  }

  function removeFolder(folders: string) {
    fileList.value.files = fileList.value.files.filter(file => file.name.startsWith(`${folders}/`))
    fileList.value.folders = fileList.value.folders.filter(folder => !folders.includes(folder))
  }

  function moveFile(oldPath: string, newPath: string, isFolder = false, currentPath = '') {
    if (isFolder) {
      const oldFolderIndex = fileList.value.folders.indexOf(oldPath)
      if (oldFolderIndex !== -1) {
        fileList.value.folders.splice(oldFolderIndex, 1)
      }
    }
    else {
      const fileIndex = fileList.value.files.findIndex(file => file.name === oldPath)
      if (fileIndex !== -1) {
        fileList.value.files.splice(fileIndex, 1)
      }
    }

    if (newPath.startsWith(currentPath)) {
      const pathArr = newPath.substring(currentPath.length).split('/')
      if (pathArr.length > 1) {
        const newFolder = currentPath + pathArr[0]
        if (!fileList.value.folders.includes(newFolder)) {
          fileList.value.folders.push(newFolder)
        }
      }
    }
  }

  function getFilesInFolder(folderName: string) {
    const files = fileList.value.files.filter((file) => {
      return file.name.startsWith(`${folderName}/`)
    })
    const subFolders = fileList.value.folders.filter((folder) => {
      return folder.startsWith(`${folderName}/`)
    })
    return { files, follders: subFolders }
  }

  // actions: 网络请求
  async function refreshFileList(dir: string, search = '', includeTags = '', excludeTags = '', filters = {}) {
    const cleanSearch = search.trim()
    try {
      let url = `/manage/list?count=60&dir=${dir}&search=${encodeURIComponent(cleanSearch)}`
      if (includeTags)
        url += `&includeTags=${encodeURIComponent(includeTags)}`
      if (excludeTags)
        url += `&excludeTags=${encodeURIComponent(excludeTags)}`
      url += toQueryString(filters)

      // 使用你重构的 Axios，不需要写前缀 /api，拦截器已经配好了
      const response = await axios.get(url, { silentAuth: true })
      const data = response.data

      if (!data.isIndexedResponse) {
        ElMessage.warning(i18n.global.t('dashboard.indexingWarning'))
      }

      fileList.value = data
      return true
    }
    catch (error) {
      console.error('Error refreshing file list:', error)
      return false
    }
  }

  async function loadMoreFiles(dir: string, search = '', includeTags = '', excludeTags = '', count = 60, filters = {}) {
    const cleanSearch = search.trim()
    try {
      const start = fileList.value.files.length
      let url = `/manage/list?dir=${dir}&start=${start}&count=${count}&search=${encodeURIComponent(cleanSearch)}`
      if (includeTags)
        url += `&includeTags=${encodeURIComponent(includeTags)}`
      if (excludeTags)
        url += `&excludeTags=${encodeURIComponent(excludeTags)}`
      url += toQueryString(filters)

      const response = await axios.get(url)
      const data = response.data

      // 增量追加
      fileList.value.files.push(...(data.files || []))
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
}, { persist: {
  key: LocalStorageKey.FILE_STORE,
  pick: ['fileList'],
} })
