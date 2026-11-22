import type { Rect } from '../types'

export interface TrimOptions {
  /** Điểm ảnh phải tối hơn nền ít nhất bấy nhiêu (0–255) mới coi là "chữ". */
  contrast?: number
  /** Số điểm "chữ" tối thiểu trên một hàng/cột, để bỏ qua chấm nhiễu lẻ. */
  minInk?: number
  /** Lề chừa lại quanh vùng chữ, tính theo % cạnh dài. */
  paddingPct?: number
}

/**
 * Tìm vùng có nội dung (chữ, hình) trong ảnh RGBA, bỏ phần nền trắng xung quanh.
 * Nền được ước lượng từ chính ảnh (độ sáng ở phân vị 90%) nên vẫn chạy với giấy hơi ngả màu;
 * watermark mờ chỉ nhạt hơn nền một chút sẽ không bị tính là nội dung.
 * Trả về `undefined` nếu ảnh trắng trơn hoặc gần như không có viền để cắt.
 */
export function findContentBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  { contrast = 60, minInk = 2, paddingPct = 1.5 }: TrimOptions = {},
): Rect | undefined {
  const n = width * height
  const lum = new Uint8Array(n)
  const hist = new Uint32Array(256)
  for (let i = 0; i < n; i++) {
    const v = (data[i * 4] * 299 + data[i * 4 + 1] * 587 + data[i * 4 + 2] * 114) / 1000
    lum[i] = v
    hist[lum[i]]++
  }
  // Độ sáng nền = phân vị 90%
  let acc = 0
  let bg = 255
  for (let v = 0; v < 256; v++) {
    acc += hist[v]
    if (acc >= n * 0.9) {
      bg = v
      break
    }
  }
  const ink = bg - contrast
  if (ink <= 0) return undefined

  const rows = new Uint32Array(height)
  const cols = new Uint32Array(width)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (lum[y * width + x] < ink) {
        rows[y]++
        cols[x]++
      }
    }
  }
  const first = (a: Uint32Array) => a.findIndex((c) => c >= minInk)
  const last = (a: Uint32Array) => {
    for (let i = a.length - 1; i >= 0; i--) if (a[i] >= minInk) return i
    return -1
  }
  const top = first(rows)
  const left = first(cols)
  if (top < 0 || left < 0) return undefined
  const bottom = last(rows)
  const right = last(cols)

  const pad = Math.max(2, Math.round((Math.max(width, height) * paddingPct) / 100))
  const x = Math.max(0, left - pad)
  const y = Math.max(0, top - pad)
  const w = Math.min(width, right + 1 + pad) - x
  const h = Math.min(height, bottom + 1 + pad) - y

  // Cắt được quá ít thì thôi, giữ nguyên ảnh
  if (w * h >= width * height * 0.97) return undefined
  return { x, y, w, h }
}
