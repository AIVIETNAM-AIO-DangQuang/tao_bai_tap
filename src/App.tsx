import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Question } from './types'
import { useWorksheet } from './store/worksheet'
import { detectTrim, importImage } from './lib/image'
import { layout } from './lib/layout'
import { useThumbnails } from './lib/useThumbnails'
import { UploadBar } from './components/UploadBar'
import { HeaderForm } from './components/HeaderForm'
import { QuestionList } from './components/QuestionList'
import { LayoutOptionsPanel } from './components/LayoutOptionsPanel'
import { LayoutPreview } from './components/LayoutPreview'
import { CropDialog } from './components/CropDialog'
import { StatusPanel, type PdfResult } from './components/StatusPanel'
import { SiteFooter } from './components/SiteFooter'
import { AdSlot } from './ads/AdSlot'

// crypto.randomUUID chỉ có trên HTTPS/localhost; khi mở qua IP mạng LAN thì cần phương án dự phòng.
const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const isImageFile = (f: File) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(f.name)

function canShareFiles() {
  try {
    return (
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File([''], 'a.pdf', { type: 'application/pdf' })] })
    )
  } catch {
    return false
  }
}

export default function App() {
  const { state, dispatch, loaded, reset } = useWorksheet()
  // Tiến trình xử lý ảnh: thêm ảnh khi đợt trước chưa xong thì cộng dồn vào cùng một đợt.
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const busy = progress.total - progress.done
  const [errors, setErrors] = useState<string[]>([])
  const [cropId, setCropId] = useState<string>()
  const [exporting, setExporting] = useState(false)
  const [lastPdf, setLastPdf] = useState<PdfResult>()
  const thumbs = useThumbnails(state.questions)
  const pages = useMemo(() => layout(state.questions, state.header, state.options), [state])
  const shareable = useMemo(canShareFiles, [])

  // Sửa phiếu bài tập thì file PDF vừa tạo không còn đúng nữa
  useEffect(() => setLastPdf(undefined), [state])

  const defaultAnswer = useRef(state.options.defaultAnswerMm)
  defaultAnswer.current = state.options.defaultAnswerMm

  const addFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter(isImageFile)
      if (!images.length) return
      setErrors([])
      setProgress((p) =>
        p.done >= p.total ? { done: 0, total: images.length } : { ...p, total: p.total + images.length },
      )
      // Xử lý lần lượt để giữ đúng thứ tự đã chọn và không tốn bộ nhớ.
      for (const file of images) {
        try {
          const img = await importImage(file)
          // Tự cắt viền trắng; lỗi ở bước này không được làm mất ảnh.
          const crop = await detectTrim({ ...img, rotation: 0 }).catch(() => undefined)
          const q: Question = { id: newId(), ...img, rotation: 0, crop, answerSpaceMm: defaultAnswer.current }
          dispatch({ type: 'add', questions: [q] })
        } catch (e) {
          console.warn(e)
          setErrors((errs) => [...errs, file.name || 'ảnh dán'])
        } finally {
          setProgress((p) => ({ ...p, done: p.done + 1 }))
        }
      }
    },
    [dispatch],
  )

  /** Cắt viền trắng cho các câu chưa được cắt (dùng cho ảnh có sẵn trong bản nháp). */
  const [trimming, setTrimming] = useState(false)
  const trimAll = async () => {
    setTrimming(true)
    let changed = 0
    try {
      for (const q of state.questions.filter((q) => !q.crop)) {
        const crop = await detectTrim(q).catch(() => undefined)
        if (crop) {
          dispatch({ type: 'crop', id: q.id, crop })
          changed++
        }
      }
    } finally {
      setTrimming(false)
    }
    if (!changed) alert('Không có câu nào cần cắt thêm viền trắng.')
  }

  // Kéo thả và dán ảnh ở bất kỳ đâu trên trang
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault()
    }
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.files.length) return
      e.preventDefault()
      addFiles(Array.from(e.dataTransfer.files))
    }
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? [])
      if (files.length) addFiles(files)
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('paste', onPaste)
    }
  }, [addFiles])

  const makePdf = async () => {
    setExporting(true)
    try {
      const { buildPdf, pdfFileName } = await import('./lib/pdf')
      const bytes = await buildPdf(state)
      const file = new File([bytes as BlobPart], pdfFileName(state), { type: 'application/pdf' })
      setLastPdf({ file, pages: pages.length })
      return file
    } catch (e) {
      console.error(e)
      alert('Không tạo được PDF: ' + (e instanceof Error ? e.message : String(e)))
      return undefined
    } finally {
      setExporting(false)
    }
  }

  const download = async () => {
    const file = await makePdf()
    if (file) saveFile(file)
  }

  const saveFile = (file: File) => {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const openPdf = async () => {
    // Mở tab trước (đồng bộ với cú bấm) để trình duyệt không chặn popup
    const tab = window.open('', '_blank')
    const file = await makePdf()
    if (!file) return tab?.close()
    const url = URL.createObjectURL(file)
    if (tab) tab.location.href = url
    else window.location.href = url
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const share = async () => {
    const file = await makePdf()
    if (!file) return
    try {
      await navigator.share({ files: [file], title: state.header.title || file.name })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') alert('Không chia sẻ được, hãy dùng nút Tải PDF.')
    }
  }

  const newWorksheet = () => {
    if (!state.questions.length || confirm('Xóa toàn bộ câu hỏi hiện tại để tạo bài mới?')) reset()
  }

  const cropQuestion = state.questions.find((q) => q.id === cropId)
  const n = state.questions.length
  const disabled = !n || exporting || busy > 0
  const btn = 'rounded-lg px-4 py-2.5 font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-50'

  return (
    // Màn hình từ 1440px: thêm hai cột quảng cáo dọc 160×600 ở hai bên lề, dính khi cuộn.
    <div className="min-[1440px]:grid min-[1440px]:grid-cols-[160px_minmax(0,72rem)_160px] min-[1440px]:justify-center min-[1440px]:gap-6">
      <aside className="hidden min-[1440px]:block">
        <AdSlot placement="railLeft" className="sticky top-5 mt-5" />
      </aside>

      <div className="mx-auto w-full max-w-6xl p-3 pb-28 sm:p-5 lg:pb-5">
        <header className="mb-4 flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">📝 Tạo bài tập về nhà</h1>
          <a href="./huong-dan" className="hidden text-sm text-sky-700 hover:underline sm:inline">
            Hướng dẫn
          </a>
          <button
            type="button"
            onClick={newWorksheet}
            className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Tạo bài mới
          </button>
        </header>

        <AdSlot placement="top" className="mb-5" />

        {!loaded ? (
          <p className="text-slate-500">Đang mở bản nháp…</p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
            <main className="flex flex-col gap-4">
              <UploadBar onFiles={addFiles} />
              <StatusPanel
                progress={progress}
                exporting={exporting}
                result={lastPdf}
                onDownloadAgain={() => lastPdf && saveFile(lastPdf.file)}
                onClose={() => setLastPdf(undefined)}
              />
              {errors.length > 0 && (
                <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                  Không đọc được: {errors.join(', ')}. Hãy thử ảnh JPG/PNG khác.
                </p>
              )}
              <section>
                <h2 className="mb-2 font-semibold text-slate-700">
                  Câu hỏi ({n}){' '}
                  {n > 1 && <span className="text-sm font-normal text-slate-500">· kéo ⠿ để đổi thứ tự</span>}
                </h2>
                <QuestionList
                  questions={state.questions}
                  thumbs={thumbs}
                  labelPrefix={state.options.labelPrefix}
                  dispatch={dispatch}
                  onCrop={setCropId}
                />
              </section>
              <HeaderForm header={state.header} onChange={(patch) => dispatch({ type: 'header', patch })} />
              <LayoutOptionsPanel
                options={state.options}
                onChange={(patch) => dispatch({ type: 'options', patch })}
                onApplyAnswerAll={(mm) => dispatch({ type: 'answerSpaceAll', mm })}
                onTrimAll={trimAll}
                trimming={trimming}
                hasQuestions={n > 0}
              />
            </main>

            <aside className="lg:sticky lg:top-5 lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto">
              <h2 className="mb-2 font-semibold text-slate-700">
                Xem trước <span className="text-sm font-normal text-slate-500">· {pages.length} trang A4</span>
              </h2>
              <LayoutPreview pages={pages} thumbs={thumbs} />
            </aside>
          </div>
        )}

        {/* Thanh hành động: cố định dưới cùng trên điện thoại */}
        <div className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap justify-center gap-2 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:static lg:mt-5 lg:border-0 lg:bg-transparent lg:p-0">
          <button
            type="button"
            disabled={disabled}
            onClick={download}
            className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
          >
            {exporting ? 'Đang tạo PDF…' : '⬇️ Tải PDF'}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={openPdf}
            className={`${btn} border border-slate-300 bg-white hover:bg-slate-50`}
          >
            👁️ Xem PDF
          </button>
          {shareable && (
            <button
              type="button"
              disabled={disabled}
              onClick={share}
              className={`${btn} bg-sky-600 text-white hover:bg-sky-700`}
            >
              📤 Chia sẻ
            </button>
          )}
        </div>

        {cropQuestion && (
          <CropDialog
            question={cropQuestion}
            onClose={() => setCropId(undefined)}
            onSave={(crop) => {
              dispatch({ type: 'crop', id: cropQuestion.id, crop })
              setCropId(undefined)
            }}
          />
        )}

        <SiteFooter />
      </div>

      <aside className="hidden min-[1440px]:block">
        <AdSlot placement="railRight" className="sticky top-5 mt-5" />
      </aside>
    </div>
  )
}
