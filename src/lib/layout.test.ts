import { describe, expect, it } from 'vitest'
import { A4, layout, mmToPt } from './layout'
import { nextRotation, processedSize, rotateCrop, rotatedSize } from './geometry'
import type { LayoutOptions, WorksheetHeader } from '../types'

const opts: LayoutOptions = {
  marginMm: 15,
  gapMm: 6,
  maxImageWidthPct: 100,
  numberLabels: true,
  labelPrefix: 'Câu',
  defaultAnswerMm: 20,
}
const noHeader: WorksheetHeader = { title: '', subject: '', className: '', date: '', showStudentName: false }
const fullHeader: WorksheetHeader = {
  title: 'Bài tập Toán',
  subject: 'Toán',
  className: '5A',
  date: '2026-11-22',
  showStudentName: true,
}

let n = 0
const q = (width: number, height: number, extra: object = {}) => ({
  id: `q${n++}`,
  width,
  height,
  rotation: 0 as const,
  answerSpaceMm: 0,
  ...extra,
})

const margin = mmToPt(15)
const bottom = A4.h - margin

describe('layout', () => {
  it('một ảnh: nằm trong lề, có nhãn "Câu 1:"', () => {
    const pages = layout([q(1500, 300)], noHeader, opts)
    expect(pages).toHaveLength(1)
    const img = pages[0].images[0]
    expect(img.x).toBeCloseTo(margin)
    expect(img.w).toBeLessThanOrEqual(A4.w - 2 * margin + 0.01)
    expect(img.h / img.w).toBeCloseTo(300 / 1500)
    expect(pages[0].texts.map((t) => t.text)).toContain('Câu 1:')
  })

  it('nhiều ảnh ngắn nằm chung một trang', () => {
    const pages = layout([q(1500, 200), q(1500, 200), q(1500, 200), q(1500, 200)], noHeader, opts)
    expect(pages).toHaveLength(1)
    expect(pages[0].images).toHaveLength(4)
    // Xếp từ trên xuống, không chồng nhau
    const ys = pages[0].images.map((i) => i.y)
    expect([...ys].sort((a, b) => a - b)).toEqual(ys)
    pages[0].images.slice(1).forEach((img, i) => {
      const prev = pages[0].images[i]
      expect(img.y).toBeGreaterThanOrEqual(prev.y + prev.h)
    })
  })

  it('câu không vừa phần còn lại thì sang trang mới, không câu nào tràn lề dưới', () => {
    const qs = Array.from({ length: 6 }, () => q(1500, 900, { answerSpaceMm: 20 }))
    const pages = layout(qs, fullHeader, opts)
    expect(pages.length).toBeGreaterThan(1)
    const all = pages.flatMap((p) => p.images)
    expect(all).toHaveLength(6)
    for (const img of all) expect(img.y + img.h).toBeLessThanOrEqual(bottom + 0.01)
    expect(pages[0].texts.at(-1)?.text).toBe(`Trang 1/${pages.length}`)
  })

  it('ảnh rất cao được thu nhỏ cho vừa một trang', () => {
    const pages = layout([q(1000, 20000)], noHeader, opts)
    expect(pages).toHaveLength(1)
    const img = pages[0].images[0]
    expect(img.y + img.h).toBeLessThanOrEqual(bottom + 0.01)
    expect(img.h / img.w).toBeCloseTo(20)
  })

  it('ảnh chụp màn hình (~900px) được phóng kín chiều ngang trang', () => {
    const img = layout([q(900, 200)], noHeader, opts)[0].images[0]
    expect(img.w).toBeCloseTo(A4.w - 2 * margin)
  })

  it('cỡ chữ đồng đều: mọi câu cùng tỷ lệ phóng, câu rộng nhất kín trang', () => {
    const [p] = layout([q(600, 150), q(900, 200), q(450, 100)], noHeader, opts)
    const contentW = A4.w - 2 * margin
    const scale = contentW / 900
    expect(p.images[1].w).toBeCloseTo(contentW)
    expect(p.images[0].w).toBeCloseTo(600 * scale)
    expect(p.images[2].w).toBeCloseTo(450 * scale)
    expect(p.images[0].h).toBeCloseTo(150 * scale)
  })

  it('"Cỡ câu hỏi" 50% thu câu rộng nhất về nửa trang', () => {
    const img = layout([q(900, 200)], noHeader, { ...opts, maxImageWidthPct: 50 })[0].images[0]
    expect(img.w).toBeCloseTo((A4.w - 2 * margin) / 2)
  })

  it('ảnh rất nhỏ không bị phóng quá 1pt/pixel (72 DPI) để khỏi vỡ hạt', () => {
    const img = layout([q(200, 50)], noHeader, opts)[0].images[0]
    expect(img.w).toBeCloseTo(200)
  })

  it('tiêu đề đẩy câu 1 xuống và chỉ có ở trang 1', () => {
    const without = layout([q(1500, 300)], noHeader, opts)[0].images[0].y
    const pages = layout([q(1500, 300)], fullHeader, opts)
    expect(pages[0].images[0].y).toBeGreaterThan(without + 40)
    const texts = pages[0].texts.map((t) => t.text)
    expect(texts).toContain('Bài tập Toán')
    expect(texts).toContain('Môn: Toán     Lớp: 5A     Ngày: 22/11/2026')
    expect(texts.some((t) => t.startsWith('Họ và tên:'))).toBe(true)
    expect(pages[0].lines).toHaveLength(1)
  })

  it('tắt đánh số thì không có nhãn', () => {
    const pages = layout([q(1500, 300)], noHeader, { ...opts, numberLabels: false })
    expect(pages[0].texts).toHaveLength(0)
    expect(pages[0].images[0].y).toBeCloseTo(margin)
  })

  it('ảnh ngang và ảnh dọc (đã xoay) giữ đúng tỷ lệ', () => {
    const [p] = layout([q(1600, 1200), q(1600, 1200, { rotation: 90 })], noHeader, { ...opts, maxImageWidthPct: 50 })
    const [land, port] = p.images
    expect(land.h / land.w).toBeCloseTo(1200 / 1600)
    expect(port.h / port.w).toBeCloseTo(1600 / 1200)
  })
})

describe('geometry', () => {
  it('rotatedSize / processedSize', () => {
    expect(rotatedSize({ width: 100, height: 50, rotation: 90 })).toEqual({ w: 50, h: 100 })
    expect(processedSize({ width: 100, height: 50, rotation: 0, crop: { x: 1, y: 2, w: 30, h: 20 } })).toEqual({
      w: 30,
      h: 20,
    })
  })

  it('nextRotation quay vòng', () => {
    expect(nextRotation(270, 1)).toBe(0)
    expect(nextRotation(0, -1)).toBe(270)
  })

  it('rotateCrop: xoay xuôi rồi xoay ngược trả về vùng cắt ban đầu', () => {
    const frame = { w: 400, h: 300 }
    const crop = { x: 10, y: 20, w: 100, h: 50 }
    const cw = rotateCrop(crop, frame, 1)
    // Ảnh 400x300 xoay xuôi thành 300x400; vùng cắt phải nằm gọn trong đó
    expect(cw.x + cw.w).toBeLessThanOrEqual(300)
    expect(cw.y + cw.h).toBeLessThanOrEqual(400)
    expect(cw).toEqual({ x: 230, y: 10, w: 50, h: 100 })
    expect(rotateCrop(cw, { w: 300, h: 400 }, -1)).toEqual(crop)
  })
})
