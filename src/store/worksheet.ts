import { useEffect, useReducer, useState } from 'react'
import { del, get, set } from 'idb-keyval'
import type { LayoutOptions, Question, Rect, WorksheetHeader, WorksheetState } from '../types'
import { nextRotation, rotateCrop, rotatedSize } from '../lib/geometry'

const STORAGE_KEY = 'scan-bai/worksheet'

const today = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const defaultOptions: LayoutOptions = {
  marginMm: 15,
  gapMm: 6,
  maxImageWidthPct: 100,
  numberLabels: true,
  labelPrefix: 'Câu',
  defaultAnswerMm: 20,
}

export const emptyState = (): WorksheetState => ({
  questions: [],
  header: { title: 'BÀI TẬP VỀ NHÀ', subject: '', className: '', date: today(), showStudentName: true },
  options: { ...defaultOptions },
})

export type Action =
  | { type: 'load'; state: WorksheetState }
  | { type: 'reset' }
  | { type: 'add'; questions: Question[] }
  | { type: 'remove'; id: string }
  | { type: 'rotate'; id: string; dir: 1 | -1 }
  | { type: 'crop'; id: string; crop?: Rect }
  | { type: 'answerSpace'; id: string; mm: number }
  | { type: 'answerSpaceAll'; mm: number }
  | { type: 'move'; from: number; to: number }
  | { type: 'header'; patch: Partial<WorksheetHeader> }
  | { type: 'options'; patch: Partial<LayoutOptions> }

const mapQ = (s: WorksheetState, id: string, f: (q: Question) => Question): WorksheetState => ({
  ...s,
  questions: s.questions.map((q) => (q.id === id ? f(q) : q)),
})

export function reducer(s: WorksheetState, a: Action): WorksheetState {
  switch (a.type) {
    case 'load':
      return a.state
    case 'reset':
      return emptyState()
    case 'add':
      return { ...s, questions: [...s.questions, ...a.questions] }
    case 'remove':
      return { ...s, questions: s.questions.filter((q) => q.id !== a.id) }
    case 'rotate':
      return mapQ(s, a.id, (q) => ({
        ...q,
        rotation: nextRotation(q.rotation, a.dir),
        crop: q.crop && rotateCrop(q.crop, rotatedSize(q), a.dir),
      }))
    case 'crop':
      return mapQ(s, a.id, (q) => ({ ...q, crop: a.crop }))
    case 'answerSpace':
      return mapQ(s, a.id, (q) => ({ ...q, answerSpaceMm: a.mm }))
    case 'answerSpaceAll':
      return {
        ...s,
        options: { ...s.options, defaultAnswerMm: a.mm },
        questions: s.questions.map((q) => ({ ...q, answerSpaceMm: a.mm })),
      }
    case 'move': {
      const qs = [...s.questions]
      const [item] = qs.splice(a.from, 1)
      qs.splice(a.to, 0, item)
      return { ...s, questions: qs }
    }
    case 'header':
      return { ...s, header: { ...s.header, ...a.patch } }
    case 'options':
      return { ...s, options: { ...s.options, ...a.patch } }
  }
}

/** State của phiếu bài tập, tự lưu nháp vào IndexedDB và khôi phục khi mở lại. */
export function useWorksheet() {
  const [state, dispatch] = useReducer(reducer, undefined, emptyState)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    get<WorksheetState>(STORAGE_KEY)
      .then((saved) => {
        if (saved?.questions) {
          const base = emptyState()
          dispatch({
            type: 'load',
            state: {
              questions: saved.questions,
              header: { ...base.header, ...saved.header },
              options: { ...base.options, ...saved.options },
            },
          })
        }
      })
      .catch((e) => console.warn('Không đọc được bản nháp', e))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!loaded) return
    const t = setTimeout(() => {
      set(STORAGE_KEY, state).catch((e) => console.warn('Không lưu được bản nháp', e))
    }, 500)
    return () => clearTimeout(t)
  }, [state, loaded])

  const reset = () => {
    dispatch({ type: 'reset' })
    del(STORAGE_KEY).catch(() => {})
  }

  return { state, dispatch, loaded, reset }
}
