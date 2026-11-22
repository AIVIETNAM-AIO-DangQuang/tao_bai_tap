export type Rotation = 0 | 90 | 180 | 270

/** Hình chữ nhật tính theo pixel, trong hệ tọa độ của ảnh ĐÃ xoay. */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Question {
  id: string
  /** Ảnh JPEG đã nén, đã áp dụng hướng EXIF (luôn "đứng thẳng"). */
  blob: Blob
  /** Kích thước của `blob` (trước khi xoay). */
  width: number
  height: number
  rotation: Rotation
  crop?: Rect
  /** Khoảng trống để học sinh làm bài bên dưới câu hỏi (mm). */
  answerSpaceMm: number
}

export interface WorksheetHeader {
  title: string
  subject: string
  className: string
  /** yyyy-mm-dd */
  date: string
  showStudentName: boolean
}

export interface LayoutOptions {
  marginMm: number
  gapMm: number
  /** Chiều rộng tối đa của ảnh, % so với vùng in. */
  maxImageWidthPct: number
  numberLabels: boolean
  labelPrefix: string
  defaultAnswerMm: number
}

export interface WorksheetState {
  questions: Question[]
  header: WorksheetHeader
  options: LayoutOptions
}
