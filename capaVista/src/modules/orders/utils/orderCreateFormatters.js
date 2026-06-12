export function formatFileSize(bytes = 0) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(bytes / 1024, 1).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function getFileExtension(fileName = '') {
  const extension = fileName.split('.').pop()
  return extension ? extension.toUpperCase() : 'ARCHIVO'
}

export function normalizeSalesNoteCode(value = '') {
  return value.trim().toUpperCase()
}

export function getFileIconClass(fileName = '') {
  const extension = getFileExtension(fileName).toLowerCase()

  if (extension === 'pdf') return 'bi-file-earmark-pdf'
  if (['png', 'jpg', 'jpeg', 'webp'].includes(extension)) return 'bi-file-earmark-image'
  if (['zip', 'rar'].includes(extension)) return 'bi-file-earmark-zip'
  if (['dwg', 'ai'].includes(extension)) return 'bi-file-earmark-richtext'

  return 'bi-file-earmark'
}
