import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Question } from '../types'

export const ANSWER_SPACES = [0, 10, 20, 30, 40, 60, 80, 120]

interface Props {
  question: Question
  label: string
  thumb?: string
  onRotate: (dir: 1 | -1) => void
  onCrop: () => void
  onRemove: () => void
  onAnswerSpace: (mm: number) => void
}

const iconBtn = 'rounded-md border border-slate-300 bg-white px-2 py-1 text-sm hover:bg-slate-100'

export function QuestionCard({ question, label, thumb, onRotate, onCrop, onRemove, onAnswerSpace }: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-col rounded-xl border border-slate-200 bg-white p-2 shadow-sm ${
        isDragging ? 'z-10 opacity-80 ring-2 ring-sky-400' : ''
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded px-1 text-lg text-slate-400 hover:bg-slate-100 active:cursor-grabbing"
          aria-label={`Kéo để đổi thứ tự ${label}`}
          title="Kéo để đổi thứ tự"
        >
          ⠿
        </button>
        <span className="font-semibold text-slate-700">{label}</span>
        <button type="button" onClick={onRemove} className="ml-auto text-sm text-rose-600 hover:underline">
          Xóa
        </button>
      </div>

      <button
        type="button"
        onClick={onCrop}
        className="flex h-40 items-center justify-center overflow-hidden rounded-lg bg-slate-50"
        title="Bấm để cắt ảnh"
      >
        {thumb ? (
          <img src={thumb} alt={label} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-sm text-slate-400">Đang tải…</span>
        )}
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <button type="button" className={iconBtn} onClick={() => onRotate(-1)} title="Xoay trái">
          ⟲
        </button>
        <button type="button" className={iconBtn} onClick={() => onRotate(1)} title="Xoay phải">
          ⟳
        </button>
        <button type="button" className={iconBtn} onClick={onCrop} title="Cắt ảnh">
          ✂️ Cắt{question.crop ? ' •' : ''}
        </button>
        <label className="ml-auto flex items-center gap-1 text-xs text-slate-500">
          Chỗ làm bài
          <select
            value={question.answerSpaceMm}
            onChange={(e) => onAnswerSpace(Number(e.target.value))}
            className="rounded border border-slate-300 px-1 py-0.5 text-sm text-slate-700"
          >
            {ANSWER_SPACES.map((mm) => (
              <option key={mm} value={mm}>
                {mm === 0 ? 'Không' : `${mm} mm`}
              </option>
            ))}
          </select>
        </label>
      </div>
    </li>
  )
}
