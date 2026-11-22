import { AdSlot } from '../ads/AdSlot'

export interface PdfResult {
  file: File
  pages: number
}

interface Props {
  /** Tiến trình xử lý ảnh của đợt đang thêm. */
  progress: { done: number; total: number }
  exporting: boolean
  result?: PdfResult
  onDownloadAgain: () => void
  onClose: () => void
}

/**
 * Khung trạng thái nằm ngay trong trang (không phủ lên trang, không bắt người dùng chờ):
 * đang xử lý ảnh / đang tạo PDF / đã tạo xong PDF, kèm một vị trí quảng cáo 300×250.
 */
export function StatusPanel({ progress, exporting, result, onDownloadAgain, onClose }: Props) {
  const processing = progress.total > progress.done
  if (!processing && !exporting && !result) return null

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <section
      className="flex flex-col items-center gap-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start"
      aria-live="polite"
    >
      <div className="w-full min-w-0 flex-1">
        {processing ? (
          <>
            <p className="font-semibold text-slate-700">
              Đang xử lý ảnh {Math.min(progress.done + 1, progress.total)}/{progress.total}…
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-500">Ảnh được xử lý ngay trên máy của bạn, không tải lên mạng.</p>
          </>
        ) : exporting ? (
          <p className="font-semibold text-slate-700">Đang tạo PDF…</p>
        ) : (
          result && (
            <>
              <p className="font-semibold text-emerald-700">✅ Đã tạo xong PDF</p>
              <p className="mt-1 text-sm break-all text-slate-600">
                {result.file.name} · {result.pages} trang · {(result.file.size / 1024 / 1024).toFixed(1)} MB
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onDownloadAgain}
                  className="rounded-lg border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  Tải lại file này
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Đóng
                </button>
              </div>
            </>
          )
        )}
      </div>
      {/* Quảng cáo tách khỏi các nút bằng khoảng cách và đường kẻ để tránh bấm nhầm */}
      <AdSlot
        key={result && !processing && !exporting ? 'result' : 'processing'}
        placement={result && !processing && !exporting ? 'result' : 'processing'}
        className="shrink-0 border-t border-slate-100 pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6"
      />
    </section>
  )
}
