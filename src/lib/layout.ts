import type { LayoutOptions, Question, WorksheetHeader } from '../types'
import { processedSize } from './geometry'

/** Khổ A4, đơn vị điểm PDF (1pt = 1/72 inch). */
export const A4 = { w: 595.28, h: 841.89 }
export const mmToPt = (mm: number) => (mm * 72) / 25.4

/**
 * Tỷ lệ phóng tối đa (điểm PDF trên mỗi pixel ảnh). 1 tương đương 72 DPI:
 * ảnh quá nhỏ sẽ không bị phóng to hơn mức này để khỏi vỡ hạt.
 */
const MAX_PT_PER_PX = 1
const LABEL_SIZE = 12
const LABEL_BLOCK = 18
const MIN_IMAGE_H = 60

/** Mọi tọa độ tính từ góc TRÊN-trái của trang. `y` của chữ là đường chân chữ (baseline). */
export interface TextItem {
  text: string
  x: number
  y: number
  size: number
  bold: boolean
  align: 'left' | 'center'
}

export interface LineItem {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface ImageItem {
  questionId: string
  x: number
  y: number
  w: number
  h: number
}

export interface Page {
  texts: TextItem[]
  lines: LineItem[]
  images: ImageItem[]
}

export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

export function hasHeader(h: WorksheetHeader): boolean {
  return Boolean(h.title.trim() || h.subject.trim() || h.className.trim() || h.date || h.showStudentName)
}

/** Dựng khối tiêu đề ở đầu trang 1. Trả về vị trí y ngay dưới tiêu đề. */
function buildHeader(h: WorksheetHeader, margin: number, page: Page): number {
  let y = margin
  if (!hasHeader(h)) return y
  const cx = A4.w / 2

  if (h.title.trim()) {
    page.texts.push({ text: h.title.trim(), x: cx, y: y + 16, size: 16, bold: true, align: 'center' })
    y += 24
  }
  const info = [
    h.subject.trim() && `Môn: ${h.subject.trim()}`,
    h.className.trim() && `Lớp: ${h.className.trim()}`,
    h.date && `Ngày: ${formatDate(h.date)}`,
  ].filter(Boolean)
  if (info.length) {
    page.texts.push({ text: info.join('     '), x: cx, y: y + 11, size: 11, bold: false, align: 'center' })
    y += 18
  }
  if (h.showStudentName) {
    page.texts.push({
      text: `Họ và tên: ${'.'.repeat(70)}   Lớp: ${'.'.repeat(20)}`,
      x: margin,
      y: y + 13,
      size: 11,
      bold: false,
      align: 'left',
    })
    y += 22
  }
  y += 4
  page.lines.push({ x1: margin, y1: y, x2: A4.w - margin, y2: y })
  return y + 12
}

/**
 * Xếp các câu hỏi lên các trang A4, từ trên xuống dưới.
 * Câu nào không vừa phần còn lại của trang thì sang trang mới;
 * câu cao hơn cả trang thì được thu nhỏ cho vừa, không bị cắt đôi.
 */
export function layout(
  questions: Pick<Question, 'id' | 'width' | 'height' | 'rotation' | 'crop' | 'answerSpaceMm'>[],
  header: WorksheetHeader,
  options: LayoutOptions,
): Page[] {
  const margin = mmToPt(options.marginMm)
  const gap = mmToPt(options.gapMm)
  const contentW = A4.w - 2 * margin
  const bottom = A4.h - margin
  const labelBlock = options.numberLabels ? LABEL_BLOCK : 0

  const newPage = (): Page => ({ texts: [], lines: [], images: [] })
  const pages: Page[] = [newPage()]
  let page = pages[0]
  let pageTop = buildHeader(header, margin, page)
  let y = pageTop

  // Cùng một tỷ lệ phóng cho mọi câu để cỡ chữ đồng đều: câu rộng nhất vừa kín chiều ngang
  // (theo "Cỡ câu hỏi"), các câu khác phóng theo đúng tỷ lệ đó.
  const sizes = questions.map(processedSize)
  const widest = Math.max(1, ...sizes.map((s) => s.w))
  const scale = Math.min((contentW * options.maxImageWidthPct) / 100 / widest, MAX_PT_PER_PX)

  questions.forEach((q, i) => {
    const size = sizes[i]
    const answer = mmToPt(q.answerSpaceMm)
    let w = size.w * scale
    let h = size.h * scale

    const fits = () => y + labelBlock + h + answer <= bottom + 0.01
    if (!fits() && page.images.length > 0) {
      page = newPage()
      pages.push(page)
      pageTop = margin
      y = pageTop
    }
    if (!fits()) {
      // Trang trống mà vẫn không vừa: thu nhỏ ảnh.
      const maxH = Math.max(bottom - y - labelBlock - answer, MIN_IMAGE_H)
      if (h > maxH) {
        w = (w * maxH) / h
        h = maxH
      }
    }

    if (options.numberLabels) {
      const prefix = options.labelPrefix.trim()
      page.texts.push({
        text: `${prefix ? prefix + ' ' : ''}${i + 1}:`,
        x: margin,
        y: y + LABEL_SIZE,
        size: LABEL_SIZE,
        bold: true,
        align: 'left',
      })
    }
    page.images.push({ questionId: q.id, x: margin, y: y + labelBlock, w, h })
    y += labelBlock + h + answer + gap
  })

  if (pages.length > 1) {
    pages.forEach((p, i) => {
      p.texts.push({
        text: `Trang ${i + 1}/${pages.length}`,
        x: A4.w / 2,
        y: A4.h - margin / 2 + 3,
        size: 9,
        bold: false,
        align: 'center',
      })
    })
  }
  return pages
}
