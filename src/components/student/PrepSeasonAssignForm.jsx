import { memo } from 'react'
import { formatCompetitionRange, normalizeCompetitionRange } from '../../data/competitionLevels.js'
import { vk } from '../../utils/vkUi.js'

/** @typedef {'practice' | 'competition'} CoachEventKind */

const KIND_OPTIONS = [
  { id: /** @type {CoachEventKind} */ ('practice'), label: 'Боевая практика' },
  { id: 'competition', label: 'Соревнования' },
]

/**
 * @param {{
 *   dateISO: string,
 *   dateEndISO: string,
 *   onCancel: () => void,
 *   onSubmit: (payload: { title: string, kind: CoachEventKind }) => void,
 *   busy?: boolean,
 *   error?: string,
 *   disabled?: boolean,
 * }} props
 */
function PrepSeasonAssignForm({
  dateISO,
  dateEndISO,
  onCancel,
  onSubmit,
  busy = false,
  error = '',
  disabled = false,
}) {
  const range = normalizeCompetitionRange(dateISO, dateEndISO)
  const rangeLabel = formatCompetitionRange({
    dateISO: range.dateISO,
    dateEndISO: range.dateEndISO,
  })

  return (
    <form
      className="rounded-lg border border-[#2d81e0]/30 bg-[#ecf3fc] p-2.5 space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const title = String(fd.get('title') ?? '').trim()
        const kind = String(fd.get('kind') ?? 'practice')
        if (!title) return
        onSubmit({
          title,
          kind: kind === 'competition' ? 'competition' : 'practice',
        })
      }}
    >
      <p className="text-[12px] font-semibold text-[#2c2d2e]">Период · {rangeLabel}</p>

      <div>
        <label className={vk.label} htmlFor="prep-assign-title">
          Название
        </label>
        <input
          id="prep-assign-title"
          name="title"
          className={vk.input}
          placeholder="Любое название: спарринг, кубок, матч…"
          disabled={disabled || busy}
          autoFocus
          maxLength={120}
          required
        />
      </div>

      <fieldset className="space-y-1">
        <legend className={vk.label}>Категория</legend>
        <div className="flex flex-wrap gap-1.5">
          {KIND_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#e7e8ec] bg-white px-2 py-1.5 text-[12px] has-[:checked]:border-[#2d81e0] has-[:checked]:bg-[#ecf3fc]"
            >
              <input
                type="radio"
                name="kind"
                value={opt.id}
                defaultChecked={opt.id === 'practice'}
                disabled={disabled || busy}
                className="accent-[#2d81e0]"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>

      {error ? <p className="text-[12px] text-rose-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={vk.btnPrimary} disabled={disabled || busy}>
          {busy ? 'Сохранение…' : 'Добавить'}
        </button>
        <button type="button" className={vk.btnGhost} onClick={onCancel} disabled={busy}>
          Отмена
        </button>
      </div>
    </form>
  )
}

export default memo(PrepSeasonAssignForm)
