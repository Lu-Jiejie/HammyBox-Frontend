import type { BatchProgress } from '@/utils/batchDataService'
import axiosInstance from '@/utils/axios'
import BatchDataService, { BatchOperationError } from '@/utils/batchDataService'

// 定义外部传入的配置项接口
export interface IndexRebuilderOptions {
  chunkSize?: number | null
  maxRetries?: number
  retryDelay?: number
  onProgress?: (progress: RebuilderProgress) => void
  onError?: (error: BatchOperationError) => void
}

// 定义统一的进度状态接口，扩展自 BatchProgress 并加上当前特有阶段
export interface RebuilderProgress {
  phase: 'fetching' | 'sorting' | 'uploading' | 'retrying' | 'finalizing' | 'completed'
  message: string
  current: number
  total?: number
  batchCount?: number
  attempt?: number
}

// 索引配置响应接口
interface ConfigResponse {
  success: boolean
  chunkSize?: number
  databaseType?: string
  error?: string
}

// 统一的通用 API 响应接口
interface BaseApiResponse {
  success: boolean
  error?: string
}

/**
 * IndexRebuilder 类
 * 用于重建索引的核心类，协调数据获取、排序和分块上传
 */
class IndexRebuilder {
  private chunkSize: number | null
  private maxRetries: number
  private retryDelay: number
  private onProgress: (progress: RebuilderProgress) => void
  private onError: (error: BatchOperationError) => void
  private sessionId: string
  private aborted: boolean
  private batchService: BatchDataService | null = null

  constructor(options: IndexRebuilderOptions = {}) {
    this.chunkSize = options.chunkSize || null
    this.maxRetries = options.maxRetries ?? 3
    this.retryDelay = options.retryDelay ?? 1000
    this.onProgress = options.onProgress || (() => {})
    this.onError = options.onError || (() => {})
    this.sessionId = this.generateSessionId()
    this.aborted = false
  }

  /**
   * 从后端获取索引配置（分块大小等）
   */
  async fetchConfig(): Promise<{ chunkSize: number, databaseType: string }> {
    try {
      // 使用 Axios 替代 fetchWithAuth，并开启 silentAuth 静默认证拦截
      const response = await axiosInstance.get<ConfigResponse>('/api/manage/batch/index/config', {
        silentAuth: true,
      })

      const result = response.data
      if (result && result.success) {
        return {
          chunkSize: result.chunkSize || 500,
          databaseType: result.databaseType || 'unknown',
        }
      }
      throw new Error(result?.error || '获取配置失败')
    }
    catch (error: any) {
      // 获取失败时使用保守的默认值（兼容 D1）
      console.warn('Failed to fetch index config, using default:', error)
      return { chunkSize: 500, databaseType: 'unknown' }
    }
  }

  /**
   * 执行索引重建
   */
  async rebuild(): Promise<{ success: boolean, totalFiles: number }> {
    this.aborted = false

    try {
      // 1. 获取配置（分块大小）
      if (!this.chunkSize) {
        const config = await this.fetchConfig()
        this.chunkSize = config.chunkSize
      }

      // 2. 获取所有记录
      this.onProgress({
        phase: 'fetching',
        message: '正在获取数据...',
        current: 0,
      })

      // 实例化重构后的 BatchDataService
      this.batchService = new BatchDataService({
        batchSize: this.chunkSize || 1000,
        onProgress: (p: BatchProgress) => {
          this.onProgress({
            phase: 'fetching',
            current: p.current,
            batchCount: p.batchCount,
            message: p.message,
          })
        },
        onError: e => this.onError(e),
      })

      const records = await this.batchService.fetchAllRecords(false)

      if (this.aborted) {
        throw new BatchOperationError('操作已取消', 'ABORTED', false, '')
      }

      // 3. 排序（按时间戳降序）
      this.onProgress({
        phase: 'sorting',
        message: '正在排序...',
        current: 0,
        total: records.length,
      })

      this.sortByTimestampDescending(records)

      if (this.aborted) {
        throw new BatchOperationError('操作已取消', 'ABORTED', false, '')
      }

      // 4. 分块上传
      const chunks = this.splitIntoChunks(records)

      for (let i = 0; i < chunks.length; i++) {
        if (this.aborted) {
          throw new BatchOperationError('操作已取消', 'ABORTED', false, '')
        }

        // 使用重试机制上传分块
        await this.uploadChunkWithRetry(chunks[i], i)

        this.onProgress({
          phase: 'uploading',
          current: i + 1,
          total: chunks.length,
          message: `正在上传分块 ${i + 1}/${chunks.length}...`,
        })
      }

      // 5. 完成重建
      this.onProgress({
        phase: 'finalizing',
        message: '正在完成重建...',
        current: chunks.length,
        total: chunks.length,
      })

      await this.finalize(chunks.length, records.length)

      this.onProgress({
        phase: 'completed',
        message: `索引重建完成，共 ${records.length} 个文件`,
        current: records.length,
        total: records.length,
      })

      return { success: true, totalFiles: records.length }
    }
    catch (error: any) {
      const batchError = error instanceof BatchOperationError
        ? error
        : new BatchOperationError(
            error.message || '索引重建失败',
            'REBUILD_ERROR',
            true,
            '请稍后重试',
          )
      this.onError(batchError)
      throw batchError
    }
  }

  /**
   * 按时间戳降序排序记录
   */
  private sortByTimestampDescending(records: any[]): void {
    records.sort((a, b) => {
      const timestampA = a.metadata?.TimeStamp || 0
      const timestampB = b.metadata?.TimeStamp || 0
      return timestampB - timestampA
    })
  }

  /**
   * 将记录分割为多个块
   */
  private splitIntoChunks(records: any[]): any[][] {
    const chunks: any[][] = []
    const size = this.chunkSize || 500
    for (let i = 0; i < records.length; i += size) {
      chunks.push(records.slice(i, i + size))
    }
    return chunks
  }

  /**
   * 带重试机制的分块上传
   */
  private async uploadChunkWithRetry(chunk: any[], chunkId: number): Promise<BaseApiResponse> {
    let lastError: any

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.uploadChunk(chunk, chunkId)
      }
      catch (error: any) {
        lastError = error

        if (error instanceof BatchOperationError) {
          if (['AUTH_FAILED', 'FORBIDDEN', 'ABORTED'].includes(error.code)) {
            throw error
          }
        }

        if (attempt < this.maxRetries) {
          // 指数退避延迟
          const delay = this.retryDelay * 2 ** (attempt - 1)
          await this.sleep(delay)

          this.onProgress({
            phase: 'retrying',
            message: `分块 ${chunkId + 1} 上传失败，正在重试 (${attempt}/${this.maxRetries})...`,
            current: chunkId,
            attempt,
          })
        }
      }
    }

    throw lastError instanceof BatchOperationError
      ? lastError
      : new BatchOperationError(
          `分块 ${chunkId + 1} 上传失败，已重试 ${this.maxRetries} 次`,
          'CHUNK_UPLOAD_FAILED',
          false,
          '请检查网络连接后重新开始重建',
        )
  }

  /**
   * 上传单个分块
   */
  private async uploadChunk(chunk: any[], chunkId: number): Promise<BaseApiResponse> {
    const checksum = await this.calculateChecksum(chunk)

    try {
      const response = await axiosInstance.post<BaseApiResponse>('/api/manage/batch/index/chunk', {
        chunkId: String(chunkId),
        sessionId: this.sessionId,
        data: chunk,
        checksum,
      }, { silentAuth: true })

      const result = response.data

      if (!result || !result.success) {
        throw new BatchOperationError(
          result?.error || '分块上传失败',
          'CHUNK_UPLOAD_FAILED',
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
      // Axios 网络错误
      if (error && error.isAxiosError && error.code === 'ERR_NETWORK') {
        throw new BatchOperationError(
          '网络连接失败',
          'NETWORK_ERROR',
          true,
          '请检查网络连接后重试',
        )
      }
      // 依靠 Axios 拦截器处理 401/403，这里做兜底转换
      const status = error.response?.status
      if (status) {
        // TODO: [重构优化] 架构完全稳定后，建议从 @/utils/batchDataService 中导出全局的 `createError` 函数。
        // 届时可以直接执行 `throw createError(error)`，从而彻底干掉当前类底部的 `createHttpError` 冗余方法。
        throw this.createHttpError(status, error.response?.data?.error)
      }

      throw new BatchOperationError(
        error.message || '分块上传失败',
        'CHUNK_UPLOAD_FAILED',
        true,
        '请稍后重试',
      )
    }
  }

  /**
   * 完成索引重建
   */
  private async finalize(totalChunks: number, totalFiles: number): Promise<BaseApiResponse> {
    try {
      const response = await axiosInstance.post<BaseApiResponse>('/api/manage/batch/index/finalize', {
        sessionId: this.sessionId,
        totalChunks,
        totalFiles,
      }, { silentAuth: true })

      const result = response.data

      if (!result || !result.success) {
        throw new BatchOperationError(
          result?.error || '索引完成失败',
          'FINALIZE_FAILED',
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
      const status = error.response?.status
      if (status) {
        throw this.createHttpError(status, error.response?.data?.error)
      }
      throw new BatchOperationError(
        error.message || '索引完成失败',
        'FINALIZE_FAILED',
        true,
        '请稍后重试',
      )
    }
  }

  /**
   * 生成唯一的会话 ID
   */
  private generateSessionId(): string {
    return `rebuild_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }

  /**
   * 计算数据的 SHA-256 校验和
   */
  private async calculateChecksum(data: any[]): Promise<string> {
    const text = JSON.stringify(data)
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(text)

    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }

    // Fallback 算法不变
    let h1 = 0x811C9DC5 >>> 0
    let h2 = 0x811C9DC5 >>> 0
    for (let i = 0; i < dataBuffer.length; i++) {
      h1 = Math.imul(h1 ^ dataBuffer[i], 0x01000193) >>> 0
      h2 = Math.imul(h2 ^ dataBuffer[i], 0x01000193 + 0x10) >>> 0
    }
    return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')
  }

  /**
   * 根据 HTTP 状态码创建错误对象
   * TODO: [废弃待删除] 当前方法属于业务兜底逻辑。由于大部分通用状态码（401/403/500/网络等）
   * 已经在全局 Axios 拦截器 (axios.ts) 和 BatchDataService 中有了标准定义与前置拦截，
   * 待未来复用 batchDataService 的 createError 后，可整体安全移除此方法。
   */
  private createHttpError(status: number, details = ''): BatchOperationError {
    switch (status) {
      case 401:
        return new BatchOperationError('认证失败，请重新登录', 'AUTH_FAILED', false, '请刷新页面并重新登录')
      case 403:
        return new BatchOperationError('权限不足或请求被拒绝', 'FORBIDDEN', false, '请确认您有管理员权限')
      case 400:
        return new BatchOperationError(`请求数据无效: ${details}`, 'INVALID_DATA', true, '请检查数据格式后重试')
      case 404:
        return new BatchOperationError('会话不存在', 'SESSION_NOT_FOUND', false, '请重新开始索引重建')
      case 410:
        return new BatchOperationError('会话已过期', 'SESSION_EXPIRED', false, '请重新开始索引重建')
      case 500:
      default:
        return new BatchOperationError(`服务器错误: ${details || status}`, 'SERVER_ERROR', true, '请稍后重试')
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 取消当前操作
   */
  public abort(): void {
    this.aborted = true
    if (this.batchService) {
      this.batchService.abort() // 联动取消拉取物理数据的流
    }
  }

  /**
   * 重置重建器状态
   */
  public reset(): void {
    this.aborted = false
    this.sessionId = this.generateSessionId()
    if (this.batchService) {
      this.batchService.reset()
    }
  }
}

export default IndexRebuilder
