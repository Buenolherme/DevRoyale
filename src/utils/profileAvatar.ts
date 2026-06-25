const PROFILE_AVATAR_MAX_DIMENSION = 512
const PROFILE_AVATAR_WEBP_QUALITY = 0.82

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: 'image/webp' | 'image/jpeg',
  quality: number,
) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Não foi possível preparar a imagem otimizada.'))
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Não foi possível preparar a imagem otimizada.'))
        return
      }

      resolve(reader.result)
    }
    reader.readAsDataURL(blob)
  })
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Não foi possível ler esta imagem.'))
    }
    image.src = objectUrl
  })
}

export async function optimizeProfileAvatar(file: File): Promise<string> {
  const image = await loadImage(file)
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight)

  if (!longestSide) {
    throw new Error('A imagem selecionada não possui dimensões válidas.')
  }

  const scale = Math.min(1, PROFILE_AVATAR_MAX_DIMENSION / longestSide)
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Não foi possível otimizar a foto neste navegador.')
  }

  canvas.width = width
  canvas.height = height
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, width, height)

  const optimizedBlob =
    (await canvasToBlob(canvas, 'image/webp', PROFILE_AVATAR_WEBP_QUALITY)) ??
    (await canvasToBlob(canvas, 'image/jpeg', PROFILE_AVATAR_WEBP_QUALITY))

  canvas.width = 1
  canvas.height = 1

  if (!optimizedBlob) {
    throw new Error('Não foi possível otimizar a foto selecionada.')
  }

  return blobToDataUrl(optimizedBlob)
}
