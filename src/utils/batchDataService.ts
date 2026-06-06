import type { AxiosError, CancelTokenSource } from 'axios'
import axios from 'axios'
import axiosInstance from '@/utils/axios'

export class BatchOperationError extends Error {
  public code: string
  public recoverable: boolean
  public suggestion: string

  constructor(message: string, code: string, recoverable = false, suggestion = '') {
    super(message)
    this.name = 'BatchOperationError'
    this.code = code
    this.recoverable = recoverable
    this.suggestion = suggestion
  }
}

const ERROR_HANDLERS: Record<string, (details?: string) => BatchOperationError> = {
  401: () => new BatchOperationError('认证失败，请重新登录', 'AUTH_FAILED', false, '请刷新页面并重新登录'),
  403: () => new BatchOperationError('权限不足或请求被拒绝', 'FORBIDDEN', false, '请确认您有管理员权限'),
  400: details => new BatchOperationError(`请求数据无效: ${details}`, 'INVALID_DATA', true, '请检查数据格式后重试'),
  500: () => new BatchOperationError('服务器内部错误', 'SERVER_ERROR', true, '请稍后重试，如果问题持续请联系管理员'),
  NETWORK: () => new BatchOperationError('网络连接失败', 'NETWORK_ERROR', true, '请检查网络连接后重试'),
  ABORTED: () => new BatchOperationError('操作已取消', 'ABORTED', false, ''),
}

function createError(error: any, details = ''): BatchOperationError {
  if (axios.isCancel(error)) {
    return ERROR_HANDLERS.ABORTED()
  }

  if (error && error.isAxiosError) {
    const axiosError = error as AxiosError<any>
    if (axiosError.response) {
      const handler = ERROR_HANDLERS[String(axiosError.response.status)]
      return handler ? handler(axiosError.response.data?.error || details) : new BatchOperationError(`请求失败: ${axiosError.response.status}`, 'HTTP_ERROR', true, '请稍后重试')
    }
    if (axiosError.code === 'ERR_NETWORK') {
      return ERROR_HANDLERS.NETWORK()
    }
  }

  return new BatchOperationError(error?.message || '未知错误', 'UNKNOWN_ERROR', true, '请稍后重试')
}

export interface BatchProgress {
  phase: 'fetching'
  current: number
  batchCount: number
  message: string
}

export interface BatchServiceOptions {
  batchSize?: number
  onProgress?: (progress: BatchProgress) => void
  onError?: (error: BatchOperationError) => void
}

interface BatchResponse {
  success: boolean
  records: any[]
  nextCursor: string | null
  totalProcessed: number
  error?: string
}

class BatchDataService {
  private batchSize: number
  private onProgress: (progress: BatchProgress) => void
  private onError: (error: BatchOperationError) => void
  private cancelTokenSource: CancelTokenSource | null = null

  constructor(options: BatchServiceOptions = {}) {
    this.batchSize = options.batchSize || 1000
    this.onProgress = options.onProgress || (() => {})
    this.onError = options.onError || (() => {})
  }

  /**
   * 循环分页获取所有数据记录
   */
  async fetchAllRecords(includeValue = false): Promise<any[]> {
    this.cancelTokenSource = axios.CancelToken.source()
    const allRecords: any[] = []
    let cursor: string | null = null
    let totalFetched = 0
    let batchCount = 0

    try {
      do {
        const response = await this.fetchBatch(cursor, includeValue)

        allRecords.push(...response.records)
        cursor = response.nextCursor
        totalFetched += response.records.length
        batchCount++

        this.onProgress({
          phase: 'fetching',
          current: totalFetched,
          batchCount,
          message: `已获取 ${totalFetched} 条记录...`,
        })
      } while (cursor)

      return allRecords
    }
    catch (error) {
      const batchError = error instanceof BatchOperationError ? error : createError(error)
      this.onError(batchError)
      throw batchError
    }
  }

  /**
   * 获取单批次数据
   */
  async fetchBatch(cursor: string | null, includeValue: boolean): Promise<{ records: any[], nextCursor: string | null, totalProcessed: number }> {
    const params = new URLSearchParams()
    if (cursor)
      params.set('cursor', cursor)
    if (includeValue)
      params.set('includeValue', 'true')
    params.set('limit', String(this.batchSize))

    try {
      const response = await axiosInstance.get(`/api/manage/batch/list?${params}`, {
        cancelToken: this.cancelTokenSource?.token,
      })

      const data = response.data as BatchResponse

      if (!data || !data.success) {
        throw new BatchOperationError(
          data?.error || '请求失败',
          'API_ERROR',
          true,
          '请稍后重试',
        )
      }

      return {
        records: data.records || [],
        nextCursor: data.nextCursor || null,
        totalProcessed: data.totalProcessed || 0,
      }
    }
    catch (error) {
      if (error instanceof BatchOperationError)
        throw error
      throw createError(error)
    }
  }

  /**
   * 中断当前运行中的物理请求流
   */
  public abort(): void {
    if (this.cancelTokenSource) {
      this.cancelTokenSource.cancel('操作已由用户主动取消')
    }
  }

  public reset(): void {
    this.cancelTokenSource = null
  }
}

export default BatchDataService
