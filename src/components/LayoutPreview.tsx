import type { Page } from '../lib/layout'
import { A4 } from '../lib/layout'

interface Props {
  pages: Page[]
  thumbs: Record<string, string>
}

const pctX = (v: number) => `${(v / A4.w) * 100}%`
const pctY = (v: number) => `${(v / A4.h) * 100}%`
/** Cỡ chữ theo chiều rộng trang, để xem trước đúng tỷ lệ với PDF. */
const fontSize = (pt: number) => `${(pt / A4.w) * 100}cqw`

/** Xem trước bố cục bằng HTML, dựng từ cùng kết quả layout() mà PDF dùng. */
export function LayoutPreview({ pages, thumbs }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {pages.map((p, i) => (
        <div
          key={i}
          className="relative w-full overflow-hidden bg-white text-black shadow-md"
          style={{ aspectRatio: `${A4.w} / ${A4.h}`, containerType: 'inline-size', fontFamily: '"Be Vietnam Pro", sans-serif' }}
        >
          {p.texts.map((t, j) => (
            <div
              key={j}
              className="absolute whitespace-pre"
              style={{
                top: pctY(t.y - t.size * 0.95),
                left: t.align === 'center' ? 0 : pctX(t.x),
                width: t.align === 'center' ? '100%' : undefined,
                textAlign: t.align,
                fontSize: fontSize(t.size),
                lineHeight: 1.2,
                fontWeight: t.bold ? 700 : 400,
              }}
            >
              {t.text}
            </div>
          ))}
          {p.lines.map((l, j) => (
            <div
              key={j}
              className="absolute border-t border-black"
              style={{ top: pctY(l.y1), left: pctX(l.x1), width: pctX(l.x2 - l.x1) }}
            />
          ))}
          {p.images.map((img) => (
            <div
              key={img.questionId}
              className="absolute bg-slate-100"
              style={{ top: pctY(img.y), left: pctX(img.x), width: pctX(img.w), height: pctY(img.h) }}
            >
              {thumbs[img.questionId] && <img src={thumbs[img.questionId]} alt="" className="size-full" />}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
