import type { WorksheetHeader } from '../types'

interface Props {
  header: WorksheetHeader
  onChange: (patch: Partial<WorksheetHeader>) => void
}

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-none'

export function HeaderForm({ header, onChange }: Props) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold text-slate-700">Tiêu đề phiếu bài tập</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 text-sm text-slate-600">
          Tên bài
          <input
            className={input}
            value={header.title}
            placeholder="VD: BÀI TẬP VỀ NHÀ TUẦN 12"
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </label>
        <label className="text-sm text-slate-600">
          Môn
          <input
            className={input}
            value={header.subject}
            placeholder="Toán"
            onChange={(e) => onChange({ subject: e.target.value })}
          />
        </label>
        <label className="text-sm text-slate-600">
          Lớp
          <input
            className={input}
            value={header.className}
            placeholder="5A"
            onChange={(e) => onChange({ className: e.target.value })}
          />
        </label>
        <label className="text-sm text-slate-600">
          Ngày
          <input type="date" className={input} value={header.date} onChange={(e) => onChange({ date: e.target.value })} />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="size-4"
            checked={header.showStudentName}
            onChange={(e) => onChange({ showStudentName: e.target.checked })}
          />
          Dòng "Họ và tên" cho học sinh
        </label>
      </div>
    </section>
  )
}
