import { memo, useEffect, useMemo, useState } from 'react'
import { formatCompetitionRange } from '../../data/competitionLevels.js'
import { getCompetitionMeta } from '../../data/competitionLevels.js'
import {
  EXTERNAL_CAMP_ORGANIZER_STYLES,
  defaultExternalCampTitle,
  normalizeExternalCampOrganizer,
} from '../../data/externalCampKinds.js'
import { formatStartWithStatus } from '../../utils/plannedCompetitions.js'
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
  const [campOrganizer, setCampOrganizer] = useState(
    () => externalCamp?.organizer ?? 'krai',
  )
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
    setCampOrganizer(externalCamp?.organizer ?? 'krai')
    setCampTitle(externalCamp?.title ?? '')
    setCampRange({
      dateISO: externalCamp?.dateISO ?? item.dateISO,
      dateEndISO: externalCamp?.dateEndISO ?? item.dateISO,
    })
  }, [participantIds, externalCamp, item.id, item.dateISO])

  const draftCamp = useMemo(() => {
    if (!campEnabled) return null
    const organizer = normalizeExternalCampOrganizer(campOrganizer)
    return {
      enabled: true,
      dateISO: campRange.dateISO,
      dateEndISO: campRange.dateEndISO,
      organizer,
      title: defaultExternalCampTitle(organizer, campTitle),
    }
  }, [campEnabled, campOrganizer, campTitle, campRange])

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
      prev.organizer !== draftCamp.organizer ||
      prev.title !== draftCamp.title
    )
  }, [draftIds, participantIds, externalCamp, draftCamp])

  return (
    <div className="rounded-lg border-2 border-amber-400/80 bg-amber-50 p-2.5 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
            Ориентир Минспорта
          </p>
          <p className="text-[14px] font-semibold text-[#2c2d2e]">{title}</p>
          <p className="text-[12px] text-[#818c99]">
            {formatStartWithStatus(item)} · {meta.label}
            {ageHint ? ` · ${ageHint}` : ''}
          </p>
          <p className="text-[11px] text-amber-900/80">
            Старт: {formatCompetitionRange(item)}. Участники клуба и сборы (край / федерация) — отдельно от
            ваших событий.
          </p>
        </div>
        <button type="button" className={vk.btnGhost} onClick={onClose} disabled={busy} aria-label="Закрыть">
          ✕
        </button>
      </div>

      {canSave ? (
        <>
          <fieldset className="rounded-lg border border-violet-300/80 bg-white/90 p-2 space-y-2">
            <label className="flex cursor-pointer items-start gap-2 text-[13px] text-[#2c2d2e]">
              <input
                type="checkbox"
                className="mt-0.5 accent-violet-600"
                checked={campEnabled}
                disabled={busy}
                onChange={(e) => setCampEnabled(e.target.checked)}
              />
              <span>
                <span className="font-medium">Сборы перед стартом</span>
                <span className="mt-0.5 block text-[11px] text-[#818c99]">
                  Проводит край, федерация или другая организация — не клуб.
                </span>
              </span>
            </label>

            {campEnabled ? (
              <div className="space-y-2 border-t border-violet-100 pt-2">
                <div>
                  <p className={vk.label}>Кто проводит</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      /** @type {import('../../data/externalCampKinds.js').ExternalCampOrganizer[]} */ ([
                        'krai',
                        'federation',
                        'other',
                      ])
                    ).map((org) => (
                      <label
                        key={org}
                        className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-[12px] has-[:checked]:ring-2 has-[:checked]:ring-violet-400 ${EXTERNAL_CAMP_ORGANIZER_STYLES[org].chip}`}
                      >
                        <input
                          type="radio"
                          name="camp-organizer"
                          value={org}
                          checked={campOrganizer === org}
                          disabled={busy}
                          onChange={() => setCampOrganizer(org)}
                        />
                        {EXTERNAL_CAMP_ORGANIZER_STYLES[org].label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={vk.label} htmlFor="camp-title">
                    Название (необязательно)
                  </label>
                  <input
                    id="camp-title"
                    className={vk.input}
                    value={campTitle}
                    placeholder={EXTERNAL_CAMP_ORGANIZER_STYLES[campOrganizer].label}
                    disabled={busy}
                    onChange={(e) => setCampTitle(e.target.value)}
                    maxLength={80}
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
              disabled={busy || !dirty}
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
