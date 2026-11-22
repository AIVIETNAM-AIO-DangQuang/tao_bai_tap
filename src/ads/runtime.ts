import type { AdProvider } from './parse'

interface Ezstandalone {
  cmd: Array<() => void>
  showAds?: (...ids: number[]) => void
  destroyPlaceholders?: (...ids: number[]) => void
}

declare global {
  interface Window {
    adsbygoogle?: unknown[]
    ezstandalone?: Ezstandalone
    __adsBlocked?: boolean
  }
}

/** Script quảng cáo bị trình chặn quảng cáo chặn (cờ do thẻ <script onerror> trong <head> đặt). */
export const adsBlocked = () => window.__adsBlocked === true

const ezoic = (): Ezstandalone => (window.ezstandalone ??= { cmd: [] })

/** Yêu cầu mạng quảng cáo lấp đầy một vị trí đã có trong DOM. */
export function requestAd(provider: AdProvider, slotId: string) {
  try {
    if (provider === 'adsense') (window.adsbygoogle ??= []).push({})
    else if (provider === 'ezoic') {
      const ez = ezoic()
      ez.cmd.push(() => ez.showAds?.(Number(slotId)))
    }
  } catch (e) {
    console.warn('Không tải được quảng cáo', e)
  }
}

/** Giải phóng vị trí khi khung quảng cáo bị gỡ khỏi trang (Ezoic cần việc này với app một trang). */
export function releaseAd(provider: AdProvider, slotId: string) {
  if (provider !== 'ezoic') return
  const ez = ezoic()
  ez.cmd.push(() => ez.destroyPlaceholders?.(Number(slotId)))
}
