import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_ROW_HEIGHT = 76
const OVERSCAN = 4

/**
 * Простой виртуальный скролл без внешних зависимостей.
 * @param {{
 *   items: unknown[],
 *   rowHeight?: number,
 *   maxHeight?: string,
 *   className?: string,
 *   getKey: (item: unknown, index: number) => string,
 *   renderRow: (item: unknown, index: number) => React.ReactNode,
 * }} props
 */
export default function VirtualList({
  items,
  rowHeight = DEFAULT_ROW_HEIGHT,
  maxHeight = 'min(70vh, 32rem)',
  className = '',
  getKey,
  renderRow,
}) {
  const scrollRef = useRef(null)
  const [viewportH, setViewportH] = useState(320)
  const [scrollTop, setScrollTop] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight || 320))
    ro.observe(el)
    setViewportH(el.clientHeight || 320)
    return () => ro.disconnect()
  }, [])

  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (el) setScrollTop(el.scrollTop)
  }, [])

  const totalH = items.length * rowHeight
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN)
  const visibleCount = Math.ceil(viewportH / rowHeight) + OVERSCAN * 2
  const end = Math.min(items.length, start + visibleCount)
  const slice = items.slice(start, end)
  const offsetY = start * rowHeight

  if (items.length === 0) return null

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className={`overflow-y-auto rounded-[10px] border border-[#e7e8ec] bg-white ${className}`}
      style={{ maxHeight }}
    >
      <div style={{ height: totalH, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {slice.map((item, i) => {
            const index = start + i
            return (
              <div key={getKey(item, index)} style={{ minHeight: rowHeight }}>
                {renderRow(item, index)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
