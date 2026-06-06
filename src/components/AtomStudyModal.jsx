import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import AtomStudyPanel from './AtomStudyPanel.jsx'
import { vk } from '../utils/vkUi.js'

/**
 * Полноэкранная модалка просмотра атома «как у ученика».
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   atom: object | null,
 * }} props
 */
export default function AtomStudyModal({ open, onClose, atom }) {
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    setPlaying(false)
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, atom?.id])

  if (!open || !atom) return null

  const label = atom.name ? `Просмотр: ${atom.name}` : 'Просмотр приёма'

  return createPortal(
    <div className={vk.modalOverlay} role="presentation" onClick={onClose}>
      <div
        className="relative flex max-h-[96dvh] w-full max-w-lg flex-col overflow-hidden rounded-[12px] bg-[#f5f6f8] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-[#e7e8ec] bg-white px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-[#2c2d2e]">
              {atom.number != null ? (
                <>
                  <span className="text-[#818c99]">#{atom.number}</span> {atom.name}
                </>
              ) : (
                atom.name
              )}
            </p>
            <p className={vk.mutedXs}>Как видит ученик · карусель и книжный лист</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0f2f5] text-[#2c2d2e] active:bg-[#e7e8ec]"
            aria-label="Закрыть"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          <AtomStudyPanel
            atom={atom}
            playing={playing}
            onPlayingChange={setPlaying}
            autoPlay
            carouselClassName="h-[min(52dvh,520px)] w-full"
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
