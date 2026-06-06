import type { BatchProgress } from '@/utils/batchDataService'
import axiosInstance from '@/utils/axios'
import BatchDataService from '@/utils/batchDataService'
import packageInfo from '../../package.json'

export interface BackupProgress {
  phase: 'fetching' | 'building' | 'downloading'
  current?: number
  batchCount?: number
  message: string
}

export interface BackupResult {
  success: boolean
  fileCount: number
  settingsCount: number
}

// 契约声明：严格规范备份文件的物理持久化拓扑结构
interface BackupDataStructure {
  timestamp: number
  version: string
  data: {
    fileCount: number
    files: Record<string, {
      metadata: any
      value: string | null
    }>
    settings: Record<string, any>
  }
}

export interface BackupServiceOptions {
  onProgress?: (progress: BackupProgress) => void
}

class BackupGeneratorService {
  private onProgress: (progress: BackupProgress) => void
  private processor: BatchDataService | null = null

  constructor(options: BackupServiceOptions = {}) {
    this.onProgress = options.onProgress || (() => {})
  }

  /**
   * 执行全量数据生成并触发浏览器物理下载
   */
  async generateBackup(): Promise<BackupResult> {
    // 实例化上一轮重构的代理批处理服务
    this.processor = new BatchDataService({
      onProgress: (p: BatchProgress) => this.onProgress({
        phase: 'fetching',
        current: p.current,
        batchCount: p.batchCount,
        message: p.message,
      }),
    })

    // 获取包含数据块具体二进制/Base64编码值的全量底层对象
    const records = await this.processor.fetchAllRecords(true)

    this.onProgress({ phase: 'building', message: '正在构建备份数据...' })

    const backupData: BackupDataStructure = {
      timestamp: Date.now(),
      version: packageInfo.version,
      data: {
        fileCount: records.length,
        files: {},
        settings: {},
      },
    }

    // 格式化拉取到的平面记录，转换为 ID 映射字典
    for (const record of records) {
      if (record && record.id) {
        backupData.data.files[record.id] = {
          metadata: record.metadata || null,
          value: record.value || null,
        }
      }
    }

    // 串行获取全局系统设定
    const settings = await this.fetchSettings()
    backupData.data.settings = settings

    this.onProgress({ phase: 'downloading', message: '正在生成下载...' })
    this.downloadBackup(backupData)

    return {
      success: true,
      fileCount: records.length,
      settingsCount: Object.keys(settings).length,
    }
  }

  /**
   * 调取服务端系统设置
   */
  private async fetchSettings(): Promise<Record<string, any>> {
    try {
      const response = await axiosInstance.get('/manage/batch/settings')
      return response.data?.settings || {}
    }
    catch (error) {
      console.warn('Failed to fetch settings:', error)
      return {}
    }
  }

  /**
   * 调起浏览器内核的多媒体沙盒下载机制
   */
  private downloadBackup(data: BackupDataStructure): void {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `imgbed_backup_${new Date().toISOString().split('T')[0]}.json`

    document.body.appendChild(a)
    a.click()

    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * 中断当前的作业提取流
   */
  public abort(): void {
    if (this.processor) {
      this.processor.abort()
    }
  }
}

export default BackupGeneratorService
