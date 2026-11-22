import type { Question, Rect } from '../types'
import { rotatedSize } from './geometry'
import { findContentBounds } from './trim'

const MAX_SIDE = 2000
const JPEG_QUALITY = 0.85

function canvasToBlob(canvas: HTMLCanvasElement, quality = JPEG_QUALITY): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Không tạo được ảnh'))), 'image/jpeg', quality),
  )
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w))
  canvas.height = Math.max(1, Math.round(h))
  const ctx = canvas.getContext('2d')!
  // Nền trắng cho ảnh PNG trong suốt
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingQuality = 'high'
  return { canvas, ctx }
}

/**
 * Đọc file ảnh, áp dụng hướng EXIF, thu nhỏ cạnh dài về tối đa 2000px
 * và nén thành JPEG để PDF nhẹ, điện thoại không bị tràn bộ nhớ.
 */
export async function importImage(file: Blob): Promise<Pick<Question, 'blob' | 'width' | 'height'>> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
    const { canvas, ctx } = makeCanvas(bmp.width * scale, bmp.height * scale)
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return { blob: await canvasToBlob(canvas), width: canvas.width, height: canvas.height }
  } finally {
    bmp.close()
  }
}

/**
 * Áp dụng xoay rồi cắt lên ảnh gốc và trả về JPEG.
 * `maxSide` dùng để tạo ảnh thu nhỏ (thumbnail); bỏ trống để lấy đủ độ phân giải.
 */
export async function renderProcessed(
  q: Pick<Question, 'blob' | 'width' | 'height' | 'rotation' | 'crop'>,
  maxSide?: number,
): Promise<Blob> {
  // Không xoay, không cắt, không cần thu nhỏ: dùng luôn ảnh gốc, khỏi nén lại.
  if (q.rotation === 0 && !q.crop && (!maxSide || Math.max(q.width, q.height) <= maxSide)) return q.blob

  const frame = rotatedSize(q)
  const crop = q.crop ?? { x: 0, y: 0, w: frame.w, h: frame.h }
  const scale = maxSide ? Math.min(1, maxSide / Math.max(crop.w, crop.h)) : 1
  const { canvas, ctx } = makeCanvas(crop.w * scale, crop.h * scale)

  const bmp = await createImageBitmap(q.blob)
  try {
    ctx.scale(canvas.width / crop.w, canvas.height / crop.h)
    ctx.translate(-crop.x, -crop.y)
    switch (q.rotation) {
      case 90:
        ctx.translate(q.height, 0)
        ctx.rotate(Math.PI / 2)
        break
      case 180:
        ctx.translate(q.width, q.height)
        ctx.rotate(Math.PI)
        break
      case 270:
        ctx.translate(0, q.width)
        ctx.rotate(-Math.PI / 2)
        break
    }
    ctx.drawImage(bmp, 0, 0, q.width, q.height)
  } finally {
    bmp.close()
  }
  return canvasToBlob(canvas, maxSide ? 0.8 : JPEG_QUALITY)
}

/**
 * Tìm vùng cắt bỏ viền trắng quanh câu hỏi (tính trên ảnh đã xoay, chưa cắt).
 * Quét trên bản thu nhỏ cho nhanh rồi quy đổi về kích thước thật.
 */
export async function detectTrim(q: Pick<Question, 'blob' | 'width' | 'height' | 'rotation'>): Promise<Rect | undefined> {
  const SCAN_SIDE = 800
  const small = await renderProcessed({ ...q, crop: undefined }, SCAN_SIDE)
  const bmp = await createImageBitmap(small)
  try {
    const { canvas, ctx } = makeCanvas(bmp.width, bmp.height)
    ctx.drawImage(bmp, 0, 0)
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const b = findContentBounds(data, canvas.width, canvas.height)
    if (!b) return undefined

    const frame = rotatedSize(q)
    const sx = frame.w / canvas.width
    const sy = frame.h / canvas.height
    const x = Math.floor(b.x * sx)
    const y = Math.floor(b.y * sy)
    return {
      x,
      y,
      w: Math.min(frame.w - x, Math.ceil(b.w * sx)),
      h: Math.min(frame.h - y, Math.ceil(b.h * sy)),
    }
  } finally {
    bmp.close()
  }
}
