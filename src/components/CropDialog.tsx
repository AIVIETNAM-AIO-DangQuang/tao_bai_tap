import { useEffect, useState } from 'react'
import ReactCrop, { type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import type { Question, Rect } from '../types'
import { rotatedSize } from '../lib/geometry'
import { renderProcessed } from '../lib/image'

interface Props {
  question: Question
  onClose: () => void
  onSave: (crop: Rect | undefined) => void
}

const FULL: Crop = { unit: '%', x: 0, y: 0, width: 100, height: 100 }

export function CropDialog({ question, onClose, onSave }: Props) {
  const frame = rotatedSize(question)
  const [src, setSrc] = useState<string>()
  const [crop, setCrop] = useState<Crop>(() => {
    const c = question.crop
    if (!c) return FULL
    return {
      unit: '%',
      x: (c.x / frame.w) * 100,
      y: (c.y / frame.h) * 100,
      width: (c.w / frame.w) * 100,
      height: (c.h / frame.h) * 100,
    }
  })

  // Ảnh nguồn: đã xoay nhưng chưa cắt
  useEffect(() => {
    let url: string | undefined
    let cancelled = false
    renderProcessed({ ...question, crop: undefined }, 1600).then((b) => {
      if (cancelled) return
      url = URL.createObjectURL(b)
      setSrc(url)
    })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [question])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = () => {
    if (!crop.width || !crop.height || (crop.width > 99.5 && crop.height > 99.5)) return onSave(undefined)
    const clamp = (v: number, max: number) => Math.min(Math.max(Math.round(v), 0), max)
    const x = clamp((crop.x / 100) * frame.w, frame.w - 1)
    const y = clamp((crop.y / 100) * frame.h, frame.h - 1)
    onSave({
      x,
      y,
      w: Math.max(1, clamp((crop.width / 100) * frame.w, frame.w - x)),
      h: Math.max(1, clamp((crop.height / 100) * frame.h, frame.h - y)),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 p-3" role="dialog" aria-modal="true">
      <p className="mb-2 text-center text-sm text-white">Kéo các góc hoặc cạnh để chọn phần câu hỏi cần giữ lại</p>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {src ? (
          <ReactCrop crop={crop} onChange={(_, pc) => setCrop(pc)} keepSelection minWidth={20} minHeight={20}>
            <img src={src} alt="Ảnh cần cắt" style={{ maxHeight: 'calc(100vh - 140px)', maxWidth: '100%' }} />
          </ReactCrop>
        ) : (
          <span className="text-white">Đang tải ảnh…</span>
        )}
      </div>
      <div className="mt-3 flex justify-center gap-3">
        <button type="button" onClick={onClose} className="rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/20">
          Hủy
        </button>
        <button
          type="button"
          onClick={() => setCrop(FULL)}
          className="rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/20"
        >
          Bỏ cắt
        </button>
        <button type="button" onClick={save} className="rounded-lg bg-sky-500 px-5 py-2 font-semibold text-white hover:bg-sky-600">
          Lưu
        </button>
      </div>
    </div>
  )
}
