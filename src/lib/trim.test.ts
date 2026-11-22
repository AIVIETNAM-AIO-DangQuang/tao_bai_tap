import { describe, expect, it } from 'vitest'
import { findContentBounds } from './trim'

/** Tạo ảnh RGBA nền `bg`, vẽ các hình chữ nhật màu `color`. */
function image(w: number, h: number, rects: [number, number, number, number, number?][], bg = 255) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) data.set([bg, bg, bg, 255], i * 4)
  for (const [x0, y0, rw, rh, color = 0] of rects) {
    for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) data.set([color, color, color, 255], (y * w + x) * 4)
  }
  return data
}

const opts = { paddingPct: 0 } // bỏ lề để dễ so sánh; lề tối thiểu vẫn là 2px

describe('findContentBounds', () => {
  it('cắt nền trắng thừa bên phải và bên dưới', () => {
    // Chữ ở góc trên-trái, bên phải và dưới là nền trắng
    const data = image(400, 200, [[10, 10, 200, 20], [10, 50, 150, 20]])
    expect(findContentBounds(data, 400, 200, opts)).toEqual({ x: 8, y: 8, w: 204, h: 64 })
  })

  it('chừa lề quanh vùng chữ theo % cạnh dài', () => {
    const data = image(400, 200, [[100, 50, 100, 50]])
    const b = findContentBounds(data, 400, 200, { paddingPct: 2.5 })! // 10px
    expect(b).toEqual({ x: 90, y: 40, w: 120, h: 70 })
  })

  it('bỏ qua chấm nhiễu đơn lẻ', () => {
    const data = image(400, 200, [[10, 10, 100, 20], [380, 180, 1, 1]])
    const b = findContentBounds(data, 400, 200, opts)!
    expect(b.x + b.w).toBeLessThan(120)
    expect(b.y + b.h).toBeLessThan(40)
  })

  it('bỏ qua watermark xám nhạt', () => {
    // Watermark xám 225 trải khắp bên phải: chỉ nhạt hơn nền 30, không tính là nội dung
    const data = image(400, 200, [[10, 10, 100, 20], [200, 0, 200, 200, 225]])
    const b = findContentBounds(data, 400, 200, opts)!
    expect(b.x + b.w).toBeLessThan(120)
  })

  it('giấy ngả màu (nền xám 200) vẫn tìm đúng vùng chữ', () => {
    const data = image(400, 200, [[50, 50, 100, 30, 40]], 200)
    expect(findContentBounds(data, 400, 200, opts)).toEqual({ x: 48, y: 48, w: 104, h: 34 })
  })

  it('ảnh trắng trơn hoặc chữ đã sát mép thì không cắt', () => {
    expect(findContentBounds(image(100, 100, []), 100, 100)).toBeUndefined()
    expect(findContentBounds(image(100, 100, [[0, 0, 100, 100, 0]]), 100, 100)).toBeUndefined()
    expect(findContentBounds(image(100, 100, [[1, 1, 98, 98]]), 100, 100, opts)).toBeUndefined()
  })
})
