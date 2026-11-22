/**
 * Đọc cấu hình quảng cáo từ biến môi trường. Hàm thuần, dùng chung cho app (import.meta.env)
 * và cho plugin lúc build (loadEnv) nên không được đụng tới import.meta.env ở đây.
 */
export type AdProvider = 'none' | 'adsense' | 'ezoic'

export const PLACEMENTS = ['top', 'railLeft', 'railRight', 'processing', 'result'] as const
export type Placement = (typeof PLACEMENTS)[number]

export interface AdConfig {
  provider: AdProvider
  /** ca-pub-…, chỉ có với AdSense */
  adsenseClient?: string
  /** Hiện khung giả thay cho quảng cáo thật (luôn bật khi chạy dev). */
  preview: boolean
  /** Mã vị trí: data-ad-slot của AdSense, hoặc số placeholder của Ezoic. */
  slots: Partial<Record<Placement, string>>
  /** Lý do cấu hình bị bỏ qua (để cảnh báo lúc build). */
  warning?: string
}

type Env = Record<string, string | boolean | undefined>

const ADSENSE_CLIENT = /^ca-pub-\d{10,20}$/
const NUMERIC = /^\d+$/

export function parseAdConfig(env: Env): AdConfig {
  const str = (key: string) => {
    const v = env[key]
    return typeof v === 'string' && v.trim() ? v.trim() : undefined
  }
  const num = (key: string) => {
    const v = str(key)
    return v && NUMERIC.test(v) ? v : undefined
  }
  const preview = /^(1|true|yes)$/i.test(str('VITE_AD_PREVIEW') ?? '')
  const raw = (str('VITE_AD_PROVIDER') ?? 'none').toLowerCase()
  const none = (warning?: string): AdConfig => ({ provider: 'none', preview, slots: {}, warning })

  if (raw === 'adsense') {
    const client = str('VITE_ADSENSE_CLIENT')
    if (!client || !ADSENSE_CLIENT.test(client)) {
      return none('VITE_AD_PROVIDER=adsense nhưng VITE_ADSENSE_CLIENT không hợp lệ (cần dạng ca-pub-1234567890123456)')
    }
    const rail = num('VITE_AD_SLOT_RAIL')
    return {
      provider: 'adsense',
      adsenseClient: client,
      preview,
      slots: {
        top: num('VITE_AD_SLOT_TOP'),
        railLeft: rail,
        railRight: rail,
        processing: num('VITE_AD_SLOT_PROCESSING'),
        result: num('VITE_AD_SLOT_RESULT'),
      },
    }
  }

  if (raw === 'ezoic') {
    return {
      provider: 'ezoic',
      preview,
      slots: {
        top: num('VITE_EZOIC_ID_TOP'),
        railLeft: num('VITE_EZOIC_ID_RAIL_LEFT'),
        railRight: num('VITE_EZOIC_ID_RAIL_RIGHT'),
        processing: num('VITE_EZOIC_ID_PROCESSING'),
        result: num('VITE_EZOIC_ID_RESULT'),
      },
    }
  }

  return none(raw === 'none' ? undefined : `VITE_AD_PROVIDER="${raw}" không hợp lệ, chỉ nhận none | adsense | ezoic`)
}

/** Quảng cáo thật có được bật không (có mạng quảng cáo và không ở chế độ khung giả). */
export const adsLive = (c: AdConfig) => c.provider !== 'none' && !c.preview

/** Dòng ads.txt cho AdSense: ca-pub-123 -> "google.com, pub-123, DIRECT, f08c47fec0942fa0" */
export function adsTxtLine(client: string): string {
  return `google.com, ${client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0`
}

/** Thẻ cần chèn vào <head> của mọi trang khi bật quảng cáo thật. */
export function adHeadTags(c: AdConfig): string {
  if (!adsLive(c)) return ''
  // Cờ __adsBlocked để AdSlot tự ẩn khi trình chặn quảng cáo chặn script.
  const onerror = 'onerror="window.__adsBlocked=true"'
  if (c.provider === 'adsense') {
    return [
      `<meta name="google-adsense-account" content="${c.adsenseClient}" />`,
      `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${c.adsenseClient}" crossorigin="anonymous" ${onerror}></script>`,
    ].join('\n    ')
  }
  return [
    `<script async src="https://www.ezojs.com/ezoic/sa.min.js" ${onerror}></script>`,
    `<script>window.ezstandalone = window.ezstandalone || {}; ezstandalone.cmd = ezstandalone.cmd || [];</script>`,
  ].join('\n    ')
}
