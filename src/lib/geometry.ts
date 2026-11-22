import type { Question, Rect, Rotation } from '../types'

type Sized = Pick<Question, 'width' | 'height' | 'rotation'>

/** Kích thước ảnh sau khi xoay (chưa cắt). */
export function rotatedSize(q: Sized): { w: number; h: number } {
  return q.rotation % 180 === 0 ? { w: q.width, h: q.height } : { w: q.height, h: q.width }
}

/** Kích thước ảnh cuối cùng (đã xoay và cắt). */
export function processedSize(q: Sized & Pick<Question, 'crop'>): { w: number; h: number } {
  return q.crop ? { w: q.crop.w, h: q.crop.h } : rotatedSize(q)
}

export function nextRotation(r: Rotation, dir: 1 | -1): Rotation {
  return (((r + dir * 90) % 360) + 360) % 360 as Rotation
}

/**
 * Xoay vùng cắt cùng với ảnh, để khi xoay ảnh không mất vùng đã cắt.
 * `frame` là kích thước ảnh (đã xoay) TRƯỚC lần xoay này.
 */
export function rotateCrop(crop: Rect, frame: { w: number; h: number }, dir: 1 | -1): Rect {
  if (dir === 1) {
    // Xoay 90° theo chiều kim đồng hồ: (x, y) -> (H - y, x)
    return { x: frame.h - crop.y - crop.h, y: crop.x, w: crop.h, h: crop.w }
  }
  // Ngược chiều kim đồng hồ: (x, y) -> (y, W - x)
  return { x: crop.y, y: frame.w - crop.x - crop.w, w: crop.h, h: crop.w }
}
