import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { buildPdf, pdfFileName } from './pdf'
import type { Question, WorksheetState } from '../types'
import { defaultOptions } from '../store/worksheet'

/**
 * Test dựng PDF thật (không xoay/cắt nên không cần canvas).
 * Đặt biến SAMPLES_DIR trỏ tới thư mục có cau1.jpg… để test với ảnh thật,
 * và PDF_OUT để ghi file PDF ra xem.
 */
const samples = process.env.SAMPLES_DIR

beforeAll(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const bytes = readFileSync(resolve('public', String(url).replace(/^.*?fonts\//, 'fonts/')))
    return new Response(bytes)
  })
})
afterAll(() => vi.unstubAllGlobals())

// JPEG 1x1 trắng
const TINY_JPEG = Uint8Array.from(
  atob(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  ),
  (c) => c.charCodeAt(0),
)

function sampleQuestions(): Question[] {
  if (!samples) {
    return [1, 2, 3].map((i) => ({
      id: `q${i}`,
      blob: new Blob([TINY_JPEG], { type: 'image/jpeg' }),
      width: 1400,
      height: 300 * i,
      rotation: 0,
      answerSpaceMm: 20,
    }))
  }
  const sizes = [
    [1400, 260],
    [1400, 420],
    [900, 1300],
    [1400, 300],
  ]
  return sizes.map(([width, height], i) => ({
    id: `q${i + 1}`,
    blob: new Blob([readFileSync(resolve(samples, `cau${i + 1}.jpg`))], { type: 'image/jpeg' }),
    width,
    height,
    rotation: 0,
    answerSpaceMm: 30,
  }))
}

describe('buildPdf', () => {
  it('tạo PDF A4 có đủ trang, tiêu đề tiếng Việt', async () => {
    const state: WorksheetState = {
      questions: sampleQuestions(),
      header: {
        title: 'BÀI TẬP VỀ NHÀ – TUẦN 12',
        subject: 'Toán',
        className: '5A',
        date: '2026-11-22',
        showStudentName: true,
      },
      options: { ...defaultOptions },
    }
    const bytes = await buildPdf(state)
    if (process.env.PDF_OUT) writeFileSync(process.env.PDF_OUT, bytes)

    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
    const { width, height } = doc.getPage(0).getSize()
    expect(width).toBeCloseTo(595.28)
    expect(height).toBeCloseTo(841.89)
    expect(doc.getTitle()).toBe('BÀI TẬP VỀ NHÀ – TUẦN 12')
    expect(pdfFileName(state)).toBe('BTVN_Toan_5A_22-11-2026.pdf')
  })
})
