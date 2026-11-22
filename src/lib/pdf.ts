import { PDFDocument, rgb, type PDFFont, type PDFImage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { WorksheetState } from '../types'
import { A4, layout } from './layout'
import { renderProcessed } from './image'

let fontCache: Promise<[ArrayBuffer, ArrayBuffer]> | undefined
function loadFonts() {
  const load = (name: string) =>
    fetch(`${import.meta.env.BASE_URL}fonts/${name}`).then((r) => {
      if (!r.ok) throw new Error(`Không tải được font ${name}`)
      return r.arrayBuffer()
    })
  if (!fontCache) {
    fontCache = Promise.all([load('BeVietnamPro-Regular.ttf'), load('BeVietnamPro-Bold.ttf')])
    fontCache.catch(() => (fontCache = undefined))
  }
  return fontCache
}

/** Tạo file PDF A4 từ phiếu bài tập. */
export async function buildPdf({ questions, header, options }: WorksheetState): Promise<Uint8Array> {
  const pages = layout(questions, header, options)
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  doc.setTitle(header.title.trim() || 'Bài tập về nhà')
  doc.setCreator('Tạo bài tập về nhà')

  const [regBytes, boldBytes] = await loadFonts()
  // subset: false vì fontkit đôi khi sinh sai glyph khi subset font có dấu.
  const regular = await doc.embedFont(regBytes, { subset: false })
  const bold = await doc.embedFont(boldBytes, { subset: false })

  const images = new Map<string, PDFImage>()
  for (const q of questions) {
    const blob = await renderProcessed(q)
    images.set(q.id, await doc.embedJpg(await blob.arrayBuffer()))
  }

  const black = rgb(0, 0, 0)
  for (const p of pages) {
    const page = doc.addPage([A4.w, A4.h])
    for (const t of p.texts) {
      const font: PDFFont = t.bold ? bold : regular
      const text = t.text.normalize('NFC')
      const x = t.align === 'center' ? t.x - font.widthOfTextAtSize(text, t.size) / 2 : t.x
      page.drawText(text, { x, y: A4.h - t.y, size: t.size, font, color: black })
    }
    for (const l of p.lines) {
      page.drawLine({
        start: { x: l.x1, y: A4.h - l.y1 },
        end: { x: l.x2, y: A4.h - l.y2 },
        thickness: 0.8,
        color: black,
      })
    }
    for (const img of p.images) {
      page.drawImage(images.get(img.questionId)!, { x: img.x, y: A4.h - img.y - img.h, width: img.w, height: img.h })
    }
  }
  return doc.save()
}

/** Tên file kiểu BTVN_Toan_5A_22-11-2026.pdf (bỏ dấu cho an toàn khi gửi qua các app). */
export function pdfFileName(s: WorksheetState): string {
  const strip = (v: string) =>
    v
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^\w-]+/g, '_')
      .replace(/^_+|_+$/g, '')
  const date = s.header.date.split('-').reverse().join('-')
  return ['BTVN', strip(s.header.subject), strip(s.header.className), date].filter(Boolean).join('_') + '.pdf'
}
