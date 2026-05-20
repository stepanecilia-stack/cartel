import { TECH_DOMINANCE_OPTIONS } from '../utils/ksrUtils'
import { vk } from '../utils/vkUi.js'

/**
 * Компактная строка технического элемента (уровни 1–2).
 */
export default function TechnicalAtomRow({
  atom,
  levelKey,
  comment = '',
  locked = false,
  saving = false,
  canSave = true,
  videoOpen = false,
  onToggleVideo = () => {},
  onLevelChange,
  onCommentChange,
  onSave,
  showMethodDetails = false,
}) {
  return (
    <li
      id={`technical-atom-${atom.id}`}
      className={`scroll-mt-40 border-t border-[#e7e8ec] first:border-t-0 ${
        locked ? 'bg-[#fffbeb]' : 'bg-white'
      }`}
    >
      <div className="px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          <h3 className="min-w-0 flex-1 truncate text-[15px] font-medium leading-5 text-[#2c2d2e]">
            <span className="tabular-nums text-[#818c99]">#{atom.number}</span> {atom.name}
          </h3>
          {locked ? (
            <span className="shrink-0 text-[13px]" title="Закрыто до «Умение» на предыдущем" aria-label="Закрыто">
              🔒
            </span>
          ) : null}
          {atom.embedUrl ? (
            <button
              type="button"
              className={`${vk.iconBtn} shrink-0 ${videoOpen ? 'text-[#2d81e0]' : ''}`}
              title="Видео"
              aria-label="Показать или скрыть видео"
              aria-expanded={videoOpen}
              onClick={onToggleVideo}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            </button>
          ) : null}
        </div>

        {atom.embedUrl && videoOpen ? (
          <div className="mt-1.5 overflow-hidden rounded-lg bg-[#0f0f0f]">
            <div className="relative w-full pt-[56.25%] max-h-48">
              <iframe
                src={atom.embedUrl}
                title={`Видео: ${atom.name}`}
                className="absolute inset-0 h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <select
            className={`${vk.select} min-w-[6.5rem] max-w-[10rem] flex-1 disabled:opacity-50`}
            value={levelKey}
            disabled={locked}
            aria-label="Уровень освоения"
            onChange={(e) => onLevelChange(e.target.value)}
          >
            {TECH_DOMINANCE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            className={`${vk.input} min-w-0 flex-1 disabled:opacity-50`}
            placeholder="Комментарий"
            value={comment}
            disabled={locked}
            onChange={(e) => onCommentChange(e.target.value)}
          />
          <button
            type="button"
            disabled={!canSave || locked || saving}
            onClick={onSave}
            className={vk.btnCompact}
          >
            {saving ? '…' : 'Сохранить'}
          </button>
        </div>

        {locked ? <p className={`mt-1 ${vk.mutedXs}`}>Сначала «Умение» на предыдущем элементе</p> : null}

        {showMethodDetails && (atom.howTo || atom.mistakes) ? (
          <details className="mt-1">
            <summary className={`cursor-pointer list-none ${vk.link} text-[12px]`}>Подробнее</summary>
            <div className={`mt-1 space-y-0.5 ${vk.mutedXs}`}>
              {atom.howTo ? (
                <p>
                  <span className="font-medium text-[#2c2d2e]">Как:</span> {atom.howTo}
                </p>
              ) : null}
              {atom.whyHowTo ? (
                <p>
                  <span className="font-medium text-[#2c2d2e]">Зачем:</span> {atom.whyHowTo}
                </p>
              ) : null}
              {atom.mistakes ? (
                <p>
                  <span className="font-medium text-[#2c2d2e]">Ошибки:</span> {atom.mistakes}
                </p>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </li>
  )
}
