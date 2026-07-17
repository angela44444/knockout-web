export type RefineOptions = {
  /** Pixels with alpha below this (0–80) become fully transparent. */
  cutoff: number
  /** Shrink the mask inward by this many pixels (0–3). */
  erode: number
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to decode image'))
    }
    img.src = url
  })
}

function applyCutoff(data: Uint8ClampedArray, cutoff: number) {
  if (cutoff <= 0) return
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < cutoff) data[i] = 0
  }
}

function applyErode(data: Uint8ClampedArray, width: number, height: number, radius: number) {
  if (radius <= 0) return

  const alpha = new Uint8Array(width * height)
  for (let i = 0, p = 3; i < alpha.length; i++, p += 4) {
    alpha[i] = data[p]
  }

  const out = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let min = 255
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            min = Math.min(min, alpha[ny * width + nx])
          }
        }
      }
      out[y * width + x] = min
    }
  }

  for (let i = 0, p = 3; i < out.length; i++, p += 4) {
    data[p] = out[i]
  }
}

function refineImageData(imageData: ImageData, options: RefineOptions) {
  const cutoff = Math.max(0, Math.min(80, Math.round(options.cutoff)))
  const erode = Math.max(0, Math.min(3, Math.round(options.erode)))
  applyCutoff(imageData.data, cutoff)
  applyErode(imageData.data, imageData.width, imageData.height, erode)
}

export async function refineMask(blob: Blob, options: RefineOptions): Promise<Blob> {
  if (options.cutoff <= 0 && options.erode <= 0) return blob

  const img = await loadImageFromBlob(blob)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  refineImageData(imageData, options)
  ctx.putImageData(imageData, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob((out) => {
      if (out) resolve(out)
      else reject(new Error('Failed to encode PNG'))
    }, 'image/png')
  })
}
