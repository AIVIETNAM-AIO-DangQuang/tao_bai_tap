import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { Dispatch } from 'react'
import type { Question } from '../types'
import type { Action } from '../store/worksheet'
import { QuestionCard } from './QuestionCard'

interface Props {
  questions: Question[]
  thumbs: Record<string, string>
  labelPrefix: string
  dispatch: Dispatch<Action>
  onCrop: (id: string) => void
}

export function QuestionList({ questions, thumbs, labelPrefix, dispatch, onCrop }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = questions.findIndex((q) => q.id === active.id)
    const to = questions.findIndex((q) => q.id === over.id)
    if (from >= 0 && to >= 0) dispatch({ type: 'move', from, to })
  }

  if (!questions.length) {
    return (
      <p className="rounded-xl bg-white p-6 text-center text-slate-500">
        Chưa có câu hỏi nào. Hãy chụp hoặc chọn ảnh từng câu hỏi ở trên.
      </p>
    )
  }

  const prefix = labelPrefix.trim() || 'Câu'
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={questions.map((q) => q.id)} strategy={rectSortingStrategy}>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              label={`${prefix} ${i + 1}`}
              thumb={thumbs[q.id]}
              onRotate={(dir) => dispatch({ type: 'rotate', id: q.id, dir })}
              onCrop={() => onCrop(q.id)}
              onRemove={() => dispatch({ type: 'remove', id: q.id })}
              onAnswerSpace={(mm) => dispatch({ type: 'answerSpace', id: q.id, mm })}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
