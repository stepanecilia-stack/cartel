import { TECH_DOMINANCE_OPTIONS } from '../utils/ksrUtils'
import { vk } from '../utils/vkUi.js'
import TechnicalAtomMedia from './TechnicalAtomMedia.jsx'

/**
 * Строка техники: слева название + уровень + сохранить, справа превью GIF/WebM.
 */
export default function TechnicalAtomRow({
  atom,
  levelKey,
  locked = false,
  saving = false,
  canSave = true,
  onLevelChange,
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
      <div className="flex gap-2 px-2.5 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="min-w-0 flex-1 truncate text-[15px] font-medium leading-5 text-[#2c2d2e]">
              <span className="tabular-nums text-[#818c99]">#{atom.number}</span> {atom.name}
            </h3>
            {locked ? (
              <span className="shrink-0 text-[13px]" title="Закрыто до «Умение» на предыдущем" aria-label="Закрыто">
                🔒
              </span>
            ) : null}
          </div>

          <div className="mt-1.5 flex items-center gap-1.5">
            <select
              className={`${vk.select} min-w-0 flex-1 disabled:opacity-50`}
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
            <button
              type="button"
              disabled={!canSave || locked || saving}
              onClick={onSave}
              className={vk.btnCompact}
            >
              {saving ? '…' : 'Сохранить'}
            </button>
          </div>

          {locked ? <p className={`mt-1 ${vk.mutedXs}`}>Сначала «Умение» на предыдущем</p> : null}

          {showMethodDetails && (atom.howTo || atom.mistakes) ? (
            <details className="mt-1">
              <summary className={`cursor-pointer list-none ${vk.link} text-[12px]`}>Подробнее</summary>
              <div className={`mt-0.5 space-y-0.5 ${vk.mutedXs}`}>
                {atom.howTo ? (
                  <p>
                    <span className="font-medium text-[#2c2d2e]">Как:</span> {atom.howTo}
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

        <TechnicalAtomMedia atom={atom} className="h-14 w-[4.5rem] sm:h-16 sm:w-20" />
      </div>
    </li>
  )
}
