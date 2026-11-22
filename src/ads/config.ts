import { parseAdConfig } from './parse'

/** Cấu hình quảng cáo của bản đang chạy. Khi chạy dev luôn dùng khung giả, không tải quảng cáo thật. */
const parsed = parseAdConfig(import.meta.env)
export const adConfig = { ...parsed, preview: parsed.preview || import.meta.env.DEV }
