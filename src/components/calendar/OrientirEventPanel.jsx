import { memo, useEffect, useMemo, useState } from 'react'
import { formatCompetitionRange } from '../../data/competitionLevels.js'
import { getCompetitionMeta } from '../../data/competitionLevels.js'
import { extractAgeRangeFromCohortLabel } from '../../utils/orientirDisplay.js'
import { vk } from '../../utils/vkUi.js'
import CoachEventParticipants from './CoachEventParticipants.jsx'
import SeasonDateRangeFields from './SeasonDateRangeFields.jsx'

/**
 * @param {{
 *   item: import('../../utils/plannedCompetitions.js').PlannedCompetition,
 *   students: import('../../utils/coachEventStudents.js').CoachEventStudentOption[],
 *   participantIds: string[],
 *   externalCamp: import('../../utils/orientirParticipation.js').OrientirExternalCamp | null,
 *   onClose: () => void,
 *   onSave: (payload: {
 *     participantIds: string[],
 *     externalCamp: import('../../utils/orientirParticipation.js').OrientirExternalCamp | null,
 *   }) => void | Promise<void>,
 *   busy?: boolean,
 *   canSave?: boolean,
 * }} props
 */
function OrientirEventPanel({
  item,
  students,
  participantIds,
  externalCamp,
  onClose,
  onSave,
  busy = false,
  canSave = true,
}) {
  const [draftIds, setDraftIds] = useState(participantIds)
  const [campEnabled, setCampEnabled] = useState(Boolean(externalCamp?.enabled))
  const [campTitle, setCampTitle] = useState(() => externalCamp?.title ?? '')
  const [campRange, setCampRange] = useState(() => ({
    dateISO: externalCamp?.dateISO ?? item.dateISO,
    dateEndISO: externalCamp?.dateEndISO ?? item.dateISO,
  }))

  const meta = getCompetitionMeta(item)
  const title = item.title?.trim() || meta.label
  const ageHint = item.orientirAgeLabels?.[0]
    ? extractAgeRangeFromCohortLabel(item.orientirAgeLabels[0])
    : null

  useEffect(() => {
    setDraftIds(participantIds)
    setCampEnabled(Boolean(externalCamp?.enabled))
    setCampTitle(externalCamp?.title ?? '')
    setCampRange({
      dateISO: externalCamp?.dateISO ?? item.dateISO,
      dateEndISO: externalCamp?.dateEndISO ?? item.dateISO,
    })
  }, [participantIds, externalCamp, item.id, item.dateISO])

  const draftCamp = useMemo(() => {
    if (!campEnabled) return null
    const name = campTitle.trim()
    if (!name) return null
    return {
      enabled: true,
      dateISO: campRange.dateISO,
      dateEndISO: campRange.dateEndISO,
      organizer: externalCamp?.organizer ?? 'other',
      title: name,
    }
  }, [campEnabled, campTitle, campRange, externalCamp?.organizer])

  const dirty = useMemo(() => {
    const idsA = [...draftIds].sort().join(',')
    const idsB = [...participantIds].sort().join(',')
    if (idsA !== idsB) return true
    const prev = externalCamp
    if (!prev && !draftCamp) return false
    if (!prev || !draftCamp) return true
    return (
      prev.dateISO !== draftCamp.dateISO ||
      prev.dateEndISO !== draftCamp.dateEndISO ||
      prev.title !== draftCamp.title
    )
  }, [draftIds, participantIds, externalCamp, draftCamp])

  const campSaveBlocked = campEnabled && !campTitle.trim()

  return (
    <div className="rounded-lg border-2 border-amber-400/80 bg-amber-50 p-2.5 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#2c2d2e]">{title}</p>
          <p className="text-[12px] text-[#818c99]">
            {formatCompetitionRange(item)}
            {ageHint ? ` · ${ageHint}` : ''}
          </p>
        </div>
        <button type="button" className={vk.btnGhost} onClick={onClose} disabled={busy} aria-label="Закрыть">
          ✕
        </button>
      </div>

      {canSave ? (
        <>
          <fieldset className="rounded-lg border border-violet-300/80 bg-white/90 p-2 space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-[#2c2d2e]">
              <input
                type="checkbox"
                className="accent-violet-600"
                checked={campEnabled}
                disabled={busy}
                onChange={(e) => setCampEnabled(e.target.checked)}
              />
              Сборы перед стартом
            </label>

            {campEnabled ? (
              <div className="space-y-2 border-t border-violet-100 pt-2">
                <div>
                  <label className={vk.label} htmlFor="camp-title">
                    Название
                  </label>
                  <input
                    id="camp-title"
                    className={vk.input}
                    value={campTitle}
                    placeholder="Анапа. Сборная края"
                    disabled={busy}
                    onChange={(e) => setCampTitle(e.target.value)}
                    maxLength={80}
                    required
                  />
                </div>

                <SeasonDateRangeFields
                  startISO={campRange.dateISO}
                  endISO={campRange.dateEndISO}
                  onChange={setCampRange}
                  disabled={busy}
                  idPrefix="orientir-camp-range"
                />
              </div>
            ) : null}
          </fieldset>

          <CoachEventParticipants
            students={students}
            selectedIds={draftIds}
            onChange={setDraftIds}
            disabled={busy}
          />

          <div className="flex flex-wrap gap-2 pt-0.5">
            <button
              type="button"
              className={vk.btnPrimary}
              disabled={busy || !dirty || campSaveBlocked}
              onClick={() => void onSave({ participantIds: draftIds, externalCamp: draftCamp })}
            >
              {busy ? 'Сохранение…' : 'Сохранить'}
            </button>
            <button type="button" className={vk.btnSecondary} onClick={onClose} disabled={busy}>
              Закрыть
            </button>
          </div>
        </>
      ) : (
        <p className="text-[12px] text-[#818c99]">Войдите как тренер, чтобы редактировать.</p>
      )}
    </div>
  )
}

export default memo(OrientirEventPanel)
