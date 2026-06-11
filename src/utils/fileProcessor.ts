import imageConversion from 'image-conversion'

export interface CompressConfig {
  convertToWebp: boolean
  customerCompress: boolean
  compressBar: number // MB threshold
  compressQuality: number // MB target size
  serverCompress: boolean
}

/**
 * Convert image to WebP format using Canvas API
 */
export async function convertToWebP(file: File): Promise<File> {
  // Only process image files
  if (!file.type.startsWith('image/')) {
    return file
  }

  // Already WebP, skip conversion
  if (file.type === 'image/webp') {
    return file
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('Failed to read image file'))

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert image to WebP'))
              return
            }

            // Create new File with .webp extension
            const fileName = file.name.replace(/\.[^/.]+$/, '.webp')
            const webpFile = new File([blob], fileName, {
              type: 'image/webp',
              lastModified: Date.now(),
            })

            resolve(webpFile)
          },
          'image/webp',
          0.9, // WebP quality
        )
      }
      catch (error) {
        reject(error)
      }
    }

    img.onerror = () => reject(new Error('Failed to load image'))

    reader.readAsDataURL(file)
  })
}

/**
 * Compress image to target size using image-conversion library
 */
export async function compressImage(file: File, targetSizeMB: number): Promise<File> {
  // Only process image files
  if (!file.type.startsWith('image/')) {
    return file
  }

  const targetSizeKB = targetSizeMB * 1024
  const originalSizeMB = file.size / (1024 * 1024)

  console.log(`[Compress] Original: ${originalSizeMB.toFixed(2)}MB, Target: ${targetSizeMB}MB`)

  try {
    // image-conversion expects size in KB
    const compressedBlob = await imageConversion.compressAccurately(file, targetSizeKB)

    // Create new File from compressed blob
    const compressedFile = new File([compressedBlob], file.name, {
      type: file.type,
      lastModified: Date.now(),
    })

    const compressedSizeMB = compressedFile.size / (1024 * 1024)
    console.log(`[Compress] Result: ${compressedSizeMB.toFixed(2)}MB`)

    return compressedFile
  }
  catch (error) {
    console.error('Compression failed:', error)
    // Return original file if compression fails
    return file
  }
}

/**
 * Process file based on compression config
 * Applies WebP conversion and/or compression as configured
 */
export async function processFile(file: File, config: CompressConfig): Promise<File> {
  let processedFile = file

  console.log('[ProcessFile] Start processing:', file.name, file.size / (1024 * 1024), 'MB')
  console.log('[ProcessFile] Config:', config)

  // Step 1: Compress first if enabled and file exceeds threshold
  if (config.customerCompress) {
    const fileSizeMB = file.size / (1024 * 1024)
    console.log('[ProcessFile] customerCompress enabled, file size:', fileSizeMB, 'MB, threshold:', config.compressBar, 'MB')

    if (fileSizeMB > config.compressBar) {
      console.log('[ProcessFile] File exceeds threshold, compressing...')
      try {
        processedFile = await compressImage(processedFile, config.compressQuality)
      }
      catch (error) {
        console.warn('Compression failed, using original file:', error)
      }
    }
    else {
      console.log('[ProcessFile] File below threshold, skipping compression')
    }
  }
  else {
    console.log('[ProcessFile] customerCompress disabled')
  }

  // Step 2: Convert to WebP if enabled (after compression)
  if (config.convertToWebp) {
    console.log('[ProcessFile] Converting to WebP...')
    try {
      processedFile = await convertToWebP(processedFile)
    }
    catch (error) {
      console.warn('WebP conversion failed, using original format:', error)
    }
  }

  console.log('[ProcessFile] Final size:', processedFile.size / (1024 * 1024), 'MB')

  return processedFile
}
