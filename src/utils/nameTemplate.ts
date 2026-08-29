/**
 * 文件命名模板工具（前端）
 *
 * 与后端 functions/utils/namingTemplate.ts 的占位符保持一致：
 *
 *   {YYYY} {MM} {DD} {HH} {mm} {ss}  时间（本地时区）
 *   {Timestamp}                      毫秒时间戳
 *   {Name}                           原始文件名（去扩展名）
 *   {Origin}                         原始完整文件名（含扩展名）
 *   {Ext}                            文件扩展名（含点，如 .png）
 *   {Random}                         6 位随机
 *   {Random:N}                       N 位随机（如 {Random:12}）
 *
 * 模板内可含 "/" 生成多级目录路径，如 {YYYY}/{MM}/{DD}/{Name}{Ext}
 */

export interface NameTemplateContext {
  /** 原始文件名（含扩展名），如 photo1.png */
  fileName?: string
  /** 文件扩展名（不含点），如 png */
  fileExt?: string
  /** 展开时的基准时间（默认当前时间） */
  now?: Date
}

const PLACEHOLDER_PATTERN = /\{([^{}]+)\}/g

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function randomPart(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 展开命名模板，返回可能含 "/" 的原始结果（未 sanitize，调用方按需处理）
 */
export function expandNameTemplate(template: string, ctx: NameTemplateContext = {}): string {
  const now = ctx.now || new Date()
  const fileExt = ctx.fileExt || ''
  const dot = fileExt ? `.${fileExt}` : ''
  const origin = ctx.fileName || ''
  const name = origin.includes('.') ? origin.slice(0, origin.lastIndexOf('.')) : origin

  return template.replace(PLACEHOLDER_PATTERN, (_match, token: string) => {
    // 处理 {Random:N} 与 {Random}
    const randomMatch = token.match(/^Random(?::(\d+))?$/)
    if (randomMatch) {
      const length = randomMatch[1] ? Math.min(Number.parseInt(randomMatch[1], 10) || 6, 64) : 6
      return randomPart(length)
    }

    switch (token) {
      case 'YYYY': return String(now.getFullYear())
      case 'MM': return pad(now.getMonth() + 1)
      case 'DD': return pad(now.getDate())
      case 'HH': return pad(now.getHours())
      case 'mm': return pad(now.getMinutes())
      case 'ss': return pad(now.getSeconds())
      case 'Timestamp': return String(now.getTime())
      case 'Name': return name
      case 'Origin': return origin
      case 'Ext': return dot
      default: return `{${token}}` // 未知占位符原样保留
    }
  })
}

/** 默认命名模板：{YYYY}-{MM}-{DD}-{Timestamp}{Ext} */
export const DEFAULT_NAME_TEMPLATE = '{YYYY}-{MM}-{DD}-{Timestamp}{Ext}'

/** 占位符说明（供上传设置/设置页展示与插入） */
export interface PlaceholderInfo {
  token: string
  labelKey: string
  example: string
}

/** 可用的占位符列表 */
export const NAME_PLACEHOLDERS: PlaceholderInfo[] = [
  { token: '{YYYY}', labelKey: 'year', example: '2026' },
  { token: '{MM}', labelKey: 'month', example: '08' },
  { token: '{DD}', labelKey: 'day', example: '29' },
  { token: '{HH}', labelKey: 'hour', example: '14' },
  { token: '{mm}', labelKey: 'minute', example: '05' },
  { token: '{ss}', labelKey: 'second', example: '09' },
  { token: '{Timestamp}', labelKey: 'timestamp', example: '1724912345678' },
  { token: '{Name}', labelKey: 'name', example: 'photo1' },
  { token: '{Origin}', labelKey: 'origin', example: 'photo1.png' },
  { token: '{Ext}', labelKey: 'ext', example: '.png' },
  { token: '{Random}', labelKey: 'random', example: 'k3m9x2' },
  { token: '{Random:12}', labelKey: 'randomN', example: 'a7k3m9x2qd4f' },
]

/** 获取文件扩展名（不含点，小写；未知返回空） */
export function getFileExtFromName(fileName: string): string {
  if (!fileName || !fileName.includes('.')) {
    return ''
  }
  const ext = fileName.split('.').pop() || ''
  return ext.toLowerCase()
}
