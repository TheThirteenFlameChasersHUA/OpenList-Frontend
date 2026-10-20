export interface HomeBackgroundOptions {
  value: string
  blur?: number
  mask?: number
}

export interface ResolvedHomeBackground {
  active: boolean
  image: string
  color: string
  blur: number
  mask: number
}

const imageFunctionPattern =
  /^(?:url|image-set|cross-fade|element|(?:repeating-)?(?:linear|radial|conic)-gradient)\(/i
const colorPattern =
  /^(?:#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgb|hsl)a?\()/i
const namedColorPattern = /^(?:transparent|currentcolor|white|black)$/i
const imagePathPattern =
  /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:[?#].*)?$/i

const clamp = (
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

const cssUrl = (value: string) => {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  return `url("${escaped}")`
}

/**
 * Accepts a plain image URL, a data URL, a CSS image function (url(),
 * gradients, image-set()) or a CSS color. The returned strings are applied
 * directly to background-image / background-color.
 */
export function resolveBackground(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return { image: "", color: "" }

  if (imageFunctionPattern.test(trimmed)) {
    return { image: trimmed, color: "" }
  }
  if (colorPattern.test(trimmed) || namedColorPattern.test(trimmed)) {
    return { image: "", color: trimmed }
  }
  if (
    trimmed.startsWith("data:image/") ||
    /^(?:https?:)?\/\//i.test(trimmed) ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../") ||
    imagePathPattern.test(trimmed)
  ) {
    return { image: cssUrl(trimmed), color: "" }
  }
  if (
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("color", trimmed)
  ) {
    return { image: "", color: trimmed }
  }

  // Keep unknown CSS values intact so custom values such as var(--bg) still
  // work, while an invalid value is simply ignored by the browser.
  return { image: trimmed, color: "" }
}

export function resolveHomeBackground(
  options: HomeBackgroundOptions,
): ResolvedHomeBackground {
  const background = resolveBackground(options.value)
  const active = !!(background.image || background.color)
  return {
    active,
    ...background,
    blur: clamp(options.blur, 0, 30, 0),
    mask: clamp(options.mask, 0, 100, 50),
  }
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("image decode failed"))
    image.src = src
  })

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error("read failed"))
    reader.readAsDataURL(blob)
  })

export interface ProcessedBackgroundImage {
  dataUrl: string
  width: number
  height: number
  bytes: number
}

/**
 * Keeps an uploaded image inside the settings payload without throwing away
 * too much quality. The longest edge is capped at 1920px and the result is
 * encoded as WebP (JPEG when WebP is unavailable).
 */
export async function processBackgroundImage(
  file: File,
): Promise<ProcessedBackgroundImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("not_image")
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("too_large")
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const sourceWidth = image.naturalWidth || image.width
    const sourceHeight = image.naturalHeight || image.height
    if (!sourceWidth || !sourceHeight) throw new Error("invalid_image")

    const maxEdge = 1920
    const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight))
    const width = Math.max(1, Math.round(sourceWidth * scale))
    const height = Math.max(1, Math.round(sourceHeight * scale))

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d")
    if (!context) throw new Error("canvas unavailable")
    context.drawImage(image, 0, 0, width, height)

    const encode = (type: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82))
    const blob = (await encode("image/webp")) ?? (await encode("image/jpeg"))
    if (!blob) throw new Error("encode failed")

    return {
      dataUrl: await blobToDataUrl(blob),
      width,
      height,
      bytes: blob.size,
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
