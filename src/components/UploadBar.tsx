import { useRef } from 'react'

interface Props {
  onFiles: (files: File[]) => void
}

export function UploadBar({ onFiles }: Props) {
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // cho phép chọn lại cùng một file
    if (files.length) onFiles(files)
  }

  return (
    <section className="rounded-xl border-2 border-dashed border-sky-300 bg-sky-50 p-4 text-center">
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => camera.current?.click()}
          className="rounded-lg bg-sky-600 px-5 py-3 font-semibold text-white shadow hover:bg-sky-700"
        >
          📷 Chụp câu hỏi
        </button>
        <button
          type="button"
          onClick={() => gallery.current?.click()}
          className="rounded-lg border border-sky-600 bg-white px-5 py-3 font-semibold text-sky-700 hover:bg-sky-100"
        >
          🖼️ Chọn ảnh
        </button>
      </div>
      <p className="mt-2 hidden text-sm text-slate-500 sm:block">
        Trên máy tính có thể kéo thả ảnh vào trang hoặc dán ảnh (Ctrl+V).
      </p>
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={handle} />
      <input ref={gallery} type="file" accept="image/*" multiple hidden onChange={handle} />
    </section>
  )
}
