import axios from '@/utils/axios'

/** 公开列表返回的文件条目（后端 public/list.ts 转换后的格式） */
export interface PublicFileItem {
  name: string
  metadata?: {
    FileType?: string
    TimeStamp?: number
    FileSize?: number
  }
}

export interface PublicListResponse {
  files: PublicFileItem[]
  folders: string[]
  totalCount: number
  returnedCount: number
  allowedDirs: string[]
  fromCache: boolean
}

export interface PublicListParams {
  /** 目录（不带头尾斜杠，空=根目录） */
  folder?: string
  /** 文件名搜索 */
  search?: string
  /** 是否递归子目录 */
  recursive?: boolean
  /** 类型过滤：image/video/audio/other */
  type?: 'image' | 'video' | 'audio' | 'other' | ''
  /** 标签过滤（逗号分隔，AND 匹配），如 ['photo', 'shared'] */
  tags?: string[]
  start?: number
  count?: number
}

/**
 * 获取公开列表（公开页）
 * slug 模式（tags 过滤）不受目录白名单限制；目录模式仍校验 allowedDir。
 */
export function getPublicFileList(params: PublicListParams = {}) {
  // axios 默认把数组序列化成 tags[]=x&tags[]=y，后端按逗号分隔读取；
  // 这里显式 join 成 tags=a,b 避免歧义
  const { tags, ...rest } = params
  const query: Record<string, unknown> = { ...rest }
  if (tags && tags.length > 0)
    query.tags = tags.join(',')
  return axios.get<PublicListResponse>('/public/list', { params: query })
}

/** 公开页配置（存于 manage@sysConfig@page 的 pub:{slug} 项） */
export interface PublicPageConfig {
  /** 收录规则：文件必须包含的所有标签（AND） */
  tags: string[]
  /** 页面标题 */
  name: string
  /** 页面描述 */
  description: string
  /** 到期时间戳（ms）；null 表示永久 */
  expireAt: number | null
}

/**
 * 读取全部公开页配置（GET /api/userConfig，无鉴权）
 * 后端只放行 pub:* 前缀的配置，返回形如 { 'pub:photo': {...}, ... }
 */
export async function getPublicPageConfigs(): Promise<Record<string, PublicPageConfig>> {
  const { data } = await axios.get<Record<string, unknown>>('/userConfig')
  const result: Record<string, PublicPageConfig> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('pub:') && value && typeof value === 'object') {
      const cfg = value as Partial<PublicPageConfig>
      result[key.slice(4)] = {
        tags: Array.isArray(cfg.tags) ? cfg.tags : [],
        name: typeof cfg.name === 'string' ? cfg.name : '',
        description: typeof cfg.description === 'string' ? cfg.description : '',
        expireAt: typeof cfg.expireAt === 'number' ? cfg.expireAt : null,
      }
    }
  }
  return result
}
