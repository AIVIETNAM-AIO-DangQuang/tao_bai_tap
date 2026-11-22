import { useEffect, useRef, useState } from 'react'
import { adConfig } from './config'
import type { Placement } from './parse'
import { adsBlocked, releaseAd, requestAd } from './runtime'

/** Kích thước cố định của từng vị trí, giữ chỗ sẵn để trang không bị nhảy khi quảng cáo tải xong. */
const SIZES: Record<Placement, { box: string; label: string }> = {
  top: { box: 'h-[100px] w-[320px] sm:h-[90px] sm:w-[728px]', label: '728×90 · điện thoại 320×100' },
  railLeft: { box: 'h-[600px] w-[160px]', label: '160×600' },
  railRight: { box: 'h-[600px] w-[160px]', label: '160×600' },
  processing: { box: 'h-[250px] w-[300px]', label: '300×250' },
  result: { box: 'h-[250px] w-[300px]', label: '300×250' },
}

interface Props {
  placement: Placement
  className?: string
}

/**
 * Một vị trí quảng cáo.
 * - Dev / VITE_AD_PREVIEW: khung xám giả, không tải gì.
 * - Không cấu hình mạng quảng cáo hoặc thiếu mã vị trí: không hiện gì, không chiếm chỗ.
 * - Quảng cáo thật: chỉ yêu cầu quảng cáo khi khung sắp cuộn vào màn hình; tự ẩn khi bị chặn hoặc không có quảng cáo.
 */
export function AdSlot({ placement, className = '' }: Props) {
  const { provider, preview, adsenseClient } = adConfig
  const slotId = adConfig.slots[placement]
  const live = !preview && provider !== 'none' && !!slotId
  const ref = useRef<HTMLDivElement>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!live || !el || !slotId) return
    if (adsBlocked()) {
      setHidden(true)
      return
    }
    let requested = false
    const io = new IntersectionObserver(
      (entries) => {
        if (requested || !entries.some((e) => e.isIntersecting)) return
        requested = true
        io.disconnect()
        requestAd(provider, slotId)
      },
      { rootMargin: '200px' },
    )
    io.observe(el)

    // AdSense đánh dấu data-ad-status="unfilled" khi không có quảng cáo phù hợp
    const ins = el.querySelector('ins')
    const mo = ins
      ? new MutationObserver(() => ins.getAttribute('data-ad-status') === 'unfilled' && setHidden(true))
      : undefined
    if (ins) mo!.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] })
    const blockedCheck = setTimeout(() => adsBlocked() && setHidden(true), 4000)

    return () => {
      io.disconnect()
      mo?.disconnect()
      clearTimeout(blockedCheck)
      if (requested) releaseAd(provider, slotId)
    }
  }, [live, provider, slotId])

  if ((!preview && !live) || hidden) return null
  const size = SIZES[placement]

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <span className="mb-1 text-[10px] tracking-wide text-slate-400 uppercase">Quảng cáo</span>
      <div ref={ref} className={`${size.box} max-w-full overflow-hidden`}>
        {preview ? (
          <div className="grid size-full place-items-center rounded border-2 border-dashed border-slate-300 bg-slate-200/60 p-2 text-center text-xs text-slate-500">
            Quảng cáo {size.label}
            <br />({placement})
          </div>
        ) : provider === 'adsense' ? (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', height: '100%' }}
            data-ad-client={adsenseClient}
            data-ad-slot={slotId}
          />
        ) : (
          <div id={`ezoic-pub-ad-placeholder-${slotId}`} />
        )}
      </div>
    </div>
  )
}
