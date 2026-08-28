/**
 * 格式化 ISO 同步时间用于显示（设置页"上次同步"）。
 * 无效/空值返回空字符串。
 */
export function formatSyncTime(iso: string, locale?: string): string {
  if (!iso)
    return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime()))
    return ''
  try {
    return d.toLocaleString(locale)
  }
  catch {
    return d.toLocaleString()
  }
}
