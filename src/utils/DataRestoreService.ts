import type { AxiosError } from 'axios'
import axiosInstance from '@/utils/axios' // 替换为您重构后的 axios 实例路径
import { BatchOperationError } from '@/utils/batchDataService'

export interface RestoreProgress {
  phase: 'restoring_files' | 'restoring_settings' | 'completed'
  message: string
  current: number
  total: number
  percentage?: number
}

export interface RestoreResult {
  success: boolean
  restoredFiles: number
  restoredSettings: number
  failedFiles: number
  failedSettings: number
  backupTimestamp?: number | string
}

interface ChunkResponse {
  success: boolean
  restoredCount: number
  failedCount: number
  error?: string
}

export interface RestoreServiceOptions {
  chunkSize?: number
  maxRetries?: number
  retryDelay?: number
  onProgress?: (progress: RestoreProgress) => void
  onError?: (error: BatchOperationError) => void
}

class DataRestoreService {
  private chunkSize: number
  private maxRetries: number
  private retryDelay: number
  private onProgress: (progress: RestoreProgress) => void
  private onError: (error: BatchOperationError) => void
  private aborted = false

  constructor(options: RestoreServiceOptions = {}) {
    this.chunkSize = options.chunkSize || 50
    this.maxRetries = options.maxRetries || 3
    this.retryDelay = options.retryDelay || 1000
    this.onProgress = options.onProgress || (() => {})
    this.onError = options.onError || (() => {})
  }

  /**
   * 执行恢复操作流
   */
  async restore(backupData: any): Promise<RestoreResult> {
    this.aborted = false

    if (!backupData || !backupData.data) {
      throw new BatchOperationError(
        '备份文件格式无效',
        'INVALID_BACKUP',
        false,
        '请选择有效的备份文件',
      )
    }

    const { files = {}, settings = {} } = backupData.data
    const fileEntries = Object.entries(files)
    const settingEntries = Object.entries(settings)

    const totalFiles = fileEntries.length
    const totalSettings = settingEntries.length
    const totalItems = totalFiles + totalSettings

    let restoredFiles = 0
    let restoredSettings = 0
    let failedFiles = 0
    let failedSettings = 0

    try {
      // 1. 分批恢复文件数据
      this.onProgress({
        phase: 'restoring_files',
        message: '正在恢复文件数据...',
        current: 0,
        total: totalItems,
      })

      const fileChunks = this.splitIntoChunks(fileEntries, this.chunkSize)

      for (let i = 0; i < fileChunks.length; i++) {
        if (this.aborted) {
          throw new BatchOperationError('操作已取消', 'ABORTED', false, '')
        }

        const chunk = fileChunks[i]
        const chunkData = Object.fromEntries(chunk)

        const result = await this.uploadChunkWithRetry('files', chunkData)
        restoredFiles += result.restoredCount
        failedFiles += result.failedCount

        this.onProgress({
          phase: 'restoring_files',
          message: `正在恢复文件数据 ${restoredFiles}/${totalFiles}...`,
          current: restoredFiles,
          total: totalItems,
          percentage: (restoredFiles / totalItems) * 80,
        })
      }

      // 2. 分批恢复系统设置
      this.onProgress({
        phase: 'restoring_settings',
        message: '正在恢复系统设置...',
        current: restoredFiles,
        total: totalItems,
      })

      const settingChunks = this.splitIntoChunks(settingEntries, this.chunkSize)

      for (let i = 0; i < settingChunks.length; i++) {
        if (this.aborted) {
          throw new BatchOperationError('操作已取消', 'ABORTED', false, '')
        }

        const chunk = settingChunks[i]
        const chunkData = Object.fromEntries(chunk)

        const result = await this.uploadChunkWithRetry('settings', chunkData)
        restoredSettings += result.restoredCount
        failedSettings += result.failedCount

        this.onProgress({
          phase: 'restoring_settings',
          message: `正在恢复系统设置 ${restoredSettings}/${totalSettings}...`,
          current: restoredFiles + restoredSettings,
          total: totalItems,
          percentage: 80 + (restoredSettings / totalSettings) * 20,
        })
      }

      // 3. 流程完成
      this.onProgress({
        phase: 'completed',
        message: '恢复完成',
        current: totalItems,
        total: totalItems,
        percentage: 100,
      })

      return {
        success: true,
        restoredFiles,
        restoredSettings,
        failedFiles,
        failedSettings,
        backupTimestamp: backupData.timestamp,
      }
    }
    catch (error: any) {
      const batchError = error instanceof BatchOperationError
        ? error
        : new BatchOperationError(
            error.message || '恢复失败',
            'RESTORE_ERROR',
            true,
            '请稍后重试',
          )
      this.onError(batchError)
      throw batchError
    }
  }

  private splitIntoChunks<T>(entries: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < entries.length; i += chunkSize) {
      chunks.push(entries.slice(i, i + chunkSize))
    }
    return chunks
  }

  private async uploadChunkWithRetry(type: 'files' | 'settings', data: Record<string, any>): Promise<ChunkResponse> {
    let lastError: any

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.uploadChunk(type, data)
      }
      catch (error) {
        lastError = error

        if (error instanceof BatchOperationError) {
          if (error.code === 'AUTH_FAILED' || error.code === 'FORBIDDEN' || error.code === 'ABORTED') {
            throw error
          }
        }

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * 2 ** (attempt - 1)
          await this.sleep(delay)
        }
      }
    }

    throw lastError
  }

  /**
   * 通过 Axios 单个分块上传
   */
  private async uploadChunk(type: 'files' | 'settings', data: Record<string, any>): Promise<ChunkResponse> {
    try {
      const response = await axiosInstance.post('/api/manage/batch/restore/chunk', { type, data })
      const result = response.data as ChunkResponse

      if (!result || !result.success) {
        throw new BatchOperationError(
          result?.error || '恢复分块失败',
          'CHUNK_RESTORE_FAILED',
          true,
          '请稍后重试',
        )
      }

      return result
    }
    catch (error: any) {
      if (error instanceof BatchOperationError) {
        throw error
      }

      // 捕获处理 Axios 抛出的网络与状态码异常
      if (error && error.isAxiosError) {
        const axiosError = error as AxiosError<any>

        if (axiosError.response) {
          const status = axiosError.response.status
          const errorDetails = axiosError.response.data?.error || ''
          throw this.createHttpError(status, errorDetails)
        }

        if (axiosError.code === 'ERR_NETWORK') {
          throw new BatchOperationError(
            '网络连接失败',
            'NETWORK_ERROR',
            true,
            '请检查网络连接后重试',
          )
        }
      }

      throw new BatchOperationError(
        error.message || '恢复分块失败',
        'CHUNK_RESTORE_FAILED',
        true,
        '请稍后重试',
      )
    }
  }

  private createHttpError(status: number, details = ''): BatchOperationError {
    switch (status) {
      case 401:
        return new BatchOperationError(
          '认证失败，请重新登录',
          'AUTH_FAILED',
          false,
          '请刷新页面并重新登录',
        )
      case 403:
        return new BatchOperationError(
          '权限不足或请求被拒绝',
          'FORBIDDEN',
          false,
          '请确认您有管理员权限',
        )
      case 400:
        return new BatchOperationError(
          `请求数据无效: ${details}`,
          'INVALID_DATA',
          true,
          '请检查备份文件格式',
        )
      case 500:
      default:
        return new BatchOperationError(
          `服务器错误: ${details || status}`,
          'SERVER_ERROR',
          true,
          '请稍后重试',
        )
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  public abort(): void {
    this.aborted = true
  }
}

export default DataRestoreService
