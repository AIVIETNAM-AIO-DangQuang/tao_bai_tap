import { describe, expect, it } from 'vitest'
import { adHeadTags, adsLive, adsTxtLine, parseAdConfig } from './parse'

const CLIENT = 'ca-pub-1234567890123456'

describe('parseAdConfig', () => {
  it('mặc định không có quảng cáo', () => {
    const c = parseAdConfig({})
    expect(c.provider).toBe('none')
    expect(c.warning).toBeUndefined()
    expect(adsLive(c)).toBe(false)
    expect(adHeadTags(c)).toBe('')
  })

  it('AdSense: đọc client và mã từng vị trí, hai bên lề dùng chung một mã', () => {
    const c = parseAdConfig({
      VITE_AD_PROVIDER: 'AdSense',
      VITE_ADSENSE_CLIENT: ` ${CLIENT} `,
      VITE_AD_SLOT_TOP: '111',
      VITE_AD_SLOT_RAIL: '222',
      VITE_AD_SLOT_PROCESSING: '333',
      VITE_AD_SLOT_RESULT: 'abc', // không phải số -> bỏ qua
    })
    expect(c).toMatchObject({
      provider: 'adsense',
      adsenseClient: CLIENT,
      slots: { top: '111', railLeft: '222', railRight: '222', processing: '333', result: undefined },
    })
    expect(adsLive(c)).toBe(true)
    const head = adHeadTags(c)
    expect(head).toContain(`adsbygoogle.js?client=${CLIENT}`)
    expect(head).toContain(`<meta name="google-adsense-account" content="${CLIENT}" />`)
    expect(head).toContain('window.__adsBlocked=true')
  })

  it('AdSense thiếu hoặc sai client thì tắt quảng cáo và cảnh báo', () => {
    for (const client of [undefined, 'pub-123', 'ca-pub-abc']) {
      const c = parseAdConfig({ VITE_AD_PROVIDER: 'adsense', VITE_ADSENSE_CLIENT: client })
      expect(c.provider).toBe('none')
      expect(c.warning).toMatch(/VITE_ADSENSE_CLIENT/)
    }
  })

  it('Ezoic: mỗi vị trí một số placeholder riêng', () => {
    const c = parseAdConfig({
      VITE_AD_PROVIDER: 'ezoic',
      VITE_EZOIC_ID_TOP: '101',
      VITE_EZOIC_ID_RAIL_LEFT: '102',
      VITE_EZOIC_ID_RAIL_RIGHT: '103',
    })
    expect(c.slots).toMatchObject({ top: '101', railLeft: '102', railRight: '103' })
    expect(adHeadTags(c)).toContain('ezojs.com/ezoic/sa.min.js')
  })

  it('provider lạ thì tắt và cảnh báo', () => {
    const c = parseAdConfig({ VITE_AD_PROVIDER: 'mediavine' })
    expect(c.provider).toBe('none')
    expect(c.warning).toMatch(/không hợp lệ/)
  })

  it('VITE_AD_PREVIEW chỉ hiện khung giả, không chèn script', () => {
    const c = parseAdConfig({ VITE_AD_PROVIDER: 'adsense', VITE_ADSENSE_CLIENT: CLIENT, VITE_AD_PREVIEW: '1' })
    expect(c.preview).toBe(true)
    expect(adsLive(c)).toBe(false)
    expect(adHeadTags(c)).toBe('')
  })

  it('dòng ads.txt đúng định dạng của Google', () => {
    expect(adsTxtLine(CLIENT)).toBe('google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0')
  })
})
