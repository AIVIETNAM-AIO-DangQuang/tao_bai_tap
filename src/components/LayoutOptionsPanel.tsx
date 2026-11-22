import type { LayoutOptions } from '../types'
import { ANSWER_SPACES } from './QuestionCard'

interface Props {
  options: LayoutOptions
  onChange: (patch: Partial<LayoutOptions>) => void
  onApplyAnswerAll: (mm: number) => void
  onTrimAll: () => void
  trimming: boolean
  hasQuestions: boolean
}

const select = 'rounded-lg border border-slate-300 px-2 py-1.5'

export function LayoutOptionsPanel({ options, onChange, onApplyAnswerAll, onTrimAll, trimming, hasQuestions }: Props) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold text-slate-700">Bố cục trang</h2>
      <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-2">
          Lề trang
          <select className={select} value={options.marginMm} onChange={(e) => onChange({ marginMm: +e.target.value })}>
            {[10, 15, 20, 25].map((v) => (
              <option key={v} value={v}>
                {v} mm
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between gap-2">
          Khoảng cách giữa các câu
          <select className={select} value={options.gapMm} onChange={(e) => onChange({ gapMm: +e.target.value })}>
            {[0, 3, 6, 10, 15].map((v) => (
              <option key={v} value={v}>
                {v} mm
              </option>
            ))}
          </select>
        </label>
        <label
          className="flex items-center justify-between gap-2 sm:col-span-2"
          title="100% = câu rộng nhất vừa kín chiều ngang trang; các câu khác phóng cùng tỷ lệ để cỡ chữ đồng đều"
        >
          <span className="whitespace-nowrap">Cỡ câu hỏi: {options.maxImageWidthPct}%</span>
          <input
            type="range"
            min={40}
            max={100}
            step={5}
            value={options.maxImageWidthPct}
            onChange={(e) => onChange({ maxImageWidthPct: +e.target.value })}
            className="w-full max-w-64"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="size-4"
            checked={options.numberLabels}
            onChange={(e) => onChange({ numberLabels: e.target.checked })}
          />
          Đánh số
          <select
            className={select}
            value={options.labelPrefix}
            disabled={!options.numberLabels}
            onChange={(e) => onChange({ labelPrefix: e.target.value })}
          >
            {['Câu', 'Bài', ''].map((v) => (
              <option key={v} value={v}>
                {v ? `${v} 1, ${v} 2…` : '1, 2, 3…'}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between gap-2">
          Chỗ làm bài mặc định
          <span className="flex gap-1">
            <select
              className={select}
              value={options.defaultAnswerMm}
              onChange={(e) => onChange({ defaultAnswerMm: +e.target.value })}
            >
              {ANSWER_SPACES.map((mm) => (
                <option key={mm} value={mm}>
                  {mm === 0 ? 'Không' : `${mm} mm`}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onApplyAnswerAll(options.defaultAnswerMm)}
              className="rounded-lg border border-slate-300 px-2 hover:bg-slate-100"
              title="Áp dụng cho tất cả các câu hiện có"
            >
              Áp dụng tất cả
            </button>
          </span>
        </label>
        <div className="flex items-center justify-between gap-2 sm:col-span-2">
          <span className="text-slate-500">Ảnh mới thêm được tự cắt viền trắng.</span>
          <button
            type="button"
            disabled={!hasQuestions || trimming}
            onClick={onTrimAll}
            className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:opacity-50"
            title="Cắt viền trắng cho các câu chưa được cắt"
          >
            {trimming ? 'Đang cắt…' : '✂️ Cắt viền trắng tất cả'}
          </button>
        </div>
      </div>
    </section>
  )
}
