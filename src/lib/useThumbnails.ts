import { useEffect, useReducer, useRef } from 'react'
import type { Question } from '../types'
import { renderProcessed } from './image'

const keyOf = (q: Question) => `${q.id}|${q.rotation}|${q.crop ? Object.values(q.crop).join(',') : ''}`

/**
 * Tạo ảnh thu nhỏ (đã xoay/cắt) cho từng câu, trả về map id -> object URL.
 * Trong lúc tạo ảnh mới vẫn giữ ảnh cũ để không bị nháy.
 */
export function useThumbnails(questions: Question[], maxSide = 900): Record<string, string> {
  const ready = useRef(new Map<string, { id: string; url: string }>())
  const pending = useRef(new Set<string>())
  const wanted = useRef(new Map<string, string>()) // id -> key mong muốn
  const [, bump] = useReducer((x: number) => x + 1, 0)

  const prune = () => {
    for (const [key, { id, url }] of ready.current) {
      const want = wanted.current.get(id)
      if (want === key) continue
      // Bỏ ảnh cũ khi câu đã bị xóa, hoặc khi ảnh mới của câu đó đã sẵn sàng
      if (want === undefined || ready.current.has(want)) {
        URL.revokeObjectURL(url)
        ready.current.delete(key)
      }
    }
  }

  useEffect(() => {
    wanted.current = new Map(questions.map((q) => [q.id, keyOf(q)]))
    prune()
    for (const q of questions) {
      const key = keyOf(q)
      if (ready.current.has(key) || pending.current.has(key)) continue
      pending.current.add(key)
      renderProcessed(q, maxSide)
        .then((blob) => {
          if (wanted.current.get(q.id) !== key) return
          ready.current.set(key, { id: q.id, url: URL.createObjectURL(blob) })
          prune()
          bump()
        })
        .catch((e) => console.warn('Không tạo được ảnh thu nhỏ', e))
        .finally(() => pending.current.delete(key))
    }
  }, [questions, maxSide])

  useEffect(
    () => () => {
      for (const { url } of ready.current.values()) URL.revokeObjectURL(url)
      ready.current.clear()
    },
    [],
  )

  const out: Record<string, string> = {}
  for (const q of questions) {
    const exact = ready.current.get(keyOf(q))
    if (exact) out[q.id] = exact.url
    else for (const v of ready.current.values()) if (v.id === q.id) out[q.id] = v.url
  }
  return out
}
