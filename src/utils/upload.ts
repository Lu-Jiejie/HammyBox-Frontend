import type { CompressConfig } from './fileProcessor'
import axios from './axios'
import { processFile } from './fileProcessor'

/**
 * 上传文件到服务器
 * @param url 上传接口地址
 * @param file 要上传的文件
 * @param params 额外的上传参数（会作为查询参数）
 * @returns 上传结果
 */
export async function upload<T = any>(
  url: string,
  file: File,
  params?: Record<string, any>,
): Promise<T> {
  const formData = new FormData()
  formData.append('file', file)

  // 构建查询参数
  const queryParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value))
      }
    })
  }

  // 将查询参数附加到 URL
  const uploadUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url

  const response = await axios.post<T>(uploadUrl, formData)
  return response.data
}

/**
 * 单文件上传（内部实现）
 */
async function uploadSingle<T = any>(
  file: File,
  params: Record<string, any>,
): Promise<T> {
  return upload<T>('/upload', file, params)
}

// 不可重试的错误码列表
const NON_RETRYABLE_ERROR_CODES = [
  'CHANNEL_NOT_AVAILABLE',
  'TELEGRAM_CHANNEL_NOT_AVAILABLE',
  'DISCORD_CHANNEL_NOT_AVAILABLE',
  'DISCORD_CHANNEL_MISCONFIGURED',
  'HUGGINGFACE_CHANNEL_NOT_AVAILABLE',
  'HUGGINGFACE_CHANNEL_MISCONFIGURED',
  'S3_CHANNEL_NOT_AVAILABLE',
  'R2_CHANNEL_NOT_AVAILABLE',
  'WEBDAV_CHANNEL_NOT_AVAILABLE',
  'WEBDAV_CHANNEL_MISCONFIGURED',
  'WEBDAV_CHUNK_NOT_SUPPORTED',
  'IP_BLOCKED',
  'R2_NOT_CONFIGURED',
]

/**
 * 检查错误是否可重试
 */
function isRetryableError(error: any): boolean {
  const errorCode = error?.response?.data?.code
  return !errorCode || !NON_RETRYABLE_ERROR_CODES.includes(errorCode)
}

/**
 * 提取错误信息
 */
function extractErrorMessage(error: any): string {
  if (error?.response?.data) {
    const data = error.response.data
    if (typeof data === 'string') {
      return data
    }
    else if (data.error) {
      return data.error
    }
    else if (data.message) {
      return data.message
    }
  }
  else if (error?.message) {
    return error.message
  }
  return 'Upload failed'
}

/**
 * 分块上传（用于大文件）
 */
async function uploadInChunks<T = any>(
  file: File,
  params: Record<string, any>,
  onProgress?: (percent: number) => void,
): Promise<T> {
  const uploadChannel = params.uploadChannel || 'telegram'

  // Discord 使用 9MB 分块（留安全余量，Discord 限制 10MB）
  // Telegram 使用 16MB 分块（TG Bot getFile 下载限制 20MB，留 4MB 安全余量）
  // 其他渠道使用 16MB 分块
  const CHUNK_SIZE = uploadChannel === 'discord'
    ? 9 * 1024 * 1024 // 9MB for Discord
    : 16 * 1024 * 1024 // 16MB for Telegram and others

  const fileSize = file.size
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)

  // 第一步：初始化分块上传，获取 uploadId
  const initFormData = new FormData()
  initFormData.append('originalFileName', file.name)
  initFormData.append('originalFileType', file.type)
  initFormData.append('totalChunks', totalChunks.toString())

  const initQueryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      initQueryParams.append(key, String(value))
    }
  })
  initQueryParams.append('initChunked', 'true')

  console.log('初始化分块上传:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    totalChunks,
    chunkSize: CHUNK_SIZE,
    url: `/upload?${initQueryParams.toString()}`,
  })

  const initResponse = await axios.post<{ success: boolean, uploadId: string, message?: string, error?: string, code?: string }>(
    `/upload?${initQueryParams.toString()}`,
    initFormData,
  )

  if (!initResponse.data.success) {
    // 初始化返回失败，构造一个包含完整错误信息的错误对象
    const error: any = new Error(initResponse.data.error || initResponse.data.message || 'Chunk init failed')
    error.response = {
      data: {
        error: initResponse.data.error,
        code: initResponse.data.code,
        message: initResponse.data.message,
      },
    }
    throw error
  }

  const uploadId = initResponse.data.uploadId
  console.log('分块上传初始化成功，uploadId:', uploadId)

  try {
    // 第二步：并发上传所有分块
    const maxConcurrency = 3 // 最大并发数
    // eslint-disable-next-line unicorn/no-new-array
    const chunkProgress = new Array(totalChunks).fill(0)
    let nextChunkIndex = 0
    let hasError = false
    let errorMsg = ''

    const uploadChunk = async (chunkIndex: number) => {
      if (hasError)
        return

      const start = chunkIndex * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, fileSize)
      const chunkBlob = file.slice(start, end)

      const chunkFileName = `${file.name}.part${chunkIndex.toString().padStart(3, '0')}`

      const formData = new FormData()
      // 直接发送 Blob，文件名通过 originalFileName 传递
      formData.append('file', chunkBlob)
      formData.append('chunkIndex', chunkIndex.toString())
      formData.append('totalChunks', totalChunks.toString())
      formData.append('uploadId', uploadId)
      formData.append('originalFileName', file.name)
      formData.append('originalFileType', file.type)
      formData.append('chunkFileName', chunkFileName) // 添加分片文件名字段

      const chunkQueryParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          chunkQueryParams.append(key, String(value))
        }
      })
      chunkQueryParams.append('chunked', 'true')

      console.log(`上传分片 ${chunkIndex + 1}/${totalChunks}:`, {
        chunkSize: chunkBlob.size,
        chunkType: chunkBlob.type,
        chunkFileName,
        url: `/upload?${chunkQueryParams.toString()}`,
      })

      let retryCount = 0
      const maxRetries = 3

      while (retryCount < maxRetries) {
        if (hasError)
          return
        try {
          await axios.post(
            `/upload?${chunkQueryParams.toString()}`,
            formData,
            {
              onUploadProgress: (progressEvent) => {
                if (hasError)
                  return
                const percent = Math.round((progressEvent.loaded! / progressEvent.total!) * 100)
                chunkProgress[chunkIndex] = percent
                const totalPercent = Math.round(chunkProgress.reduce((a, b) => a + b, 0) / totalChunks)
                if (onProgress)
                  onProgress(totalPercent)
              },
            },
          )
          return // Success
        }
        catch (err: any) {
          // 检查是否是不可重试的错误
          const canRetry = isRetryableError(err)

          if (!canRetry) {
            // 不可重试的错误（如渠道不可用、IP封禁等），立即终止所有分块上传
            hasError = true
            errorMsg = extractErrorMessage(err)
            console.error(`分块 ${chunkIndex + 1}/${totalChunks} 遇到不可重试错误，终止上传:`, errorMsg)
            throw err // 抛出原始错误而不是包装后的
          }

          retryCount++
          console.warn(`分块 ${chunkIndex + 1}/${totalChunks} 上传失败 (重试 ${retryCount}/${maxRetries}):`, err)
          if (retryCount >= maxRetries) {
            hasError = true
            errorMsg = extractErrorMessage(err)
            throw err // 抛出原始错误而不是包装后的
          }
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount))
        }
      }
    }

    // 创建并发池
    const pool = []
    for (let i = 0; i < maxConcurrency; i++) {
      pool.push((async () => {
        while (nextChunkIndex < totalChunks && !hasError) {
          const currentIndex = nextChunkIndex++
          try {
            await uploadChunk(currentIndex)
          }
          catch (e: any) {
            hasError = true
            errorMsg = e.message
            break
          }
        }
      })())
    }

    await Promise.all(pool)

    if (hasError) {
      throw new Error(errorMsg || 'Upload error')
    }

    // 第三步：所有分块上传完成，发送合并请求
    console.log('所有分块上传完成，开始合并...')

    const mergeFormData = new FormData()
    mergeFormData.append('uploadId', uploadId)
    mergeFormData.append('totalChunks', totalChunks.toString())
    mergeFormData.append('originalFileName', file.name)
    mergeFormData.append('originalFileType', file.type)

    const mergeQueryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        mergeQueryParams.append(key, String(value))
      }
    })
    mergeQueryParams.append('chunked', 'true')
    mergeQueryParams.append('merge', 'true')

    const response = await axios.post<T>(
      `/upload?${mergeQueryParams.toString()}`,
      mergeFormData,
    )

    console.log('分块合并成功')
    return response.data
  }
  catch (err) {
    // 清理失败的分块上传资源
    try {
      await axios.get(`/upload?cleanup=true&uploadId=${uploadId}&totalChunks=${totalChunks}`)
      console.log(`已清理分块上传失败的资源: ${uploadId}`)
    }
    catch (cleanupError) {
      console.warn('清理分块上传失败资源时出错:', cleanupError)
    }
    throw err
  }
}

/**
 * HuggingFace 直连 S3 上传
 * TODO: 需要后端提供预签名 URL
 */
async function uploadHuggingFaceDirect<T = any>(
  file: File,
  params: Record<string, any>,
): Promise<T> {
  // 目前回退到单文件上传，等待后端支持
  console.warn('HuggingFace direct upload not yet implemented, falling back to single upload')
  return uploadSingle<T>(file, params)
}

/**
 * 智能路由上传函数
 * 根据渠道类型和文件大小选择最优上传方式
 */
export async function uploadWithRouting<T = any>(
  file: File,
  params: Record<string, any>,
  compressConfig: CompressConfig,
  onProgress?: (percent: number) => void,
): Promise<T> {
  // Step 1: 预处理文件（压缩/转换）
  const processedFile = await processFile(file, compressConfig)

  // Step 2: 根据渠道和文件大小选择上传方式
  const channel = params.uploadChannel
  const fileSizeMB = processedFile.size / (1024 * 1024)

  // Discord 有 10MB 限制，超过 9MB 需要分块
  if (channel === 'discord' && fileSizeMB > 9) {
    return uploadInChunks<T>(processedFile, params, onProgress)
  }

  // HuggingFace 大文件（>=20MB）使用直连 S3
  if (channel === 'huggingface' && fileSizeMB >= 20) {
    return uploadHuggingFaceDirect<T>(processedFile, params)
  }

  // 其他渠道，大于 20MB 的文件使用分块上传
  if (fileSizeMB > 20) {
    return uploadInChunks<T>(processedFile, params, onProgress)
  }

  // 默认使用单文件上传
  return uploadSingle<T>(processedFile, params)
}
