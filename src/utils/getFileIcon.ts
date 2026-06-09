import { fileIcons } from '@/constants/fileExtensions'

export function getFileIcon(fileName: string, isFolder: boolean): string {
  if (isFolder)
    return 'i-catppuccin-folder'

  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  // Search through fileIcons to find matching extension
  for (const [iconName, iconConfig] of Object.entries(fileIcons)) {
    if (iconConfig.fileExtensions?.includes(ext)) {
      return `i-catppuccin-${iconName}`
    }
  }

  return 'i-catppuccin-file'
}
